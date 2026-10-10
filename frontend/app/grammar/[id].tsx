import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { QuestionCard } from '@/src/components/practice/QuestionCard';
import { practiceService } from '@/src/services/practice.service';
import { colors, spacing } from '@/src/theme';
import type { GrammarDetail } from '@/src/types';

export default function GrammarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<GrammarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await practiceService.grammarDetail(id);
      setLesson(detail);
      setAnswers(Object.fromEntries(detail.quiz.map((q) => [q.id, null])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được bài học.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const submitQuiz = async () => {
    if (!lesson || !id) return;
    setSubmitting(true);
    try {
      const payload = lesson.quiz.map((q) => ({ questionId: q.id, selected: answers[q.id] ?? null }));
      const res = await practiceService.submitGrammarQuiz(id, payload);
      setScore(res);
      setChecked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nộp quiz thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Đang tải bài học…" />
      </Screen>
    );
  }

  if (error && !lesson) {
    return (
      <Screen>
        <ErrorState message={error ?? 'Không có dữ liệu.'} onRetry={load} />
      </Screen>
    );
  }

  if (!lesson) return null;

  return (
    <Screen>
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.summary}>{lesson.summary}</Text>

      <GlassCard>
        {lesson.content.split('\n').map((line, i) =>
          line.trim() ? (
            <Text key={i} style={styles.paragraph}>
              {line}
            </Text>
          ) : null
        )}
      </GlassCard>

      <SectionTitle title={`Quiz nhanh (${lesson.quiz.length} câu)`} />
      {!showQuiz ? (
        <GlassButton title="Bắt đầu quiz" onPress={() => setShowQuiz(true)} style={styles.cta} />
      ) : (
        <View>
          {lesson.quiz.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              selected={answers[q.id] ?? null}
              onSelect={(opt) => !checked && setAnswers((a) => ({ ...a, [q.id]: opt }))}
              showAnswer={checked}
              locked={checked}
            />
          ))}
          {score ? (
            <GlassCard style={styles.scoreCard}>
              <Text style={styles.score}>
                {score.score}/{score.total}
              </Text>
              <Text style={styles.scoreText}>
                {score.score === score.total ? 'Xuất sắc! 🎉' : 'Xem lại giải thích các câu sai nhé.'}
              </Text>
            </GlassCard>
          ) : (
            <GlassButton
              title="Nộp quiz"
              onPress={submitQuiz}
              loading={submitting}
              disabled={Object.values(answers).some((a) => a === null || a === undefined)}
              style={styles.cta}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  summary: { fontSize: 14, color: colors.inkSoft, marginTop: 4, marginBottom: spacing.md, lineHeight: 20 },
  paragraph: { fontSize: 14, color: colors.ink, lineHeight: 22, marginBottom: 8 },
  cta: { marginTop: spacing.sm, marginBottom: spacing.lg },
  scoreCard: { alignItems: 'center' },
  score: { fontSize: 36, fontWeight: '800', color: colors.teal },
  scoreText: { fontSize: 14, color: colors.inkSoft, marginTop: 4 },
});
