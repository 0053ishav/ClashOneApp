"use no memo";

import React from "react";
import {
  ColorProp,
  FlexWidget,
  ImageWidget,
  ListWidget,
  TextWidget,
} from "react-native-android-widget";

import { formatCountdown } from "@/utils/formatCountdown";

type Row = {
  accountTag: string;
  accountName: string;
  accountColor: string;
  entity: string;
  upgradeType: "BUILDER" | "LAB" | "PET";
  remainingMs: number;
  icon?: string | number;
};

export function UpcomingUpgradesWidget(props: {
  rows: Row[];
  updatedAt?: number;
}) {
  const visible = props.rows.slice(0, 20);

  const total = props.rows.length;

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
      {/* MAIN */}

      <FlexWidget
        style={{
          flex: 1,
          paddingVertical: 8,
          paddingHorizontal: 10,
          flexDirection: "column",
          height: "match_parent",
        }}
      >
        {/* HEADER */}

        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          {/* Logo */}

          <ImageWidget
            image={require("@/assets/images/icon.png")}
            imageWidth={40}
            imageHeight={40}
          />

          {/* Title */}

          <FlexWidget
            style={{
              flex: 1,
              marginLeft: 8,
            }}
          >
            <TextWidget
              text="Upcoming Upgrades"
              style={{
                color: "#f8fafc",
                fontSize: 18,
                fontWeight: "700",
              }}
              maxLines={1}
            />
          </FlexWidget>

          {/* Active Count */}

          <FlexWidget
            style={{
              backgroundColor: "rgba(59,130,246,0.15)" as ColorProp,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <TextWidget
              text={`${total} Active`}
              style={{
                color: "#60a5fa",
                fontSize: 10,
                fontWeight: "700",
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* TABLE HEADER */}

        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "row",
            paddingBottom: 6,
            marginBottom: 6,
            paddingLeft: 58,
            paddingRight: 8,
          }}
        >
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget
              text="Upgrade"
              style={{
                color: "#64748b",
                fontSize: 9,
                fontWeight: "700",
              }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              flex: 2,
              alignItems: "flex-end",
            }}
          >
            <TextWidget
              text="ETA"
              style={{
                color: "#64748b",
                fontSize: 9,
                fontWeight: "700",
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* ROWS */}
        {visible.length === 0 ? (
          <FlexWidget
            style={{
              height: "match_parent",
              width: "match_parent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FlexWidget
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: "rgba(34,197,94,0.12)" as ColorProp,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <ImageWidget
                image={require("@/assets/images/builder/builder-idle.png")}
                imageWidth={30}
                imageHeight={30}
              />
            </FlexWidget>

            <TextWidget
              text="No Active Upgrades"
              style={{
                color: "#f8fafc",
                fontSize: 15,
                fontWeight: "700",
              }}
            />

            <TextWidget
              text="All builders, lab and pets are free"
              style={{
                color: "#64748b",
                fontSize: 10,
              }}
            />
          </FlexWidget>
        ) : (
          <ListWidget
            style={{
              height: "match_parent",
              width: "match_parent",
            }}
          >
            {visible.map((row, index) => {
              const hours = row.remainingMs / (1000 * 60 * 60);

              let etaColor = "#22c55e";

              if (hours < 1) {
                etaColor = "#ef4444"; // red
              } else if (hours < 6) {
                etaColor = "#f59e0b"; // orange
              } else if (hours < 24) {
                etaColor = "#eab308"; // yellow
              }
              return (
                <FlexWidget
                  key={index}
                  style={{
                    width: "match_parent",
                    paddingBottom: 8,
                  }}
                >
                  <FlexWidget
                    key={index}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      width: "match_parent",
                      backgroundColor: "rgba(15,23,42,0.8)" as ColorProp,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.05)" as ColorProp,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                    }}
                  >
                    {/* LEFT SIDE */}

                    <FlexWidget
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* INDEX */}

                      <TextWidget
                        text={`#${index + 1}`}
                        style={{
                          color: row.accountColor as ColorProp,
                          marginRight: 8,
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      />

                      {/* ICON */}

                      <FlexWidget
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: row.icon
                            ? "rgba(34, 197, 94, 0.15)"
                            : "rgba(139, 92, 246, 0.15)",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 10,
                        }}
                      >
                        <ImageWidget
                          image={
                            row.icon ??
                            require("@/assets/images/builder/builder-working.png")
                          }
                          imageWidth={28}
                          imageHeight={30}
                        />
                      </FlexWidget>

                      {/* ENTITY + ACCOUNT */}

                      <FlexWidget
                        style={{
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <TextWidget
                          text={row.entity}
                          style={{
                            color: "#f1f5f9",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                          maxLines={1}
                        />
                        <FlexWidget
                          style={{
                            marginTop: 2,
                            alignItems: "flex-start",
                          }}
                        >
                          <FlexWidget
                            style={{
                              backgroundColor:
                                "rgba(59,130,246,0.15)" as ColorProp,
                              borderRadius: 999,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                            }}
                          >
                            <TextWidget
                              text={row.accountName}
                              style={{
                                color: row.accountColor as ColorProp,
                                fontSize: 8,
                                fontWeight: "700",
                              }}
                              maxLines={1}
                            />
                          </FlexWidget>
                        </FlexWidget>
                      </FlexWidget>
                    </FlexWidget>

                    {/* ETA */}

                    <FlexWidget
                      style={{
                        marginLeft: 8,
                        alignItems: "flex-end",
                        justifyContent: "center",
                      }}
                    >
                      <TextWidget
                        text={formatCountdown(row.remainingMs)}
                        style={{
                          color: etaColor as ColorProp,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      />
                    </FlexWidget>
                  </FlexWidget>
                </FlexWidget>
              );
            })}
          </ListWidget>
        )}
        {/* FOOTER */}

        {total > visible.length && (
          <FlexWidget
            style={{
              width: "match_parent",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <TextWidget
              text={`+${total - visible.length} more upgrades`}
              style={{
                color: "#64748b",
                fontSize: 8,
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
