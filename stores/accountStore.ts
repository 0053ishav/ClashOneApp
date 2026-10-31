import { Account, deleteAccount, getAccounts, replaceImportedVillageSnapshot } from "@/services/accountService";
import { switchAccountService } from "@/services/accountSwitchService";
import { clearActiveAccount, getActiveAccount } from "@/storage/activeAccount";
import { deleteLastJsonSync, getLastJsonSync, setLastJsonSync } from "@/storage/jsonSyncStorage";
import { deletePlayerProfile, getPlayerProfile } from "@/storage/playerProfile";
import { getWidgetPrefs, saveWidgetPrefs } from "@/storage/widgetPrefs";
import { deleteWidgetCaches } from "@/utils/widget/widgetCache";
import { PlayerProfile } from "@/types/player";
import { BuildingProgressRecord, EntityRecord, Upgrade } from "@/types/upgrade";
import type { StructureInstanceRecord } from "@/services/planner/structureInstanceService";
import { create } from "zustand";

type AccountState = {
  activeTag: string | null;
  accounts: Account[];
  profilesByTag: Record<
    string,
    PlayerProfile
  >;
  isLoadingProfile: boolean;
  isLoadingAccounts: boolean;
  widgetPrefs: {
    selectedAccountTag: string | null;
  };
  lastJsonSyncMap: Record<string, number>;
  isSyncing: boolean;

  setWidgetAccount: (tag: string) => void;
  loadLastSync: () => void;
  setLastSync: (tag: string, time: number) => void;
  clearLastSync: (tag: string) => void;
  loadAccounts: () => Promise<void>;
  loadActiveAccount: () => Promise<void>;
  switchAccount: (tag: string) => Promise<void>;
  removeAccount: (tag: string) => Promise<void>;

  setProfile: (
    tag: string,
    profile: PlayerProfile,
  ) => void;

  getProfile: (
    tag: string,
  ) => PlayerProfile | null;

  importJsonData: (
    tag: string,
    upgrades: Upgrade[],
    entities: EntityRecord[],
    buildingProgress?: BuildingProgressRecord[],
    structureInstances?: readonly StructureInstanceRecord[],
  ) => Promise<void>;
};

export const useAccountStore = create<AccountState>((set) => ({
  activeTag: null,
  accounts: [],
  profilesByTag: {},

  isLoadingProfile: false,
  isLoadingAccounts: false,

  widgetPrefs: getWidgetPrefs(),

  lastJsonSyncMap: {},
  isSyncing: false,

  setProfile: (
    tag,
    profile,
  ) => {
    set((state) => ({
      profilesByTag: {
        ...state.profilesByTag,
        [tag]: profile,
      },
    }));
  },

  getProfile: (tag: string): PlayerProfile | null => {
    const state =
      useAccountStore.getState();

    return (
      state.profilesByTag[
      tag
      ] ?? null
    );
  },

  setWidgetAccount: (tag) => {
    set((state) => {
      const exists = state.accounts.some(a => a.tag === tag);

      const updated = {
        selectedAccountTag: exists ? tag : null,
      };

      saveWidgetPrefs(updated);

      return {
        widgetPrefs: updated,
      }
    });
  },

  loadLastSync: () => {
    const tag = getActiveAccount();

    if (!tag) return;

    const time = getLastJsonSync(tag);

    if (!tag || !time) return;

    set((state) => ({
      lastJsonSyncMap: {
        ...state.lastJsonSyncMap,
        [tag]: time,
      },
    }));
  },

  setLastSync: (tag, time) => {
    set((state) => ({
      lastJsonSyncMap: {
        ...state.lastJsonSyncMap,
        [tag]: time,
      },
    }));
  },

  clearLastSync: (tag) => {
    deleteLastJsonSync(tag);
    set((state) => {
      const lastJsonSyncMap = { ...state.lastJsonSyncMap };
      delete lastJsonSyncMap[tag];
      return { lastJsonSyncMap };
    });
  },

  loadAccounts: async () => {
    set({ isLoadingAccounts: true });

    try {
      const list = await getAccounts();

      const profilesByTag:
        Record<
          string,
          PlayerProfile
        > = {};


      /**
       * OVERLOADS MEMORY
       * For loop
       * is okay for:
       * 2 accounts
       * 5 accounts
       * but bad long term.
       * Not critical now though.
       * Keep it for MVP.
       * 
       */
      for (const acc of list) {
        const profile = getPlayerProfile(acc.tag);
        if (profile?.playerTag) {
          profilesByTag[acc.tag] = profile;
        }
      }

      set((state) => {
        const exists = list.some(
          (a) => a.tag === state.widgetPrefs.selectedAccountTag
        );

        let updatedPrefs = state.widgetPrefs;

        if (!exists) {
          updatedPrefs = { selectedAccountTag: null };
          saveWidgetPrefs(updatedPrefs);
        }

        return {
          accounts: list,
          profilesByTag,
          widgetPrefs: updatedPrefs,
        };
      });
    } catch (e) {
      console.error("loadAccounts error:", e);
      throw e;
    } finally {
      set({ isLoadingAccounts: false });
    }
  },

  // 🔹 Load active account + profile
  loadActiveAccount: async () => {
    set({ isLoadingProfile: true });

    try {
      const tag = await getActiveAccount();
      const profile = tag
        ? getPlayerProfile(tag)
        : null;
      const time = tag ? getLastJsonSync(tag) : null;

      set((state) => ({
        activeTag: tag ?? null,
        profilesByTag:
          profile && tag
            ? {
              ...state.profilesByTag,
              [tag]: profile,
            }
            : state.profilesByTag,
        lastJsonSyncMap: time && tag
          ? {
            ...state.lastJsonSyncMap,
            [tag]: time,
          }
          : state.lastJsonSyncMap,
      }));

    } catch (e) {
      console.error("loadActiveAccount error:", e);
      throw e;
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  // 🔹 Switch account
  switchAccount: async (tag: string) => {
    const current = useAccountStore.getState().activeTag;
    if (!tag) return;
    if (current === tag) return;

    set({ isLoadingProfile: true });

    try {
      await switchAccountService(tag);

      const profile =
        getPlayerProfile(tag);

      const time = getLastJsonSync(tag);

      set((state) => ({
        activeTag: tag,
        profilesByTag:
          profile
            ? {
              ...state.profilesByTag,
              [tag]: profile,
            }
            : state.profilesByTag,

        lastJsonSyncMap:
          time
            ? {
              ...state.lastJsonSyncMap,
              [tag]: time,
            }
            : state.lastJsonSyncMap
      }));
    } catch (e) {
      console.error("switchAccount error:", e);
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  removeAccount: async (tag: string) => {
    if (!tag.trim()) throw new Error("INVALID_ACCOUNT_TAG");

    set({ isLoadingProfile: true });

    try {
      const activeTagBeforeRemoval =
        useAccountStore.getState().activeTag ?? getActiveAccount() ?? null;
      const removingActiveAccount = activeTagBeforeRemoval === tag;

      await deleteAccount(tag);

      // Clean account-scoped persistent state after the database delete succeeds.
      deletePlayerProfile(tag);
      deleteLastJsonSync(tag);
      deleteWidgetCaches(tag);

      const list = await getAccounts();
      const nextActiveTag = removingActiveAccount
        ? (list[0]?.tag ?? null)
        : activeTagBeforeRemoval;

      if (removingActiveAccount && nextActiveTag) {
        await switchAccountService(nextActiveTag);
      } else if (removingActiveAccount) {
        clearActiveAccount();
      }

      set((state) => {
        const updatedProfiles = { ...state.profilesByTag };
        delete updatedProfiles[tag];

        const updatedLastSyncMap = { ...state.lastJsonSyncMap };
        delete updatedLastSyncMap[tag];

        const selectedWidgetAccountRemoved =
          state.widgetPrefs.selectedAccountTag === tag;
        const updatedPrefs = selectedWidgetAccountRemoved
          ? { selectedAccountTag: null }
          : state.widgetPrefs;

        if (selectedWidgetAccountRemoved) saveWidgetPrefs(updatedPrefs);

        return {
          accounts: list,
          widgetPrefs: updatedPrefs,
          activeTag: nextActiveTag,
          profilesByTag: updatedProfiles,
          lastJsonSyncMap: updatedLastSyncMap,
        };
      });
    } catch (error) {
      console.error("deleteAccount error:", error);
      throw error;
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  importJsonData: async (tag, upgrades, entities, buildingProgress, structureInstances) => {
    set({ isSyncing: true });

    if (!tag) {
      throw new Error("importJsonData: tag is undefined");
    }

    try {
      await replaceImportedVillageSnapshot(tag, upgrades, entities, buildingProgress, structureInstances);

      const { switchAccount, loadAccounts, setLastSync } = useAccountStore.getState();
      await loadAccounts();

      await switchAccount(tag);
      const now = Date.now();
      setLastJsonSync(tag, now);
      setLastSync(tag, now);

      set((state) => ({
        lastJsonSyncMap: {
          ...state.lastJsonSyncMap,
          [tag]: now,
        },
      }));
      console.log(
        "📦 ENTITIES CREATED",
        tag,
        entities.map((e) => ({
          type: e.type,
          dataId: e.dataId,
          level: e.level,
        })),
      );
      console.log(
        "📦 Upgrades CREATED",
        tag,
        upgrades.map((e) => ({
          type: e.type,
          dataId: e.dataId,
          hasHelper: e.hasHelper,
          helperAppliedSeconds: e.helperAppliedSeconds,
        })),
      );
    } catch (e) {
      console.error("importJsonData error:", e);
      throw e;
    } finally {
      set({ isSyncing: false });
    }
  },

}));