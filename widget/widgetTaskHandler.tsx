import { getAccounts } from "@/services/accountService";
import { hydrateEntities } from "@/services/cdnEntities";
import { getActiveAccount } from "@/storage/activeAccount";
import { getWidgetPrefs } from "@/storage/widgetPrefs";
import { renderBuilderWidget } from "@/utils/widget/renderBuilderWidget";
import { renderMultiWidget } from "@/utils/widget/renderMultiWidget";
import { getWidgetCache } from "@/utils/widget/widgetCache";
import { isWidgetCacheStale } from "@/utils/widget/widgetFreshness";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { BuilderStatusWidget } from "./BuilderStatusWidget";
import { LabStatusWidget } from "./LabStatusWidget";
import { PetStatusWidget } from "./PetStatusWidget";

async function resolveTag() {
  const accounts = await getAccounts();

  const activeTag = getActiveAccount();

  const widgetPrefs = getWidgetPrefs();

  const selected = widgetPrefs.selectedAccountTag;

  if (accounts.some((a) => a.tag === selected)) {
    return selected;
  }

  if (accounts.some((a) => a.tag === activeTag)) {
    return activeTag;
  }

  return accounts[0]?.tag;
}

function getWidgetType(widgetName?: string): "builder" | "lab" | "pet" | null {
  switch (widgetName) {
    case "BuilderStatusWidget":
      return "builder";

    case "LabWidget":
      return "lab";

    case "PetWidget":
      return "pet";

    default:
      return null;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    await hydrateEntities();
    if (
      props.widgetAction !== "WIDGET_ADDED" &&
      props.widgetAction !== "WIDGET_UPDATE"
    ) {
      return;
    }

    const widgetName = props.widgetInfo?.widgetName;

    if (widgetName === "UpcomingUpgradesWidget") {
      const { renderUpcomingUpgradesWidget } =
        await import("@/utils/widget/renderUpcomingUpgradesWidget");

      const { getUpcomingWidgetCache } =
        await import("@/utils/widget/widgetCache");

      const cached = getUpcomingWidgetCache();

      if (cached && !isWidgetCacheStale(cached, "upcoming")) {
        const { UpcomingUpgradesWidget } =
          await import("@/widget/UpcomingUpgradesWidget");

        props.renderWidget(<UpcomingUpgradesWidget rows={cached.rows} />);

        renderUpcomingUpgradesWidget().then(props.renderWidget);

        return;
      }

      props.renderWidget(await renderUpcomingUpgradesWidget());

      return;
    }

    if (widgetName === "MultiAccountWidget") {
      props.renderWidget(await renderMultiWidget());
      return;
    }

    const type = getWidgetType(widgetName);

    if (!type) {
      console.log("Unknown widget type:", widgetName);
      return;
    }

    const tag = await resolveTag();

    // No account configured
    if (!tag) {
      if (type === "builder") {
        props.renderWidget(await renderBuilderWidget());
      }

      if (type === "lab") {
        const { renderLabWidget } =
          await import("@/utils/widget/renderLabWidget");

        props.renderWidget(await renderLabWidget());
      }

      if (type === "pet") {
        const { renderPetWidget } =
          await import("@/utils/widget/renderPetWidget");

        props.renderWidget(await renderPetWidget());
      }

      return;
    }

    const cached = getWidgetCache(tag, type);

    // Render cache immediately
    if (cached && !isWidgetCacheStale(cached, type)) {
      if (type === "builder") {
        props.renderWidget(<BuilderStatusWidget {...cached} />);

        renderBuilderWidget().then(props.renderWidget);

        return;
      }

      if (type === "lab") {
        const { renderLabWidget } =
          await import("@/utils/widget/renderLabWidget");

        props.renderWidget(<LabStatusWidget {...cached} />);

        renderLabWidget().then(props.renderWidget);

        return;
      }

      if (type === "pet") {
        const { renderPetWidget } =
          await import("@/utils/widget/renderPetWidget");

        props.renderWidget(<PetStatusWidget {...cached} />);

        renderPetWidget().then(props.renderWidget);

        return;
      }
    }

    // Fresh render
    if (type === "builder") {
      props.renderWidget(await renderBuilderWidget());
      return;
    }

    if (type === "lab") {
      const { renderLabWidget } =
        await import("@/utils/widget/renderLabWidget");

      props.renderWidget(await renderLabWidget());
      return;
    }

    if (type === "pet") {
      const { renderPetWidget } =
        await import("@/utils/widget/renderPetWidget");

      props.renderWidget(await renderPetWidget());
    }
  } catch (err) {
    console.log("Widget handler error:", err);
  }
}
