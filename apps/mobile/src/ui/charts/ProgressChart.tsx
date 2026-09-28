import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useTheme } from '@/design/theme';
import { areaPath, monotonePath, niceTicks, roundedTopBar } from '@/ui/charts/paths';
import { Text as UiText } from '@/ui/Text';

export type Series = { key: string; values: number[]; color: string };

type ProgressChartProps = {
  kind: 'area' | 'bars';
  labels: string[];
  series: Series[];
  height?: number;
  /** Rendered over the chart for the tapped point. */
  renderTooltip?: (index: number) => React.ReactNode;
  /** Shown instead of empty axes when there is no data yet (a new player). */
  emptyLabel?: string;
};

const PAD = { top: 10, right: 10, bottom: 22, left: 34 };

/**
 * Area (monotone curve with gradient fill) or grouped bar chart, styled like the prototype's
 * Recharts charts. Charts always read left to right in time, in both languages.
 */
export function ProgressChart({
  kind,
  labels,
  series,
  height = 224,
  renderTooltip,
  emptyLabel,
}: ProgressChartProps) {
  const { color } = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const all = series.flatMap((s) => s.values);
  if (labels.length === 0 || all.length === 0) {
    return (
      <View
        style={{ height }}
        className="items-center justify-center rounded-xl border border-dashed border-border px-6"
      >
        <UiText className="text-[14px] leading-[22px] text-on-surface-variant text-center">
          {emptyLabel ?? ''}
        </UiText>
      </View>
    );
  }
  const rawMin = kind === 'bars' ? 0 : Math.min(...all);
  const rawMax = Math.max(...all, 1);
  const ticks = niceTicks(
    kind === 'area' ? Math.max(0, rawMin - (rawMax - rawMin) * 0.15) : 0,
    rawMax,
  );
  const lo = ticks[0]!;
  const hi = ticks[ticks.length - 1]!;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const n = labels.length;
  const band = n ? plotW / n : 0;
  const x = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const axis = color('border-strong');
  const grid = color('border');
  const labelColor = color('on-surface-variant');

  return (
    <View
      style={{ height, direction: 'ltr' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            {series.map((s) => (
              <LinearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.05" stopColor={s.color} stopOpacity={0.4} />
                <Stop offset="0.95" stopColor={s.color} stopOpacity={0} />
              </LinearGradient>
            ))}
          </Defs>

          {ticks.map((tick) => (
            <Line
              key={`g${tick}`}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={grid}
              strokeDasharray="3 3"
            />
          ))}
          <Line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH} stroke={axis} />
          <Line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke={axis}
          />
          {ticks.map((tick) => (
            <SvgText
              key={`t${tick}`}
              x={PAD.left - 6}
              y={y(tick) + 3}
              fontSize={10}
              fill={labelColor}
              textAnchor="end"
              fontFamily="SpaceGrotesk_500Medium"
            >
              {tick >= 1000 ? `${tick / 1000}k` : tick}
            </SvgText>
          ))}
          {labels.map((label, i) => (
            <SvgText
              key={`x${i}`}
              x={x(i)}
              y={height - 6}
              fontSize={11}
              fill={labelColor}
              textAnchor="middle"
              fontFamily="Rubik_500Medium"
            >
              {label}
            </SvgText>
          ))}

          {kind === 'area'
            ? series.map((s) => {
                const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
                return (
                  <Path
                    key={`a${s.key}`}
                    d={areaPath(pts, PAD.top + plotH)}
                    fill={`url(#fill-${s.key})`}
                  />
                );
              })
            : null}
          {kind === 'area'
            ? series.map((s) => {
                const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
                return (
                  <Path
                    key={`l${s.key}`}
                    d={monotonePath(pts)}
                    stroke={s.color}
                    strokeWidth={3}
                    fill="none"
                  />
                );
              })
            : null}
          {kind === 'area'
            ? series.map((s) =>
                s.values.map((v, i) => (
                  <Circle
                    key={`d${s.key}${i}`}
                    cx={x(i)}
                    cy={y(v)}
                    r={active === i ? 6 : 4}
                    fill={active === i ? color('primary') : color('surface')}
                    stroke={active === i ? '#ffffff' : s.color}
                    strokeWidth={2}
                  />
                )),
              )
            : null}

          {kind === 'bars'
            ? labels.map((_, i) => {
                const groupW = Math.min(band * 0.7, 28 * series.length + 4);
                const barW = (groupW - 4) / series.length;
                return series.map((s, j) => {
                  const bx = x(i) - groupW / 2 + j * (barW + 4);
                  const by = y(s.values[i] ?? 0);
                  return (
                    <Path
                      key={`b${s.key}${i}`}
                      d={roundedTopBar(bx, by, barW, PAD.top + plotH - by, 6)}
                      fill={s.color}
                      opacity={active === null || active === i ? 1 : 0.55}
                    />
                  );
                });
              })
            : null}
        </Svg>
      ) : null}

      {/* Tap targets: one column per month (the chart box is LTR, so start is the left edge). */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          start: PAD.left,
          end: PAD.right,
          flexDirection: 'row',
        }}
      >
        {labels.map((label, i) => (
          <Pressable
            key={label + i}
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => setActive((a) => (a === i ? null : i))}
          />
        ))}
      </View>

      {active !== null && renderTooltip ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 4, alignSelf: 'center' }}>
          {renderTooltip(active)}
        </View>
      ) : null}
    </View>
  );
}
