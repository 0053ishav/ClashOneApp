import { getAccountByTag } from "@/services/accountService";

import { setActiveAccount } from "@/storage/activeAccount";

import {
    getPlayerProfile,
    savePlayerProfile,
} from "@/storage/playerProfile";

export async function switchAccountService(
  tag: string,
) {
  if (!tag.trim()) throw new Error("INVALID_ACCOUNT_TAG");

  // Validate the target before persisting it as active; otherwise a missing tag
  // can leave storage and the Zustand account state pointing at a nonexistent account.
  const account = await getAccountByTag(tag);
  if (!account) throw new Error("ACCOUNT_NOT_FOUND");

  setActiveAccount(tag);

  // Per-account profile
  const existing =
    getPlayerProfile(tag);

  // create minimal profile if missing
  const profile = {
    ...(existing ?? {}),
    playerTag:
      account.tag,
    playerName:
      account.name,
    townHallLevel:
      account.townhall,
  };

  // ✅ save ONLY this account profile
  savePlayerProfile(
    tag,
    profile,
  );
}