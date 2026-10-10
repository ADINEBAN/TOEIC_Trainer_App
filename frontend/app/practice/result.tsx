import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { ProgressBar } from '@/src/components/ui/Progress';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { QuestionCard } from '@/src/components/practice/QuestionCard';
import { practiceService } from '@/src/services/practice.service';
import { colors, spacing } from '@/src/theme';
import type { TestResult } from '@/src/types';

export default function TestResultScreen() {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!testId) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await practiceService.testResult(testId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được kết quả.');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Đang chấm bài…" />
      </Screen>
    );
  }

  if (error || !result) {
    return (
      <Screen>
        <ErrorState message={error ?? 'Không có kết quả.'} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <GlassCard style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Tổng điểm</Text>
        <Text style={styles.scoreValue}>{result.totalScore}</Text>
        <Text style={styles.scoreMax}>/990</Text>
        <View style={styles.split}>
          <View style={styles.splitCol}>
            <Text style={styles.splitValue}>{result.listeningScore}</Text>
            <Text style={styles.splitLabel}>Listening /495</Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.splitValue}>{result.readingScore}</Text>
            <Text style={styles.splitLabel}>Reading /495</Text>
          </View>
        </View>
        <Text style={styles.accuracy}>
          Đúng {result.correctCount}/{result.totalCount} câu
        </Text>
      </GlassCard>

      <SectionTitle title="Phân tích theo Part" />
      <GlassCard>
        {result.perPart.map((p) => (
          <View key={p.part} style={styles.partRow}>
            <Text style={styles.partName}>Part {p.part}</Text>
            <ProgressBar value={p.total ? p.correct / p.total : 0} style={styles.partBar} />
            <Text style={styles.partScore}>
              {p.correct}/{p.total}
            </Text>
          </View>
        ))}
      </GlassCard>

      {result.mistakes.length > 0 ? (
        <View>
          <SectionTitle title={`Câu sai cần ôn (${result.mistakes.length})`} />
          {result.mistakes.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              selected={null}
              onSelect={() => undefined}
              showAnswer
              locked
            />
          ))}
        </View>
      ) : (
        <GlassCard>
          <Text style={styles.perfect}>🎉 Hoàn hảo! Không sai câu nào.</Text>
        </GlassCard>
      )}

      <GlassButton title="Về trang luyện tập" variant="outline" onPress={() => router.replace('/(tabs)/practice')} style={styles.cta} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreCard: { alignItems: 'center', marginTop: spacing.md },
  scoreLabel: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
  scoreValue: { fontSize: 56, fontWeight: '800', color: colors.primary, marginTop: 4 },
  scoreMax: { fontSize: 16, color: colors.inkMuted },
  split: { flexDirection: 'row', gap: 24, marginTop: spacing.md },
  splitCol: { alignItems: 'center' },
  splitValue: { fontSize: 24, fontWeight: '800', color: colors.ink },
  splitLabel: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  accuracy: { fontSize: 13, color: colors.inkSoft, marginTop: spacing.sm },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  partName: { fontSize: 14, fontWeight: '700', color: colors.ink, width: 56 },
  partBar: { flex: 1 },
  partScore: { fontSize: 13, color: colors.inkSoft, width: 56, textAlign: 'right', fontWeight: '600' },
  perfect: { fontSize: 15, color: colors.ink, textAlign: 'center' },
  cta: { marginTop: spacing.md, marginBottom: spacing.lg },
});
