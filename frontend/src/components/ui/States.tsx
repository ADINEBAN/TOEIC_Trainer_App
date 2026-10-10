import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { colors, spacing } from '@/src/theme';

export function LoadingState({ message = 'Đang tải…' }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.hint}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.inkMuted} />
      <Text style={styles.title}>Có lỗi xảy ra</Text>
      <Text style={styles.hint}>{message}</Text>
      {onRetry ? <GlassButton title="Thử lại" onPress={onRetry} variant="outline" style={styles.retry} /> : null}
    </View>
  );
}

export function EmptyState({ icon = 'search-outline', message }: { icon?: string; message: string }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={44} color={colors.inkMuted} />
      <Text style={styles.hint}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: spacing.sm },
  hint: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xs },
  retry: { marginTop: spacing.md, minWidth: 140 },
});
