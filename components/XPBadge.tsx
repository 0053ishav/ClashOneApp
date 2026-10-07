import { ENV } from "@/config/env";
import { Image } from "expo-image";
import { Text, View } from "react-native";

export function XPBadge({ level }: { level: number }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Image
        source={{ uri: `${ENV.CDN_BASE}/entities/other/xp.png` }}
        style={{
          width: 24,
          height: 24,
          position: "absolute",
        }}
        contentFit="contain"
      />

      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: "#fff",
          textShadowColor: "rgba(0,0,0,0.8)",
          textShadowOffset: {
            width: 0,
            height: 1,
          },
          textShadowRadius: 2,
          transform: [{ translateY: -1 }],
        }}
      >
        {level}
      </Text>
    </View>
  );
}
