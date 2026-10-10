import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { practiceService } from '@/src/services/practice.service';
import { colors, spacing } from '@/src/theme';
import type { Question } from '@/src/types';

const PARTS = [
  { part: 1, name: 'Part 1', desc: 'Mô tả tranh', icon: 'image-outline' },
  { part: 2, name: 'Part 2', desc: 'Hỏi – đáp', icon: 'chatbubble-outline' },
  { part: 3, name: 'Part 3', desc: 'Hội thoại', icon: 'people-outline' },
  { part: 4, name: 'Part 4', desc: 'Bài nói', icon: 'megaphone-outline' },
  { part: 5, name: 'Part 5', desc: 'Hoàn thành câu', icon: 'text-outline' },
  { part: 6, name: 'Part 6', desc: 'Hoàn thành đoạn', icon: 'document-outline' },
  { part: 7, name: 'Part 7', desc: 'Đọc hiểu', icon: 'book-outline' },
] as const;

export default function PracticeScreen() {
  const [mistakes, setMistakes] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMistakes(await practiceService.mistakes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được sổ lỗi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Text style={styles.title}>Luyện tập</Text>

      <SectionTitle title="Thi thử" />
      <GlassCard>
        <Pressable style={styles.row} onPress={() => router.push('/practice/test-setup' as never)}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="timer" size={22} color={colors.primary} />
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.rowLabel}>Mini / Half / Full</Text>
            <Text style={styles.rowDesc}>Đồng hồ, lưới câu hỏi, gắn cờ — chấm /990</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Pressable>
      </GlassCard>

      <SectionTitle title="Luyện theo Part" />
      <View style={styles.grid}>
        {PARTS.map((p) => (
          <Pressable
            key={p.part}
            style={styles.partCard}
            onPress={() => router.push(`/practice/run?part=${p.part}` as never)}
          >
            <Ionicons name={p.icon as keyof typeof Ionicons.glyphMap} size={26} color={colors.primary} />
            <Text style={styles.partName}>{p.name}</Text>
            <Text style={styles.partDesc}>{p.desc}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.partCard} onPress={() => router.push('/grammar' as never)}>
          <Ionicons name="school-outline" size={26} color={colors.teal} />
          <Text style={styles.partName}>Ngữ pháp</Text>
          <Text style={styles.partDesc}>Bài học + quiz</Text>
        </Pressable>
      </View>

      <SectionTitle
        title="Sổ lỗi cần ôn"
        action={
          mistakes && mistakes.length > 0 ? (
            <Pressable onPress={() => router.push('/practice/run?mode=mistakes' as never)}>
              <Text style={styles.link}>Ôn ngay</Text>
            </Pressable>
          ) : undefined
        }
      />
      {loading ? (
        <LoadingState message="Đang tải sổ lỗi…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : mistakes && mistakes.length > 0 ? (
        <GlassCard>
          <Text style={styles.mistakeCount}>
            Bạn có <Text style={styles.mistakeStrong}>{mistakes.length} câu sai</Text> cần ôn lại
          </Text>
          <Text style={styles.mistakeHint}>Chạm “Ôn ngay” để làm lại các câu đã sai kèm giải thích.</Text>
        </GlassCard>
      ) : (
        <GlassCard>
          <Text style={styles.mistakeHint}>Chưa có câu sai nào. Làm bài để hệ thống ghi lại nhé!</Text>
        </GlassCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  rowDesc: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  partCard: {
    width: '31%',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    padding: spacing.sm,
    alignItems: 'center',
  },
  partName: { fontSize: 14, fontWeight: '800', color: colors.ink, marginTop: 8 },
  partDesc: { fontSize: 10, color: colors.inkMuted, marginTop: 2, textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  mistakeCount: { fontSize: 15, color: colors.ink },
  mistakeStrong: { fontWeight: '800', color: colors.danger },
  mistakeHint: { fontSize: 13, color: colors.inkSoft, marginTop: 6, lineHeight: 19 },
});
