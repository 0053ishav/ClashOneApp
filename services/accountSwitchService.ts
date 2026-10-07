import { getAccountByTag } from "@/services/accountService";

import { setActiveAccount } from "@/storage/activeAccount";

import {
    getPlayerProfile,
    savePlayerProfile,
} from "@/storage/playerProfile";

export async function switchAccountService(
  tag: string,
) {
  setActiveAccount(tag);

  const account =
    await getAccountByTag(
      tag,
    );

  if (!account) return;

  // ✅ per-account profile
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