import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ProgressBar } from '@/src/components/ui/Progress';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { useRecorder } from '@/src/hooks/useRecorder';
import { aiService } from '@/src/services/ai.service';
import { speakText, stopTts } from '@/src/services/tts.service';
import { colors, spacing } from '@/src/theme';
import type { AiAvailability, HandsfreeAnswer, HandsfreeItem, HandsfreeSession } from '@/src/types';

type Phase = 'idle' | 'reading' | 'listening' | 'grading' | 'feedback' | 'done';

export default function HandsfreeScreen() {
  const [session, setSession] = useState<HandsfreeSession | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<HandsfreeAnswer | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [review, setReview] = useState<HandsfreeItem[]>([]);
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  const { state, uri, seconds, error: recError, start, stop, reset } = useRecorder();

  useEffect(() => {
    aiService.availability().then(setAvailability).catch(() => undefined);
    return () => {
      stopTts().catch(() => undefined);
    };
  }, []);

  const readPrompt = useCallback(async (item: HandsfreeItem) => {
    setPhase('reading');
    try {
      await speakText(item.kind === 'vocab' ? `Từ này nghĩa là gì? ${item.prompt}` : item.prompt, {
        onDone: () => setPhase((p) => (p === 'reading' ? 'listening' : p)),
      });
    } catch {
      setPhase('listening');
    }
  }, []);

  const startSession = async () => {
    setStarting(true);
    setError(null);
    try {
      const s = await aiService.startHandsfree(10);
      setSession(s);
      setIndex(0);
      setCorrectCount(0);
      setReview([]);
      setAnswer(null);
      reset();
      await readPrompt(s.items[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không bắt đầu được phiên học.');
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    const item = session?.items[index];
    if (!item || !session || !uri) return;
    setPhase('grading');
    try {
      const r = await aiService.answerHandsfree(session.sessionId, item.id, uri);
      setAnswer(r);
      if (r.correct) setCorrectCount((c) => c + 1);
      else setReview((list) => [...list, item]);
      setPhase('feedback');
      // Đọc giải thích ngắn rồi chờ người dùng bấm tiếp (không tự chuyển để tránh dồn câu).
      await speakText(r.correct ? 'Chính xác.' : 'Chưa đúng.', {}).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chấm câu trả lời thất bại.');
      setPhase('listening');
    }
  };

  const nextItem = async () => {
    if (!session) return;
    setAnswer(null);
    reset();
    if (index + 1 >= session.items.length) {
      setPhase('done');
      await stopTts().catch(() => undefined);
      await speakText(
        `Kết thúc phiên. Bạn trả lời đúng ${correctCount} trên ${session.items.length} câu.`,
        {}
      ).catch(() => undefined);
    } else {
      const next = index + 1;
      setIndex(next);
      await readPrompt(session.items[next]);
    }
  };

  const endSession = async () => {
    await stopTts().catch(() => undefined);
    setPhase('done');
  };

  const aiDown = availability && !availability.aiAvailable;
  const item = session?.items[index];

  return (
    <Screen>
      <Text style={styles.title}>Học rảnh tay 🎧</Text>
      <Text style={styles.sub}>
        Đeo tai nghe, hệ thống đọc câu hỏi bằng giọng George — bạn trả lời bằng miệng. Giọng nói được
        gửi lên máy chủ để nhận dạng và chấm (không chấm trên máy).
      </Text>

      {aiDown ? (
        <GlassCard style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ AI hiện không khả dụng{availability.message ? `: ${availability.message}` : '.'}
          </Text>
        </GlassCard>
      ) : null}

      {phase === 'idle' && (
        <GlassCard style={styles.intro}>
          <Text style={styles.introText}>
            • 10 câu mỗi phiên{'\n'}• Không cần chạm màn hình giữa chừng{'\n'}• Kết quả tính vào
            tiến độ học như buổi học thường
          </Text>
          <GlassButton
            title="▶️ Bắt đầu phiên rảnh tay"
            onPress={startSession}
            loading={starting}
            disabled={aiDown === true}
            style={styles.cta}
          />
        </GlassCard>
      )}
      {error ? <ErrorState message={error} /> : null}

      {session && phase !== 'idle' && phase !== 'done' && item ? (
        <View>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Câu {index + 1}/{session.items.length} • Đúng {correctCount}
            </Text>
            <ProgressBar value={(index + 1) / session.items.length} />
          </View>

          <GlassCard style={styles.itemCard}>
            <View style={styles.phaseRow}>
              <Ionicons
                name={
                  phase === 'reading'
                    ? 'volume-high'
                    : phase === 'listening'
                      ? 'mic'
                      : phase === 'grading'
                        ? 'hourglass'
                        : 'chatbubble-ellipses'
                }
                size={28}
                color={colors.primary}
              />
              <Text style={styles.phaseLabel}>
                {phase === 'reading'
                  ? 'Đang đọc câu hỏi…'
                  : phase === 'listening'
                    ? 'Nghe xong — trả lời bằng giọng nói'
                    : phase === 'grading'
                      ? 'Đang chấm…'
                      : 'Kết quả'}
              </Text>
            </View>
            <Text style={styles.prompt}>{item.prompt}</Text>

            {phase === 'listening' && (
              <View>
                {state !== 'recording' ? (
                  <GlassButton
                    title={uri ? '🔴 Thu lại câu trả lời' : '🎤 Trả lời bằng giọng nói'}
                    onPress={start}
                    style={styles.cta}
                  />
                ) : (
                  <GlassButton title={`⏹️ Xong (${seconds}s)`} variant="danger" onPress={stop} style={styles.cta} />
                )}
                {recError ? <Text style={styles.error}>{recError}</Text> : null}
                {uri && state === 'stopped' ? (
                  <GlassButton title="Gửi câu trả lời" onPress={submitAnswer} style={styles.cta} />
                ) : null}
              </View>
            )}

            {phase === 'grading' && <LoadingState message="AI đang nghe và chấm…" />}

            {phase === 'feedback' && answer ? (
              <View style={styles.feedback}>
                <Text style={[styles.verdict, answer.correct ? styles.correct : styles.wrong]}>
                  {answer.correct ? '✅ Đúng' : '❌ Chưa đúng'}
                </Text>
                <Text style={styles.transcript}>Bạn nói: “{answer.transcript}”</Text>
                <Text style={styles.explain}>{answer.explanation}</Text>
                <GlassButton title="Câu tiếp theo →" onPress={nextItem} style={styles.cta} />
              </View>
            ) : null}
          </GlassCard>

          <GlassButton title="Kết thúc phiên" variant="ghost" onPress={endSession} />
        </View>
      ) : null}

      {phase === 'done' && session ? (
        <GlassCard style={styles.doneCard}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Xong phiên rảnh tay!</Text>
          <Text style={styles.doneScore}>
            Đúng {correctCount}/{session.items.length} câu
          </Text>
          {review.length > 0 ? (
            <View style={styles.reviewBox}>
              <Text style={styles.reviewTitle}>Câu cần ôn lại:</Text>
              {review.map((r) => (
                <Text key={r.id} style={styles.reviewItem}>• {r.prompt}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.perfect}>Hoàn hảo, không cần ôn lại câu nào!</Text>
          )}
          <GlassButton title="Học phiên mới" onPress={startSession} loading={starting} style={styles.cta} />
        </GlassCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  sub: { fontSize: 13, color: colors.inkSoft, marginBottom: spacing.md, lineHeight: 20 },
  warn: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' },
  warnText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  intro: { marginTop: spacing.sm },
  introText: { fontSize: 14, color: colors.inkSoft, lineHeight: 24 },
  cta: { marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  progressRow: { marginBottom: spacing.md },
  progressText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600', marginBottom: 6 },
  itemCard: { minHeight: 280 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  phaseLabel: { fontSize: 15, fontWeight: '700', color: colors.primary },
  prompt: { fontSize: 18, color: colors.ink, lineHeight: 26, fontWeight: '600' },
  feedback: { marginTop: spacing.sm },
  verdict: { fontSize: 18, fontWeight: '800' },
  correct: { color: colors.success },
  wrong: { color: colors.danger },
  transcript: { fontSize: 14, color: colors.inkSoft, fontStyle: 'italic', marginTop: 6, lineHeight: 20 },
  explain: { fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 21 },
  doneCard: { alignItems: 'center', marginTop: spacing.md },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  doneScore: { fontSize: 16, color: colors.primary, fontWeight: '800', marginTop: 6 },
  reviewBox: { width: '100%', marginTop: spacing.md },
  reviewTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  reviewItem: { fontSize: 13, color: colors.inkSoft, marginBottom: 4, lineHeight: 19 },
  perfect: { fontSize: 14, color: colors.success, fontWeight: '600', marginTop: spacing.sm },
});
