import * as Sentry from "@sentry/react-native";
import * as ExpoInAppUpdates from "expo-in-app-updates";
import { useEffect, useState } from "react";

import { track } from "@/utils/analytics/analytics";

export function useInAppUpdates(enabled = true) {
    const [updateModalVisible, setUpdateModalVisible] = useState(false);

    const [storeVersion, setStoreVersion] = useState<string | null>(null);

    useEffect(() => {
        if (__DEV__ || process.env.EXPO_PUBLIC_ENV === "development") {
            return;
        }
            if (!enabled) return;

        const checkUpdates = async () => {
            try {
                track("update_check_started");

                const result = await ExpoInAppUpdates.checkForUpdate();

                track("update_check_completed", {
                    updateAvailable: result.updateAvailable,
                    storeVersion: result.storeVersion,
                });

                if (!result.updateAvailable) return;

                setStoreVersion(result.storeVersion ?? null);

                track("update_available", {
                    storeVersion: result.storeVersion,
                });

                setUpdateModalVisible(true);
            } catch (error) {
                track("update_check_failed");

                Sentry.captureException(error);
            }
        };

        const startUnsubscribe = ExpoInAppUpdates.addUpdateListener(
            "updateStart",
            () => {
                track("update_started");
            },
        );

        const downloadedUnsubscribe = ExpoInAppUpdates.addUpdateListener(
            "updateDownloaded",
            () => {
                track("update_downloaded");
            },
        );

        const cancelledUnsubscribe = ExpoInAppUpdates.addUpdateListener(
            "updateCancelled",
            () => {
                track("update_cancelled");
            },
        );

        const completedUnsubscribe = ExpoInAppUpdates.addUpdateListener(
            "updateCompleted",
            () => {
                track("update_completed");
            },
        );

        checkUpdates();

        return () => {
            startUnsubscribe();
            downloadedUnsubscribe();
            cancelledUnsubscribe();
            completedUnsubscribe();
        };
    }, [enabled]);

    const startUpdate = async () => {
        try {
            track("update_start_requested");

            await ExpoInAppUpdates.startUpdate();
        } catch (error) {
            track("update_start_failed");

            Sentry.captureException(error);
        }
    };

    return {
        updateModalVisible,
        setUpdateModalVisible,
        storeVersion,
        startUpdate,
    };
}