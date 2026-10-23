import { memo } from "react";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

interface FireBadgeProps {
  level: number;
  width?: number;
}

const FLAME =
  "M16 3 C17 7 22 10 22 15 C22 20 19 23 16 23 C12 23 9 20 10 16 C10 13 13 11 13 8 C15 10 15 12 15 13 C17 10 17 7 16 3 Z";

function FireBadge({ level, width = 22 }: FireBadgeProps) {
  const height = width;
  const fontSize = level > 99 ? 8 : 10;

  return (
    <Svg width={width} height={height} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="fbFrame" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FCF779" />
          <Stop offset="0.48" stopColor="#FDD572" />
          <Stop offset="1" stopColor="#E0BF70" />
        </LinearGradient>
        <LinearGradient id="fbFlame" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FCF779" />
          <Stop offset="0.52" stopColor="#FDD572" />
          <Stop offset="1" stopColor="#F7BD5D" />
        </LinearGradient>
      </Defs>

      <Rect
        x={1}
        y={1}
        width={30}
        height={30}
        rx={4}
        fill="url(#fbFrame)"
        stroke="#8A6A35"
        strokeWidth={1.5}
      />
      <Rect
        x={4}
        y={4}
        width={24}
        height={24}
        rx={2}
        fill="#172033"
        stroke="#F7BD5D"
        strokeWidth={1}
      />
      <Path d={FLAME} fill="url(#fbFlame)" opacity={0.95} />
      <SvgText
        x={16}
        y={21}
        fontSize={fontSize}
        fontWeight="900"
        textAnchor="middle"
        stroke="#5B4729"
        strokeWidth={2.4}
        strokeLinejoin="round"
        fill="#5B4729"
      >
        {level}
      </SvgText>
      <SvgText
        x={16}
        y={21}
        fontSize={fontSize}
        fontWeight="900"
        textAnchor="middle"
        fill="#FFFFFF"
      >
        {level}
      </SvgText>
    </Svg>
  );
}

export default memo(FireBadge);
