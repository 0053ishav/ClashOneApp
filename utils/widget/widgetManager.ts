import { renderBuilderWidget } from "@/utils/widget/renderBuilderWidget";
import { subscribeWidgetUpdate } from "@/utils/widget/widgetEvents";
import { requestWidgetUpdate } from "react-native-android-widget";
import { prefillAllWidgetCache } from "./prefillAllWidgetCache";
import { renderLabWidget } from "./renderLabWidget";
import { renderMultiWidget } from "./renderMultiWidget";
import { renderPetWidget } from "./renderPetWidget";
import { renderUpcomingUpgradesWidget } from "./renderUpcomingUpgradesWidget";

let timeout: ReturnType<typeof setTimeout> | null = null;

async function updateWidget() {
  try {

    await prefillAllWidgetCache();

    await requestWidgetUpdate({
      widgetName: "BuilderStatusWidget",
      renderWidget: async () => {
        return await renderBuilderWidget()
      },
    });
    await requestWidgetUpdate({
      widgetName: "MultiAccountWidget",
      renderWidget: async () => {
        return await renderMultiWidget()
      },
    });
    await requestWidgetUpdate({
      widgetName: "LabWidget",
      renderWidget: async () => {
        return await renderLabWidget();
      },
    });
    await requestWidgetUpdate({
      widgetName: "PetWidget",
      renderWidget: async () => {
        return await renderPetWidget();
      },
    });
    await requestWidgetUpdate({
      widgetName: "UpcomingUpgradesWidget",
      renderWidget: async () => {
        return await renderUpcomingUpgradesWidget(); 
      },
    });
  } catch (e) {
    console.log("Widget update failed:", e);
  }
}

function scheduleUpdate() {
  if (timeout) {
    clearTimeout(timeout);
  };

  timeout = setTimeout(() => {
    updateWidget();
    timeout = null;
  }, 400);
}


export function initWidgetManager() {
  subscribeWidgetUpdate(() => {
    scheduleUpdate();
  });
}