import { storage } from "@/storage/mmkv";
import { Vote } from "@/types/vote";
import { STORAGE_KEYS } from "./keys";

type VoteMap = Record<string, Vote>;

/**
 * Get all votes
 */
const getVoteMap = (): VoteMap => {
  const raw = storage.getString(STORAGE_KEYS.FEATURE_VOTES);

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Save all votes
 */
const setVoteMap = (map: VoteMap) => {
  storage.set(STORAGE_KEYS.FEATURE_VOTES, JSON.stringify(map));
};

/**
 * Get vote for specific feature
 */
export const getFeatureVote = (featureId: string): Vote | null => {
  const map = getVoteMap();
  return map[featureId] ?? null;
};

/**
 * Set vote for specific feature
 */
export const setFeatureVote = (
  featureId: string,
  vote: Vote,
) => {
  const map = getVoteMap();
  map[featureId] = vote;
  setVoteMap(map);
};

/**
 * Clear vote for specific feature
 */
export const clearFeatureVote = (featureId: string) => {
  const map = getVoteMap();
  delete map[featureId];
  setVoteMap(map);
};