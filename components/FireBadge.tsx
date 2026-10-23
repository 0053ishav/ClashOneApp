import { memo } from "react";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

interface FireBadgeProps {
  level: number;
  width?: number;
}

const FLAME =
  "M16 1 C17 7 25 10 27 18 C29 26 24 35 16 36 C8 35 3 27 5 19 C6 15 10 13 11 8 C13 10 13.5 12 13.5 14 C15.5 11 16.5 6 16 1 Z";

function FireBadge({ level, width = 32 }: FireBadgeProps) {
  const height = (width * 38) / 32;
  const fontSize = level > 99 ? 10 : 13;

  return (
    <Svg width={width} height={height} viewBox="0 0 32 38">
      <Defs>
        <LinearGradient id="fbOuter" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F97316" />
          <Stop offset="1" stopColor="#C2410C" />
        </LinearGradient>
        <LinearGradient id="fbMid" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FDE047" />
          <Stop offset="1" stopColor="#F59E0B" />
        </LinearGradient>
        <LinearGradient id="fbInner" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFBE0" />
          <Stop offset="1" stopColor="#FDC262" />
        </LinearGradient>
      </Defs>

      <Path
        d={FLAME}
        fill="url(#fbOuter)"
        stroke="#7C2D12"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />

      <G transform="translate(16 35) scale(0.8) translate(-16 -35)">
        <Path d={FLAME} fill="url(#fbMid)" />
      </G>

      <G transform="translate(16 35) scale(0.55) translate(-16 -35)">
        <Path d={FLAME} fill="url(#fbInner)" />
      </G>

      <SvgText
        x={16}
        y={28}
        fontSize={fontSize}
        fontWeight="900"
        textAnchor="middle"
        stroke="#431407"
        strokeWidth={2.6}
        strokeLinejoin="round"
        fill="#431407"
      >
        {level}
      </SvgText>
      <SvgText
        x={16}
        y={28}
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
