import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { Chip } from '@/src/components/ui/Chip';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { QuestionCard } from '@/src/components/practice/QuestionCard';
import { ProgressBar } from '@/src/components/ui/Progress';
import { useAuth } from '@/src/context/AuthContext';
import { authService } from '@/src/services/auth.service';
import { practiceService } from '@/src/services/practice.service';
import { vocabService } from '@/src/services/vocab.service';
import { colors, spacing } from '@/src/theme';
import type { PlacementResult, Question } from '@/src/types';

const GOALS = [450, 600, 750, 900];
const MINUTES = [15, 30, 45, 60];
const DAYS = [
  { key: 1, label: 'T2' },
  { key: 2, label: 'T3' },
  { key: 3, label: 'T4' },
  { key: 4, label: 'T5' },
  { key: 5, label: 'T6' },
  { key: 6, label: 'T7' },
  { key: 0, label: 'CN' },
];
const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const { markOnboarded } = useAuth();
  const [step, setStep] = useState(0);
  const [targetScore, setTargetScore] = useState(750);
  const [minutesPerDay, setMinutesPerDay] = useState(30);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    setQuizLoading(true);
    setQuizError(null);
    try {
      const questions = await practiceService.questions({ limit: 5 });
      setQuizQuestions(questions);
      setQuizAnswers(Object.fromEntries(questions.map((q) => [q.id, null])));
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : 'Không tải được bài test.');
    } finally {
      setQuizLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 3 && !quizQuestions) loadQuiz();
  }, [step, quizQuestions, loadQuiz]);

  const toggleDay = (key: number) =>
    setStudyDays((days) => (days.includes(key) ? days.filter((d) => d !== key) : [...days, key]));

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submitQuiz = async () => {
    if (!quizQuestions) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const answers = quizQuestions.map((q) => ({ questionId: q.id, selected: quizAnswers[q.id] ?? -1 }));
      const placement = await vocabService.submitPlacement(
        answers.map((a) => ({ questionId: a.questionId, selected: a.selected }))
      );
      setResult(placement);
      next();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không nộp được bài test.');
    } finally {
      setSubmitting(false);
    }
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      const roadmap = await authService.completeOnboarding({ targetScore, minutesPerDay, studyDays });
      if (!result) setResult(roadmap);
      await markOnboarded();
      router.replace('/(tabs)');
    } catch {
      // Hoàn tất onboarding cục bộ kể cả khi backend lỗi, để không kẹt màn hình.
      await markOnboarded();
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  const canNextQuiz = quizQuestions?.every((q) => quizAnswers[q.id] !== null && quizAnswers[q.id] !== undefined);

  return (
    <Screen>
      <ProgressBar value={(step + 1) / TOTAL_STEPS} style={styles.progress} />
      <Text style={styles.stepLabel}>
        Bước {step + 1}/{TOTAL_STEPS}
      </Text>

      {step === 0 && (
        <GlassCard>
          <Text style={styles.title}>Mục tiêu điểm TOEIC của bạn?</Text>
          <Text style={styles.desc}>Lộ trình học sẽ được cá nhân hoá theo mục tiêu này.</Text>
          <View style={styles.chips}>
            {GOALS.map((g) => (
              <Chip key={g} label={`${g}+`} selected={targetScore === g} onPress={() => setTargetScore(g)} />
            ))}
          </View>
        </GlassCard>
      )}

      {step === 1 && (
        <GlassCard>
          <Text style={styles.title}>Mỗi ngày bạn học bao nhiêu phút?</Text>
          <View style={styles.chips}>
            {MINUTES.map((m) => (
              <Chip
                key={m}
                label={`${m} phút`}
                selected={minutesPerDay === m}
                onPress={() => setMinutesPerDay(m)}
              />
            ))}
          </View>
        </GlassCard>
      )}

      {step === 2 && (
        <GlassCard>
          <Text style={styles.title}>Bạn học vào những ngày nào?</Text>
          <Text style={styles.desc}>Chọn ít nhất 1 ngày.</Text>
          <View style={styles.chips}>
            {DAYS.map((d) => (
              <Chip key={d.key} label={d.label} selected={studyDays.includes(d.key)} onPress={() => toggleDay(d.key)} />
            ))}
          </View>
        </GlassCard>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.title}>Bài test đầu vào nhanh (5 câu)</Text>
          <Text style={styles.desc}>Làm nhanh để hệ thống ước lượng trình độ hiện tại.</Text>
          {quizLoading && <LoadingState message="Đang tải đề…" />}
          {quizError && <ErrorState message={quizError} onRetry={loadQuiz} />}
          {quizQuestions?.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              selected={quizAnswers[q.id] ?? null}
              onSelect={(opt) => setQuizAnswers((a) => ({ ...a, [q.id]: opt }))}
            />
          ))}
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
          {quizQuestions && !quizLoading ? (
            <GlassButton
              title="Nộp bài"
              onPress={submitQuiz}
              loading={submitting}
              disabled={!canNextQuiz}
              style={styles.cta}
            />
          ) : null}
        </View>
      )}

      {step === 4 && (
        <GlassCard>
          <Text style={styles.title}>Lộ trình gợi ý cho bạn</Text>
          {result ? (
            <View>
              <Text style={styles.score}>
                Điểm ước lượng: <Text style={styles.scoreValue}>{result.estimatedScore}/990</Text>
              </Text>
              <Text style={styles.level}>Trình độ: {result.level}</Text>
              {result.roadmap.map((r, i) => (
                <View key={i} style={styles.roadmapItem}>
                  <Text style={styles.roadmapTitle}>
                    {i + 1}. {r.title}
                  </Text>
                  <Text style={styles.roadmapDesc}>{r.description}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.desc}>Lộ trình sẽ được tạo dựa trên kết quả test của bạn.</Text>
          )}
          <GlassButton title="Bắt đầu học 🚀" onPress={finish} loading={submitting} style={styles.cta} />
        </GlassCard>
      )}

      <View style={styles.nav}>
        {step > 0 && step < 3 ? (
          <GlassButton title="Quay lại" onPress={back} variant="ghost" />
        ) : (
          <View />
        )}
        {step < 3 ? (
          <GlassButton
            title="Tiếp tục"
            onPress={next}
            disabled={step === 2 && studyDays.length === 0}
            style={styles.nextBtn}
          />
        ) : (
          <View />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { marginBottom: spacing.sm },
  stepLabel: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: spacing.xs },
  desc: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  cta: { marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  nextBtn: { minWidth: 150 },
  score: { fontSize: 16, color: colors.ink, marginBottom: 4 },
  scoreValue: { fontWeight: '800', color: colors.primary, fontSize: 20 },
  level: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md },
  roadmapItem: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  roadmapTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  roadmapDesc: { fontSize: 13, color: colors.inkSoft, marginTop: 2, lineHeight: 19 },
});
