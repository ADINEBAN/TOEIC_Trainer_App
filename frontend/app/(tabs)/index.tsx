import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle, StatTile } from '@/src/components/ui/Section';
import { ProgressBar, ScoreRing } from '@/src/components/ui/Progress';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { useAuth } from '@/src/context/AuthContext';
import { authService } from '@/src/services/auth.service';
import { colors, spacing } from '@/src/theme';
import type { DashboardStats } from '@/src/types';

const AI_SHORTCUTS: { href: string; icon: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [
  { href: '/(ai)/semantic', icon: 'share-social', label: 'Mạng từ', color: colors.primary },
  { href: '/(ai)/camera', icon: 'camera', label: 'Chụp ảnh', color: colors.teal },
  { href: '/(ai)/docs', icon: 'document-text', label: 'Nạp tài liệu', color: '#8B5CF6' },
  { href: '/(ai)/speaking', icon: 'mic', label: 'Luyện nói', color: colors.orange },
  { href: '/(ai)/handsfree', icon: 'headset', label: 'Rảnh tay', color: '#EC4899' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await authService.dashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Đang tải bảng điều khiển…" />
      </Screen>
    );
  }

  if (error || !stats) {
    return (
      <Screen>
        <ErrorState message={error ?? 'Không có dữ liệu.'} onRetry={load} />
      </Screen>
    );
  }

  const dailyRatio = stats.dailyGoalMinutes > 0 ? stats.dailyDoneMinutes / stats.dailyGoalMinutes : 0;

  return (
    <Screen>
      <Text style={styles.greeting}>Xin chào, {user?.name ?? 'bạn'} 👋</Text>
      <Text style={styles.sub}>Hôm nay học tới đâu rồi?</Text>

      <GlassCard style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <ScoreRing value={stats.estimatedScore} label="/990" sub="Điểm ước lượng" />
          <View style={styles.milestone}>
            <Text style={styles.milestoneLabel}>Chặng tiếp theo</Text>
            <Text style={styles.milestoneTitle}>{stats.nextMilestone.title}</Text>
            <Text style={styles.milestoneDesc}>{stats.nextMilestone.description}</Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.tiles}>
        <StatTile icon="flame" label="Streak" value={`${stats.streakDays} ngày`} color={colors.orange} />
        <StatTile icon="star" label="XP" value={stats.xp} color={colors.primary} />
        <StatTile icon="trophy" label="Cấp độ" value={stats.level} color={colors.teal} />
      </View>

      <GlassCard>
        <Text style={styles.cardTitle}>Tiến độ hôm nay</Text>
        <Text style={styles.dailyText}>
          {stats.dailyDoneMinutes}/{stats.dailyGoalMinutes} phút
        </Text>
        <ProgressBar value={dailyRatio} />
      </GlassCard>

      <SectionTitle title="Học nhanh" />
      <View style={styles.shortcuts}>
        {AI_SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href as never} asChild>
            <Pressable style={styles.shortcut}>
              <View style={[styles.shortcutIcon, { backgroundColor: `${s.color}1A` }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={styles.shortcutLabel}>{s.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <SectionTitle title="Luyện tập" />
      <GlassCard>
        <Pressable style={styles.row} onPress={() => router.push('/practice/test-setup' as never)}>
          <Ionicons name="timer-outline" size={22} color={colors.primary} />
          <Text style={styles.rowLabel}>Làm bài thi thử (Mini / Half / Full)</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/(tabs)/practice')}>
          <Ionicons name="list-outline" size={22} color={colors.teal} />
          <Text style={styles.rowLabel}>Luyện theo từng Part 1–7</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/(tabs)/flashcards')}>
          <Ionicons name="layers-outline" size={22} color={colors.orange} />
          <Text style={styles.rowLabel}>Ôn flashcard hôm nay</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Pressable>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  sub: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md },
  scoreCard: { alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  milestone: { flex: 1 },
  milestoneLabel: { fontSize: 11, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase' },
  milestoneTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 4 },
  milestoneDesc: { fontSize: 13, color: colors.inkSoft, marginTop: 4, lineHeight: 19 },
  tiles: { flexDirection: 'row', marginHorizontal: -4, marginTop: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  dailyText: { fontSize: 13, color: colors.inkSoft, marginBottom: 8 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shortcut: {
    width: '18%',
    minWidth: 62,
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    paddingVertical: 10,
  },
  shortcutIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 10, color: colors.inkSoft, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
});
