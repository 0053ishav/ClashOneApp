"use no memo";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import React from "react";
import {
  ColorProp,
  FlexWidget,
  ImageWidget,
  TextWidget,
} from "react-native-android-widget";

export function PetStatusWidget(props: {
  title: string;
  subtitle: string;
  icon?: string | number;
  progress: number;
  showProgress: boolean;
  levelText?: string;
  suggestion?: string;
  color?: string;
  accountInitials?: string;
  updatedAt?: number;
}) {
  const isIdle = props.subtitle === "Idle";

  const clamped = Math.max(0, Math.min(props.progress ?? 0, 1));
  // const progressWidth = Math.floor(90 * clamped);

  const accentColor = (props.color ?? "#ec4899") as any;

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
      {/* LEFT BORDER */}
      <FlexWidget
        style={{
          width: 4,
          height: "match_parent",
          backgroundColor: accentColor,
          borderRadius: 16,
        }}
      />

      {/* MAIN */}
      <FlexWidget
        style={{
          flex: 1,
          paddingVertical: 8,
          paddingHorizontal: 12,
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        {/* TOP */}
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
              backgroundColor: isIdle
                ? "rgba(34, 197, 94, 0.15)"
                : (`${accentColor}20` as ColorProp),
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <ImageWidget
              image={
                props.icon
                  ? props.icon
                  : isIdle
                    ? require("@/assets/images/builder/builder-idle.png")
                    : require("@/assets/images/builder/builder-working.png")
              }
              imageWidth={24}
              imageHeight={24}
            />
          </FlexWidget>

          {/* TEXT */}
          <FlexWidget style={{ flex: 1 }}>
            <FlexWidget style={{ flexDirection: "row", marginBottom: 2 }}>
              {props.accountInitials && (
                <FlexWidget
                  style={{
                    backgroundColor: "rgba(139, 92, 246, 0.2)",
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
                  />
                </FlexWidget>
              )}

              <TextWidget
                text={props.title}
                style={{
                  color: "#f1f5f9",
                  fontSize: 13,
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
                  color: isIdle ? "#22c55e" : "#ec4899",
                  fontSize: 13,
                  fontWeight: "700",
                }}
                maxLines={1}
              />
              <TextWidget
                text={
                  props.updatedAt
                    ? formatTimeAgo(props.updatedAt) + " ago"
                    : " ⚠ "
                }
                style={{
                  color: "#475569",
                  fontSize: 8,
                }}
              />
            </FlexWidget>
            {!isIdle && props.levelText && (
              <FlexWidget
                style={{
                  backgroundColor: "rgba(14, 165, 233, 0.2)",
                  borderRadius: 5,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
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
                />
              </FlexWidget>
            )}

            {!isIdle && props.showProgress && (
              <FlexWidget
                style={{
                  width: "match_parent",
                  height: 6,
                  backgroundColor: "rgba(148,163,184,0.2)" as ColorProp,
                  borderRadius: 3,
                  marginTop: 3,
                  overflow: "hidden",
                }}
              >
                <FlexWidget
                  style={{
                    // width: progressWidth,
                    flex: clamped,

                    height: "match_parent",
                    backgroundColor: "#ec4899",
                  }}
                />
              </FlexWidget>
            )}
          </FlexWidget>
        </FlexWidget>

        {/* BOTTOM */}
        <FlexWidget style={{ width: "match_parent", alignItems: "flex-end" }}>
          {props.suggestion && (
            <FlexWidget
              style={{
                height: 24,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(139, 92, 246, 0.12)",
                borderRadius: 6,
                paddingHorizontal: 8,
                marginBottom: 2,
              }}
            >
              <TextWidget
                text={"💡 " + props.suggestion}
                style={{
                  color: "#a78bfa",
                  fontSize: 10,
                  fontWeight: "700",
                }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
