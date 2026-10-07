import * as Sentry from "@sentry/react-native";

export async function fetchPlayerFromApi(playerTag: string) {
  console.log("📡 Fetching player from API:", playerTag);

  if (!playerTag) {
    throw new Error("INVALID_TAG");
  }

  const encodedTag = encodeURIComponent(playerTag);

  console.log("🔐 Encoded tag:", encodedTag);

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/player/${encodedTag}`,
    {
      headers: {
        "x-app-key": process.env.EXPO_PUBLIC_APP_SECRET || "",
      },
    }
  );

  console.log("📡 API status:", res.status);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED")
    }

    if (res.status === 404) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    if (res.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (res.status === 504) {
      throw new Error("UPSTREAM_TIMEOUT");
    }

    throw new Error("API_FETCH_FAILED");
  }

  const result = await res.json();
  console.log("✅ API data received:", result.source);

  return result.data;
}

export async function fetchFullPlayer(
  playerTag: string
) {
  const encodedTag = encodeURIComponent(playerTag);

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/player/${encodedTag}`,
    {
      headers: {
        "x-app-key": process.env.EXPO_PUBLIC_APP_SECRET ?? "",
      },
    }
  );

  if (!res.ok) {
      Sentry.captureException(res);

    throw new Error("API_FETCH_FAILED");
  }

  const result = await res.json();
  return result.data;
}