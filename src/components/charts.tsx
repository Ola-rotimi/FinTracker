import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { AppText } from './ui';

export function DonutChart({
  data,
  size = 180,
  thickness = 22,
  children,
}: {
  data: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
}) {
  const t = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);
  const gap = data.length > 1 ? 2 : 0;

  const lengths = data.map((d) => (total > 0 ? (d.value / total) * circumference : 0));
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((s, l) => s + l, 0));
  const arcs = data.map((d, i) => (
    <Circle
      key={i}
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke={d.color}
      strokeWidth={thickness}
      fill="none"
      strokeDasharray={`${Math.max(0, lengths[i] - gap)} ${circumference}`}
      strokeDashoffset={-starts[i]}
    />
  ));

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={t.track} strokeWidth={thickness} fill="none" />
          {arcs}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/** Grouped vertical bars. Each series contributes one bar per label. */
export function BarChart({
  labels,
  series,
  height = 160,
  formatValue,
}: {
  labels: string[];
  series: { color: string; values: number[] }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const groupWidth = labels.length ? width / labels.length : 0;
  const barGap = 3;
  const barWidth = Math.max(2, Math.min(18, (groupWidth * 0.7 - barGap * (series.length - 1)) / series.length));
  const clusterWidth = barWidth * series.length + barGap * (series.length - 1);

  return (
    <View style={{ gap: 6 }}>
      {formatValue && <AppText variant="caption">{formatValue(max)}</AppText>}
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={0.5} y2={0.5} stroke={t.border} strokeDasharray="4 4" />
            <Line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={t.border} />
            {labels.map((_, i) =>
              series.map((s, j) => {
                const h = (s.values[i] / max) * (height - 4);
                const x = i * groupWidth + (groupWidth - clusterWidth) / 2 + j * (barWidth + barGap);
                return <Rect key={`${i}-${j}`} x={x} y={height - h} width={barWidth} height={h} rx={Math.min(4, barWidth / 2)} fill={s.color} />;
              }),
            )}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {labels.map((l, i) => (
          <AppText key={i} variant="caption" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {l}
          </AppText>
        ))}
      </View>
    </View>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: it.color }]} />
          <AppText variant="caption">{it.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
