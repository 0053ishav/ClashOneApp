import {
  getGoblinRemoteConfig,
  initRemoteConfig,
  refreshRemoteConfig,
} from "@/services/remoteConfig/remoteConfigService";

import React, { createContext, useContext, useEffect, useState } from "react";

import { AppState } from "react-native";

const RemoteConfigContext = createContext<{
  config: ReturnType<typeof getGoblinRemoteConfig>;
}>({
  config: getGoblinRemoteConfig(),
});

export function RemoteConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState(getGoblinRemoteConfig());

  /**
   * Initial remote config load.
   *
   * The service loads local cache first,
   * then decides whether a network
   * refresh is required.
   */
  useEffect(() => {
    const boot = async () => {
      await initRemoteConfig();

      setConfig(getGoblinRemoteConfig());
    };

    void boot();
  }, []);

  /**
   * Periodic refresh opportunity.
   *
   * IMPORTANT:
   *
   * This does NOT mean we fetch every
   * 10 minutes.
   *
   * refreshRemoteConfig() decides whether
   * a real network request is due.
   *
   * The service handles:
   *
   * - event boundaries
   * - 6 hour safety refresh
   * - 429 retry delay
   * - cached config
   */
  useEffect(() => {
    const interval = setInterval(
      async () => {
        await refreshRemoteConfig();

        setConfig(getGoblinRemoteConfig());
      },
      10 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, []);

  /**
   * Refresh opportunity whenever the
   * Android app comes back to foreground.
   *
   * This is important because Android
   * may suspend background JS timers.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state !== "active") {
        return;
      }

      await refreshRemoteConfig();

      setConfig(getGoblinRemoteConfig());
    });

    return () => subscription.remove();
  }, []);

  return (
    <RemoteConfigContext.Provider value={{ config }}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

export function useRemoteConfig() {
  return useContext(RemoteConfigContext);
}
