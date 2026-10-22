import * as Sentry from "@sentry/react-native";
import type { PlayerFull } from "@/types/playerFull";
import { parsePlayerResponse } from "@/services/playerApiSchema";

const PLAYER_ENDPOINT = "/player/";

function getPlayerTag(playerTag: string): string {
  const normalizedTag = playerTag.trim();
  if (!normalizedTag) {
    throw new Error("INVALID_TAG");
  }
  return normalizedTag;
}

function getPlayerApiError(status: number): Error {
  if (status === 401 || status === 403) return new Error("UNAUTHORIZED");
  if (status === 404) return new Error("PLAYER_NOT_FOUND");
  if (status === 429) return new Error("RATE_LIMITED");
  if (status === 504) return new Error("UPSTREAM_TIMEOUT");
  return new Error("API_FETCH_FAILED");
}

async function fetchPlayerData(playerTag: string): Promise<PlayerFull> {
  const normalizedTag = getPlayerTag(playerTag);
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

  if (!backendUrl) {
    throw new Error("BACKEND_NOT_CONFIGURED");
  }

  const encodedTag = encodeURIComponent(normalizedTag);
  let response: Response;

  try {
    response = await fetch(`${backendUrl.replace(/\/$/, "")}${PLAYER_ENDPOINT}${encodedTag}`, {
      headers: {
        // EXPO_PUBLIC_* values are embedded in the app. This header is a public
        // client identifier only and must never be treated as a secret.
        "x-app-key":
          process.env.EXPO_PUBLIC_APP_KEY ||
          process.env.EXPO_PUBLIC_APP_SECRET ||
          "",
      },
    });
  } catch {
    Sentry.captureException(new Error("PLAYER_API_NETWORK_ERROR"));
    throw new Error("API_FETCH_FAILED");
  }

  if (!response.ok) {
    const error = getPlayerApiError(response.status);
    if (response.status >= 500 && response.status !== 504) {
      Sentry.captureException(new Error(`PLAYER_API_HTTP_${response.status}`));
    }
    throw error;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    Sentry.captureException(new Error("PLAYER_API_INVALID_JSON"));
    throw new Error("INVALID_API_RESPONSE");
  }

  try {
    return parsePlayerResponse(payload);
  } catch {
    Sentry.captureException(new Error("PLAYER_API_SCHEMA_VALIDATION_FAILED"));
    throw new Error("INVALID_API_RESPONSE");
  }
}

/**
 * Fetches and validates a player response for village JSON imports.
 * The backend response is runtime data and must not be trusted by type assertion.
 */
export async function fetchPlayerFromApi(playerTag: string): Promise<PlayerFull> {
  return fetchPlayerData(playerTag);
}

/**
 * Fetches and validates the full player response used by profile screens.
 */
export async function fetchFullPlayer(playerTag: string): Promise<PlayerFull> {
  return fetchPlayerData(playerTag);
}
