"use no memo";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import React from "react";
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
} from "react-native-android-widget";

export function BuilderStatusWidget(props: {
  title: string;
  subtitle: string;
  icon?: string | number;
  progress: number;
  showProgress: boolean;
  isFree?: boolean;
  levelText?: string;
  builderCountText?: string;
  nextUpgradeText?: string;
  color?: string;
  accountInitials?: string;
  updatedAt?: number;
  cachedAt?: number;
}) {
  const isFree = props.subtitle === "All builders free";

  const clamped = Math.max(0, Math.min(props.progress ?? 0, 1));
  // const progressWidth = Math.floor(90 * clamped);

  const accentColor = (props.color ?? "#fbbf24") as any;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#0f172a",
        borderRadius: 16,
        flexDirection: "row",
      }}
    >
      {/* LEFT ACCENT BORDER */}
      <FlexWidget
        style={{
          width: 4,
          height: "match_parent",
          backgroundColor: accentColor,
          borderRadius: 16,
        }}
      />

      {/* MAIN CONTENT */}
      <FlexWidget
        style={{
          flex: 1,
          paddingVertical: 4,
          paddingHorizontal: 8,
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        {/* TOP SECTION */}
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 6,
            width: "match_parent",
          }}
        >
          {/* ICON */}
          <FlexWidget
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isFree
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(251, 191, 36, 0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <ImageWidget
              image={
                props.icon
                  ? props.icon
                  : isFree
                    ? require("@/assets/images/builder/builder-idle.png")
                    : require("@/assets/images/builder/builder-working.png")
              }
              imageWidth={24}
              imageHeight={24}
            />
          </FlexWidget>

          {/* TITLE + SUBTITLE + LEVEL + PROGRESS */}
          <FlexWidget
            style={{
              flex: 1,
              flexDirection: "column",
              width: "match_parent",
              justifyContent: "center",
            }}
          >
            {/* Initials badge + title */}
            <FlexWidget
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              {props.accountInitials && (
                <FlexWidget
                  style={{
                    backgroundColor: "rgba(251, 191, 36, 0.2)",
                    borderRadius: 4,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    marginRight: 6,
                  }}
                >
                  <TextWidget
                    text={props.accountInitials}
                    style={{
                      color: accentColor,
                      fontSize: 9,
                      fontWeight: "700",
                    }}
                    maxLines={1}
                  />
                </FlexWidget>
              )}
              <TextWidget
                text={props.title}
                style={{
                  color: "#f1f5f9",
                  fontSize: 12,
                  fontWeight: "700",
                }}
                maxLines={1}
              />
            </FlexWidget>

            <FlexWidget
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                width: "match_parent",
              }}
            >
              <TextWidget
                text={props.subtitle}
                style={{
                  color: isFree ? "#22c55e" : "#fbbf24",
                  fontSize: 11,
                  fontWeight: "700",
                }}
                maxLines={1}
              />

              {/* UPDATED AT */}
              {/* <FlexWidget
                style={{
                  width: "match_parent",
                  alignItems: "flex-end",
                }}
              > */}
              <TextWidget
                text={
                  props.updatedAt
                    ? formatTimeAgo(props.updatedAt) + " ago"
                    : " ⚠ "
                }
                style={{
                  color: "#64748b",
                  fontSize: 8,
                  fontWeight: "500",
                }}
                maxLines={1}
              />
              {/* </FlexWidget> */}
            </FlexWidget>
            {!isFree && props.levelText && (
              <FlexWidget
                style={{
                  backgroundColor: "rgba(14, 165, 233, 0.2)",
                  borderRadius: 5,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  alignItems: "flex-start",
                  marginTop: 3,
                }}
              >
                <TextWidget
                  text={props.levelText}
                  style={{
                    color: "#0ea5e9",
                    fontSize: 9,
                    fontWeight: "600",
                  }}
                  maxLines={1}
                />
              </FlexWidget>
            )}

            {!isFree && props.showProgress && (
              <FlexWidget
                style={{
                  flexDirection: "row",
                  width: "match_parent",
                  height: 6,
                  backgroundColor: "rgba(148, 163, 184, 0.2)",
                  borderRadius: 3,
                  marginTop: 3,
                }}
              >
                <FlexWidget
                  style={{
                    flex: clamped,
                    height: "match_parent",
                    backgroundColor: "#fbbf24",
                  }}
                />
                <FlexWidget
                  style={{
                    flex: 1 - clamped,
                    height: "match_parent",
                  }}
                />
              </FlexWidget>
            )}
          </FlexWidget>
        </FlexWidget>

        {/* BOTTOM SECTION */}
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "column",
          }}
        >
          <FlexWidget
            style={{
              width: "match_parent",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <FlexWidget
              style={{
                flex: 1,
                height: 24,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isFree
                  ? "rgba(34, 197, 94, 0.12)"
                  : "rgba(59, 130, 246, 0.12)",
                borderRadius: 6,
                marginRight: !isFree ? 8 : 0,
                paddingHorizontal: 8,
              }}
            >
              <TextWidget
                text={
                  props.builderCountText ??
                  (isFree ? "🟢 All Free" : "🔨 Builders Busy")
                }
                style={{
                  color: isFree ? "#22c55e" : "#60a5fa",
                  fontSize: 10,
                  fontWeight: "700",
                }}
                maxLines={1}
              />
            </FlexWidget>

            {!isFree && (
              <FlexWidget
                style={{
                  flex: 1,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(251, 191, 36, 0.12)",
                  borderRadius: 6,
                  paddingHorizontal: 8,
                }}
              >
                <TextWidget
                  text={
                    props.nextUpgradeText ? "⏱ " + props.nextUpgradeText : " ⚠ "
                  }
                  style={{
                    color: "#fbbf24",
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                  maxLines={1}
                />
              </FlexWidget>
            )}
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
