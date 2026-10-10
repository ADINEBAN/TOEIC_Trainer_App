import { StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors, radius } from '@/src/theme';

export function ProgressBar({
  value, // 0..1
  color = colors.primary,
  style,
  height = 10,
}: {
  value: number;
  color?: string;
  style?: ViewStyle;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height }, style]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ScoreRing({ value, label, sub }: { value: number; label: string; sub?: string }) {
  // Simple donut rendered without SVG: filled circle + inner cutout + label.
  return (
    <View style={styles.ringOuter}>
      <View style={styles.ringInner}>
        <Text style={styles.ringValue}>{value}</Text>
        <Text style={styles.ringLabel}>{label}</Text>
        {sub ? <Text style={styles.ringSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(18,50,79,0.10)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  ringOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { fontSize: 28, fontWeight: '800', color: colors.primary },
  ringLabel: { fontSize: 11, color: colors.inkMuted },
  ringSub: { fontSize: 10, color: colors.inkMuted },
});
