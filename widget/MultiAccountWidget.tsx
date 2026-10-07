"use no memo";

import { MultiWidgetItem } from "@/types/widgetTypes";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import React from "react";
import {
  ColorProp,
  FlexWidget,
  ImageWidget,
  TextWidget,
} from "react-native-android-widget";

type Props = {
  accounts: MultiWidgetItem[];
  totalAccounts?: number;
  error?: boolean;
  isPremium?: boolean;
};

// ---------- URGENCY ----------
function getUrgency(data: MultiWidgetItem["data"]) {
  if (data.subtitle === "All builders free") return "free";
  const ms = data.remainingMs ?? 0;
  if (ms < 60 * 60 * 1000) return "critical";
  if (ms < 4 * 60 * 60 * 1000) return "high";
  return "low";
}

function getColor(u: ReturnType<typeof getUrgency>) {
  switch (u) {
    case "free":
      return "#22c55e";
    case "critical":
      return "#ef4444";
    case "high":
      return "#fbbf24";
    default:
      return "#94a3b8";
  }
}

// ---------- FALLBACK SCREENS ----------

function renderNoAccounts(): React.ReactNode {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: "clashone://add-account?source=widget" }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#0f172a",
        borderRadius: 16,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <FlexWidget
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "rgba(251, 191, 36, 0.12)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <ImageWidget
          image={require("@/assets/images/builder/builder-idle.png")}
          imageWidth={28}
          imageHeight={28}
        />
      </FlexWidget>

      <TextWidget
        text="No Accounts"
        style={{
          color: "#f1f5f9",
          fontSize: 13,
          fontWeight: "700",
        }}
        maxLines={1}
      />

      <TextWidget
        text="Open app to add accounts"
        style={{
          color: "#475569",
          fontSize: 10,
          fontWeight: "500",
          marginTop: 4,
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}

function renderNoCache(totalAccounts: number): React.ReactNode {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#0f172a",
        borderRadius: 16,
        flexDirection: "row",
      }}
    >
      {/* LEFT ACCENT — amber like BuilderStatusWidget default */}
      <FlexWidget
        style={{
          width: 4,
          height: "match_parent",
          backgroundColor: "#fbbf24",
          borderRadius: 16,
        }}
      />

      <FlexWidget
        style={{
          flex: 1,
          paddingVertical: 8,
          paddingHorizontal: 12,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* TOP */}
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 6,
          }}
        >
          <FlexWidget
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              backgroundColor: "rgba(251, 191, 36, 0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <ImageWidget
              image={require("@/assets/images/builder/builder-working.png")}
              imageWidth={32}
              imageHeight={32}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <TextWidget
              text="Builders"
              style={{
                color: "#f1f5f9",
                fontSize: 13,
                fontWeight: "700",
                marginBottom: 2,
              }}
              maxLines={1}
            />
            <TextWidget
              text="Tap to sync data"
              style={{
                color: "#fbbf24",
                fontSize: 12,
                fontWeight: "700",
              }}
              maxLines={1}
            />
            <FlexWidget
              style={{
                backgroundColor: "rgba(251, 191, 36, 0.15)",
                borderRadius: 5,
                paddingHorizontal: 6,
                paddingVertical: 2,
                alignItems: "flex-start",
                marginTop: 4,
              }}
            >
              <TextWidget
                text={`${totalAccounts} account${totalAccounts !== 1 ? "s" : ""} connected`}
                style={{
                  color: "#fbbf24",
                  fontSize: 9,
                  fontWeight: "600",
                }}
                maxLines={1}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>

        {/* BOTTOM */}
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "column",
          }}
        >
          <FlexWidget
            style={{
              width: "match_parent",
              height: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(251, 191, 36, 0.12)",
              borderRadius: 6,
            }}
          >
            <TextWidget
              text="Open app to load builder data"
              style={{
                color: "#fbbf24",
                fontSize: 10,
                fontWeight: "700",
              }}
              maxLines={1}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              width: "match_parent",
              alignItems: "flex-end",
              marginTop: 4,
            }}
          >
            <TextWidget
              text="⚠ No data cached"
              style={{
                color: "#475569",
                fontSize: 8,
                fontWeight: "500",
              }}
              maxLines={1}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

function renderError(): React.ReactNode {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#0f172a",
        borderRadius: 16,
        flexDirection: "row",
      }}
    >
      {/* LEFT ACCENT — red for error */}
      <FlexWidget
        style={{
          width: 4,
          height: "match_parent",
          backgroundColor: "#ef4444",
          borderRadius: 16,
        }}
      />

      <FlexWidget
        style={{
          flex: 1,
          paddingVertical: 8,
          paddingHorizontal: 12,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <FlexWidget
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <ImageWidget
              image={require("@/assets/images/builder/builder-idle.png")}
              imageWidth={32}
              imageHeight={32}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <TextWidget
              text="Widget Error"
              style={{
                color: "#f1f5f9",
                fontSize: 13,
                fontWeight: "700",
                marginBottom: 2,
              }}
              maxLines={1}
            />
            <TextWidget
              text="Something went wrong"
              style={{
                color: "#ef4444",
                fontSize: 12,
                fontWeight: "700",
              }}
              maxLines={1}
            />
          </FlexWidget>
        </FlexWidget>

        <FlexWidget
          style={{
            width: "match_parent",
            height: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            borderRadius: 6,
          }}
        >
          <TextWidget
            text="Open app to fix"
            style={{
              color: "#ef4444",
              fontSize: 10,
              fontWeight: "700",
            }}
            maxLines={1}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

function renderUpsellCard(totalAccounts?: number): React.ReactNode {
  const hidden = Math.max(0, (totalAccounts ?? 3) - 2);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: "clashone://pro?source=widget&upsell=true" }}
      style={{
        width: "match_parent",
        height: "match_parent",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(251,191,36,0.2)" as ColorProp,
        justifyContent: "center",
        alignItems: "center",
        padding: 4,
      }}
    >
      {/* ICON */}
      <TextWidget
        text="🔒"
        style={{
          fontSize: 12,
        }}
      />

      {/* MAIN TEXT */}
      <TextWidget
        text={`+${hidden} hidden`}
        style={{
          color: "#fbbf24",
          fontSize: 9,
          fontWeight: "600",
          marginTop: 2,
        }}
        maxLines={1}
      />

      {/* SUBTEXT */}
      <TextWidget
        text="Unlock Pro"
        style={{
          color: "#94a3b8",
          fontSize: 9,
          marginTop: 1,
        }}
        maxLines={1}
      />

      {/* CTA STRIP */}
      <FlexWidget
        style={{
          marginTop: 4,
          backgroundColor: "rgba(251,191,36,0.15)" as ColorProp,
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
      >
        <TextWidget
          text="view"
          style={{
            color: "#fbbf24",
            fontSize: 7,
            fontWeight: "500",
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function renderAddAccountCard(totalAccounts?: number): React.ReactNode {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: "clashone://add-account?source=widget" }}
      style={{
        width: "match_parent",
        height: "match_parent",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(251,191,36,0.2)" as ColorProp,
        justifyContent: "center",
        alignItems: "center",
        padding: 4,
      }}
    >
      {/* <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(251,191,36,0.2)" as ColorProp,
        justifyContent: "center",
        alignItems: "center",
        padding: 4,
      }}
    > */}
      <TextWidget
        text="+"
        style={{
          color: "#fbbf24",
          fontSize: 16,
          fontWeight: "700",
        }}
      />

      <TextWidget
        text="Add 2nd Account"
        style={{
          color: "#fbbf24",
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
        }}
        maxLines={1}
      />

      <TextWidget
        text="Track multiple accounts"
        style={{
          color: "#94a3b8",
          fontSize: 8,
          marginTop: 1,
        }}
        maxLines={1}
      />

      <FlexWidget
        style={{
          marginTop: 4,
          backgroundColor: "rgba(251,191,36,0.15)" as ColorProp,
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
      >
        <TextWidget
          text="open"
          style={{
            color: "#fbbf24",
            fontSize: 7,
            fontWeight: "600",
          }}
        />
      </FlexWidget>
      {/* </FlexWidget> */}
    </FlexWidget>
  );
}

// ---------- CARD ----------
function renderCard(item: MultiWidgetItem): React.ReactNode {
  const { tag, data } = item;

  const urgency = getUrgency(data);
  const urgencyColor = getColor(urgency) as any;
  const accentColor = (data.color ?? "#fbbf24") as any;

  const clamped = Math.max(0, Math.min(data.progress ?? 0, 1));
  const BAR_MAX_WIDTH = 100;
  const progressWidth = Math.floor(BAR_MAX_WIDTH * 0.8 * clamped);

  const icon = data.icon;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      key={tag}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#0f172a",
        borderRadius: 12,
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      {/* LEFT ACCENT BAR — account color, mirrors BuilderStatusWidget */}
      <FlexWidget
        style={{
          width: 4,
          height: "match_parent",
          backgroundColor: accentColor,
          borderRadius: 4,
        }}
      />

      {/* MAIN CONTENT — mirrors BuilderStatusWidget main content column */}
      <FlexWidget
        style={{
          flex: 1,
          paddingVertical: 6,
          paddingHorizontal: 6,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* TOP: icon + initials + title + level */}
        <FlexWidget
          style={{
            // flexDirection: "row",
            // alignItems: "flex-start",
            marginBottom: 2,
            width: "match_parent",
            height: 52, // 🔥 FIXED TOP HEIGHT
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          {/* ICON — mirrors BuilderStatusWidget icon container */}
          <FlexWidget
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              marginRight: 4,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                urgency === "free"
                  ? "rgba(34, 197, 94, 0.15)"
                  : "rgba(251, 191, 36, 0.15)",
            }}
          >
            <ImageWidget
              image={
                icon
                  ? icon
                  : urgency === "free"
                    ? require("@/assets/images/builder/builder-idle.png")
                    : require("@/assets/images/builder/builder-working.png")
              }
              imageWidth={28}
              imageHeight={28}
            />
          </FlexWidget>

          {/* TITLE COLUMN */}
          <FlexWidget
            style={{
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {/* Initials badge + title — mirrors BuilderStatusWidget initials row */}
            <FlexWidget
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <FlexWidget
                style={{
                  backgroundColor: "rgba(251, 191, 36, 0.2)",
                  borderRadius: 4,
                  paddingHorizontal: 3,
                  paddingVertical: 1,
                  marginRight: 3,
                }}
              >
                <TextWidget
                  text={data.accountInitials ?? "??"}
                  style={{
                    color: accentColor,
                    fontSize: 8,
                    fontWeight: "700",
                  }}
                  maxLines={1}
                />
              </FlexWidget>

              <TextWidget
                text={data.title}
                style={{
                  color: "#f1f5f9",
                  fontSize: 10,
                  fontWeight: "600",
                }}
                maxLines={1}
              />
            </FlexWidget>

            {/* Subtitle — mirrors BuilderStatusWidget subtitle */}
            <TextWidget
              text={urgency === "free" ? "All free" : (data.subtitle ?? "—")}
              style={{
                color: urgency === "free" ? "#22c55e" : "#fbbf24",
                fontSize: 8,
                fontWeight: "600",
              }}
              maxLines={1}
            />

            {/* Level badge — mirrors BuilderStatusWidget level badge */}
            {urgency !== "free" && data.levelText ? (
              <FlexWidget
                style={{
                  backgroundColor: "rgba(14, 165, 233, 0.2)",
                  borderRadius: 4,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  marginTop: 2,
                  alignItems: "flex-start",
                }}
              >
                <TextWidget
                  text={data.levelText}
                  style={{
                    color: "#0ea5e9",
                    fontSize: 7,
                    fontWeight: "600",
                  }}
                  maxLines={1}
                />
              </FlexWidget>
            ) : (
              <FlexWidget style={{ height: 14, marginTop: 2 }} />
            )}

            {/* Progress bar — mirrors BuilderStatusWidget progress */}
            {urgency !== "free" ? (
              <FlexWidget
                style={{
                  width: "match_parent",
                  height: 3,
                  backgroundColor: "rgba(148, 163, 184, 0.2)",
                  borderRadius: 3,
                  marginTop: 2,
                  flexDirection: "row",
                  overflow: "hidden",
                }}
              >
                <FlexWidget
                  style={{
                    width: progressWidth,
                    height: "match_parent",
                    backgroundColor: urgencyColor,
                  }}
                />
              </FlexWidget>
            ) : (
              // 🔥 placeholder to maintain height
              <FlexWidget
                style={{ width: "match_parent", height: 4, marginTop: 4 }}
              />
            )}
          </FlexWidget>
        </FlexWidget>

        {/* BOTTOM: builder count + next upgrade pills
            mirrors BuilderStatusWidget bottom pill row */}
        <FlexWidget
          style={{
            // width: "match_parent",
            // flexDirection: "column",
            marginTop: 2,
            width: "match_parent",
            height: 40, // 🔥 FIXED BOTTOM HEIGHT
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <FlexWidget
            style={{
              width: "match_parent",
              flexDirection: "column",
            }}
          >
            {/* 🔥 PRIMARY: NEXT UPGRADE FULL WIDTH */}
            {urgency !== "free" ? (
              <FlexWidget
                style={{
                  width: "match_parent",
                  height: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(251, 191, 36, 0.12)",
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <TextWidget
                  text={
                    data.nextUpgradeText ? "⏱ " + data.nextUpgradeText : "—"
                  }
                  style={{
                    color: "#fbbf24",
                    fontSize: 10, // 🔥 slightly bigger = priority
                    fontWeight: "700",
                  }}
                  maxLines={1}
                />
              </FlexWidget>
            ) : (
              <FlexWidget
                style={{
                  width: "match_parent",
                  height: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(34, 197, 94, 0.12)",
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <TextWidget
                  text="🟢 All Free"
                  style={{
                    color: "#22c55e",
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                  maxLines={1}
                />
              </FlexWidget>
            )}

            {/* 🔽 SECONDARY ROW */}
            <FlexWidget
              style={{
                width: "match_parent",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* builder count SMALL */}
              <TextWidget
                text={
                  data.builderCountText ??
                  (urgency === "free" ? "🟢 Free" : "🔨 Busy")
                }
                style={{
                  color: urgency === "free" ? "#22c55e" : "#60a5fa",
                  fontSize: 8, // 🔥 reduced importance
                  fontWeight: "600",
                }}
                maxLines={1}
              />

              {/* updated text */}
              <TextWidget
                text={
                  data.updatedAt
                    ? "↻ " + formatTimeAgo(data.updatedAt)
                    : "⚠ No data"
                }
                style={{
                  color: "#475569",
                  fontSize: 8,
                  fontWeight: "500",
                }}
                maxLines={1}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

// ---------- MAIN ----------
export function MultiAccountWidget({
  accounts,
  totalAccounts,
  error,
  isPremium,
}: Props) {
  if (error) return renderError();

  // No accounts added at all
  if (!totalAccounts || totalAccounts === 0) return renderNoAccounts();

  // Accounts exist but no cached data yet
  if (accounts.length === 0) return renderNoCache(totalAccounts);
  const total = totalAccounts ?? 0;

  let visibleCount = 0;

  if (isPremium) {
    visibleCount = Math.min(3, accounts.length);
  } else {
    visibleCount = total >= 3 ? 2 : Math.min(2, accounts.length);
  }

  const visibleAccounts = accounts.slice(0, visibleCount);

  const shouldShowUpsell = !isPremium && total >= 3;

  const shouldShowAddAccount = total === 1;

  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "row",

        borderRadius: 16,
        padding: 4,
        backgroundColor: "#0f172a",
      }}
    >
      {visibleAccounts.map((acc) => (
        <FlexWidget
          key={acc.tag}
          style={{
            flex: 1,
            marginRight: 4,
          }}
        >
          {renderCard(acc)}
        </FlexWidget>
      ))}

      {shouldShowUpsell && (
        <FlexWidget
          style={{
            flex: 1,
            height: "match_parent",
          }}
        >
          {renderUpsellCard(totalAccounts)}
        </FlexWidget>
      )}

      {shouldShowAddAccount && (
        <FlexWidget
          style={{
            flex: 1,
            height: "match_parent",
          }}
        >
          {renderAddAccountCard(totalAccounts)}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
