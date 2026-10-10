import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { ErrorState, LoadingState, EmptyState } from '@/src/components/ui/States';
import { practiceService } from '@/src/services/practice.service';
import { colors, spacing } from '@/src/theme';
import type { GrammarLesson } from '@/src/types';

export default function GrammarListScreen() {
  const [lessons, setLessons] = useState<GrammarLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLessons(await practiceService.grammarLessons());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được bài ngữ pháp.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Text style={styles.title}>Ngữ pháp</Text>
      <SectionTitle title="Chủ đề" />
      {loading ? (
        <LoadingState message="Đang tải bài học…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : lessons.length === 0 ? (
        <EmptyState message="Chưa có bài ngữ pháp nào." />
      ) : (
        lessons.map((lesson) => (
          <Pressable key={lesson.id} onPress={() => router.push(`/grammar/${lesson.id}` as never)}>
            <GlassCard>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="school" size={22} color={colors.teal} />
                </View>
                <View style={styles.main}>
                  <Text style={styles.name}>{lesson.title}</Text>
                  <Text style={styles.summary} numberOfLines={2}>
                    {lesson.summary}
                  </Text>
                  {lesson.level ? <Text style={styles.level}>{lesson.level}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
              </View>
            </GlassCard>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink },
  summary: { fontSize: 13, color: colors.inkSoft, marginTop: 2, lineHeight: 19 },
  level: { fontSize: 11, color: colors.teal, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
});
