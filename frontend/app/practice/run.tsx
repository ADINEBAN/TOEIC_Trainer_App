import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ProgressBar } from '@/src/components/ui/Progress';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { QuestionCard } from '@/src/components/practice/QuestionCard';
import { practiceService } from '@/src/services/practice.service';
import { colors, radius, spacing } from '@/src/theme';
import type { PracticeAttemptResult, Question, TestKind } from '@/src/types';

type Mode = 'part' | 'mistakes' | 'test';

interface SavedProgress {
  answers: Record<string, number | null>;
  flagged: string[];
}

function progressKey(testId: string) {
  return `@toeic_trainer_test_progress_${testId}`;
}

async function loadSavedProgress(testId: string): Promise<SavedProgress | null> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(progressKey(testId));
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
}

async function saveProgress(testId: string, data: SavedProgress) {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(progressKey(testId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

async function clearProgress(testId: string) {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem(progressKey(testId));
  } catch {
    // ignore
  }
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PracticeRunScreen() {
  const params = useLocalSearchParams<{ part?: string; mode?: string; testId?: string }>();
  const mode: Mode = params.testId ? 'test' : params.mode === 'mistakes' ? 'mistakes' : 'part';
  const part = params.part ? Number(params.part) : undefined;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [kind, setKind] = useState<TestKind | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [gridVisible, setGridVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<PracticeAttemptResult | null>(null);
  const startTime = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'test' && params.testId) {
        const session = await practiceService.testQuestions(params.testId);
        setQuestions(session.questions);
        setKind(session.kind);
        setTotalSeconds(session.durationMinutes * 60);
        const saved = await loadSavedProgress(params.testId);
        if (saved) {
          setAnswers(saved.answers);
          setFlagged(new Set(saved.flagged));
        } else {
          setAnswers(Object.fromEntries(session.questions.map((q) => [q.id, null])));
        }
      } else if (mode === 'mistakes') {
        const qs = await practiceService.mistakes();
        setQuestions(qs);
        setAnswers(Object.fromEntries(qs.map((q) => [q.id, null])));
      } else {
        const qs = await practiceService.questions({ part, limit: 10 });
        setQuestions(qs);
        setAnswers(Object.fromEntries(qs.map((q) => [q.id, null])));
      }
      startTime.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, [mode, part, params.testId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFlag = (id: string) =>
    setFlagged((f) => {
      const next = new Set(f);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const checkOne = (id: string) => setChecked((c) => new Set(c).add(id));

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submitting || questions.length === 0) return;
      setSubmitting(true);
      try {
        const payload = questions.map((q) => ({ questionId: q.id, selected: answers[q.id] ?? null }));
        const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);
        if (mode === 'test' && params.testId) {
          await clearProgress(params.testId);
          await practiceService.submitTest(params.testId, {
            answers: payload,
            flagged: [...flagged],
            durationSeconds,
          });
          router.replace(`/practice/result?testId=${params.testId}` as never);
        } else {
          const res = await practiceService.submitAttempt({ part, answers: payload });
          setAttemptResult(res);
        }
      } catch (e) {
        if (!auto) {
          setError(e instanceof Error ? e.message : 'Nộp bài thất bại.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, questions, answers, flagged, mode, part, params.testId]
  );

  // Countdown for mock tests
  useEffect(() => {
    if (mode !== 'test' || totalSeconds <= 0) return;
    const timer = setInterval(() => {
      setTotalSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, questions.length, handleSubmit]);

  // Auto-save answers for tests
  useEffect(() => {
    if (mode === 'test' && params.testId && questions.length > 0) {
      saveProgress(params.testId, { answers, flagged: [...flagged] });
    }
  }, [answers, flagged, mode, params.testId, questions.length]);

  const question = questions[index];
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== null && answers[q.id] !== undefined).length,
    [questions, answers]
  );

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Đang tải câu hỏi…" />
      </Screen>
    );
  }

  if (error && questions.length === 0) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  // Practice result view (part / mistakes mode)
  if (attemptResult) {
    return (
      <Screen>
        <GlassCard style={styles.resultCard}>
          <Text style={styles.resultTitle}>Kết quả</Text>
          <Text style={styles.resultScore}>
            {attemptResult.score}/{attemptResult.total}
          </Text>
          <Text style={styles.resultSub}>
            {attemptResult.mistakes.length === 0
              ? 'Xuất sắc! Không sai câu nào 🎉'
              : `${attemptResult.mistakes.length} câu cần xem lại`}
          </Text>
        </GlassCard>
        {attemptResult.mistakes.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            selected={answers[q.id] ?? null}
            onSelect={() => undefined}
            showAnswer
            locked
          />
        ))}
        <GlassButton title="Về luyện tập" variant="outline" onPress={() => router.back()} style={styles.cta} />
      </Screen>
    );
  }

  if (!question) {
    return (
      <Screen>
        <ErrorState message="Không có câu hỏi nào." onRetry={() => router.back()} />
      </Screen>
    );
  }

  const title =
    mode === 'test'
      ? `Thi thử ${kind ?? ''}`
      : mode === 'mistakes'
        ? 'Ôn sổ lỗi'
        : `Luyện Part ${part ?? ''}`;

  return (
    <Screen scroll={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle}>{title}</Text>
        {mode === 'test' ? (
          <View style={[styles.timer, totalSeconds < 300 && styles.timerUrgent]}>
            <Ionicons name="timer-outline" size={16} color={totalSeconds < 300 ? colors.danger : colors.primary} />
            <Text style={[styles.timerText, totalSeconds < 300 && styles.timerTextUrgent]}>
              {formatTime(totalSeconds)}
            </Text>
          </View>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {answeredCount}/{questions.length} đã làm
        </Text>
        <ProgressBar value={questions.length ? answeredCount / questions.length : 0} />
      </View>

      <ScrollView style={styles.qScroll} showsVerticalScrollIndicator={false}>
        <QuestionCard
          question={question}
          index={index}
          selected={answers[question.id] ?? null}
          onSelect={(opt) => setAnswers((a) => ({ ...a, [question.id]: opt }))}
          showAnswer={mode !== 'test' && checked.has(question.id)}
          flagged={flagged.has(question.id)}
          onToggleFlag={mode === 'test' ? () => toggleFlag(question.id) : undefined}
          locked={mode !== 'test' && checked.has(question.id)}
        />
        {mode !== 'test' && !checked.has(question.id) ? (
          <GlassButton
            title="Kiểm tra đáp án"
            variant="outline"
            onPress={() => checkOne(question.id)}
            disabled={answers[question.id] === null || answers[question.id] === undefined}
            style={styles.cta}
          />
        ) : null}
      </ScrollView>

      <View style={styles.navBar}>
        <GlassButton
          title="← Trước"
          variant="ghost"
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        />
        {mode === 'test' ? (
          <GlassButton title="Lưới câu hỏi" variant="outline" onPress={() => setGridVisible(true)} />
        ) : (
          <View />
        )}
        {index < questions.length - 1 ? (
          <GlassButton title="Sau →" variant="ghost" onPress={() => setIndex((i) => i + 1)} />
        ) : (
          <GlassButton title="Nộp bài" onPress={() => handleSubmit(false)} loading={submitting} />
        )}
      </View>

      <Modal visible={gridVisible} animationType="slide" transparent>
        <View style={styles.gridBackdrop}>
          <View style={styles.gridModal}>
            <View style={styles.gridHeader}>
              <Text style={styles.gridTitle}>Lưới câu hỏi</Text>
              <Pressable onPress={() => setGridVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.legend}>
              <Text style={styles.legendItem}>⬜ Chưa làm</Text>
              <Text style={styles.legendItem}>🟦 Đã làm</Text>
              <Text style={styles.legendItem}>🚩 Gắn cờ</Text>
            </View>
            <ScrollView>
              <View style={styles.grid}>
                {questions.map((q, i) => {
                  const answered = answers[q.id] !== null && answers[q.id] !== undefined;
                  const isFlagged = flagged.has(q.id);
                  return (
                    <Pressable
                      key={q.id}
                      style={[
                        styles.cell,
                        answered && styles.cellAnswered,
                        i === index && styles.cellCurrent,
                      ]}
                      onPress={() => {
                        setIndex(i);
                        setGridVisible(false);
                      }}
                    >
                      <Text style={[styles.cellText, answered && styles.cellTextAnswered]}>
                        {i + 1}
                      </Text>
                      {isFlagged ? <Text style={styles.flagMark}>🚩</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <GlassButton
              title={`Nộp bài (${answeredCount}/${questions.length})`}
              onPress={() => {
                setGridVisible(false);
                handleSubmit(false);
              }}
              loading={submitting}
              style={styles.cta}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minWidth: 76,
    justifyContent: 'center',
  },
  timerUrgent: { backgroundColor: colors.dangerSoft },
  timerText: { fontWeight: '800', color: colors.primary, fontSize: 14 },
  timerTextUrgent: { color: colors.danger },
  progressRow: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  progressText: { fontSize: 12, color: colors.inkSoft, fontWeight: '600', marginBottom: 6 },
  qScroll: { flex: 1, marginTop: spacing.sm },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cta: { marginTop: spacing.sm, marginBottom: spacing.md },
  resultCard: { alignItems: 'center', marginTop: spacing.md },
  resultTitle: { fontSize: 16, fontWeight: '700', color: colors.inkSoft },
  resultScore: { fontSize: 40, fontWeight: '800', color: colors.primary, marginTop: 4 },
  resultSub: { fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  gridBackdrop: { flex: 1, backgroundColor: 'rgba(18,50,79,0.35)', justifyContent: 'flex-end' },
  gridModal: {
    backgroundColor: colors.sky,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  legend: { flexDirection: 'row', gap: 12, marginVertical: spacing.sm },
  legendItem: { fontSize: 12, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellAnswered: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellCurrent: { borderWidth: 2.5, borderColor: colors.teal },
  cellText: { fontWeight: '800', color: colors.inkSoft },
  cellTextAnswered: { color: colors.white },
  flagMark: { position: 'absolute', top: 2, right: 4, fontSize: 10 },
});
