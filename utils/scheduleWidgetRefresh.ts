import { getAccountState } from "@/services/accountStateService";
import { useAccountStore } from "@/stores/accountStore";
import { renderBuilderWidget } from "@/utils/widget/renderBuilderWidget";
import { requestWidgetUpdate } from "react-native-android-widget";

let refreshInterval: ReturnType<typeof setInterval> | null = null;

function getRefreshInterval(remainingMs: number): number {
  const oneMinute = 60 * 1000;
  const oneHour = 60 * oneMinute;


  if (remainingMs >= 6 * oneHour) return 30 * oneMinute;
  if (remainingMs >= 1 * oneHour) return 15 * oneMinute;
  if (remainingMs >= 10 * oneMinute) return 5 * oneMinute;
  return 1 * oneMinute;
}

export function startSmartWidgetScheduler() {
  stopSmartWidgetScheduler();

  refreshInterval = setInterval(async () => {

    const {activeTag } = useAccountStore.getState();

    if (!activeTag) return;
    const state = await getAccountState(activeTag);
    const active = state.activeUpgrades;

    if (!active.length) {
      stopSmartWidgetScheduler();
      return;
    }

    const nextEndTime = Math.min(...active.map((u) => u.endTime));
    const remainingMs = Math.max(nextEndTime - Date.now(), 0);

    requestWidgetUpdate({
      widgetName: "BuilderStatusWidget",
      renderWidget: renderBuilderWidget,
    });

    // adjust interval dynamically
    const newInterval = getRefreshInterval(remainingMs);

    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
      startSmartWidgetScheduler();
    }, newInterval);
  }, 60 * 1000); // initial bootstrap interval
}

export function stopSmartWidgetScheduler() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}
