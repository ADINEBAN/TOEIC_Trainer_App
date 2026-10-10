import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ListenButton } from '@/src/components/ui/ListenButton';
import { SectionTitle } from '@/src/components/ui/Section';
import { ProgressBar } from '@/src/components/ui/Progress';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { useRecorder } from '@/src/hooks/useRecorder';
import { aiService } from '@/src/services/ai.service';
import { playLocalAudio } from '@/src/services/tts.service';
import { colors, spacing } from '@/src/theme';
import type { AiAvailability, SpeakingAttempt, SpeakingResult, SpeakingSample } from '@/src/types';

const SCORE_LABELS: { key: keyof SpeakingResult['scores']; label: string }[] = [
  { key: 'pronunciation', label: 'Phát âm' },
  { key: 'fluency', label: 'Trôi chảy' },
  { key: 'accuracy', label: 'Chính xác' },
  { key: 'intonation', label: 'Ngữ điệu' },
];

export default function SpeakingScreen() {
  const [samples, setSamples] = useState<SpeakingSample[]>([]);
  const [selected, setSelected] = useState<SpeakingSample | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [history, setHistory] = useState<SpeakingAttempt[]>([]);
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  const { state, uri, seconds, error: recError, start, stop, reset } = useRecorder();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h, a] = await Promise.all([
        aiService.speakingSamples(),
        aiService.speakingHistory(),
        aiService.availability(),
      ]);
      setSamples(s);
      setHistory(h);
      setAvailability(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được Speaking Coach.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chooseSample = (s: SpeakingSample) => {
    setSelected(s);
    setResult(null);
    reset();
  };

  const submitRecording = async () => {
    if (!uri || !selected) return;
    setScoring(true);
    setError(null);
    try {
      const r = await aiService.scoreSpeaking(uri, selected.id);
      setResult(r);
      aiService.speakingHistory().then(setHistory).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chấm điểm thất bại.');
    } finally {
      setScoring(false);
    }
  };

  const aiDown = availability && !availability.aiAvailable;

  return (
    <Screen>
      <Text style={styles.title}>Speaking Coach 🎙️</Text>
      <Text style={styles.sub}>Nghe câu mẫu giọng George, đọc theo, nhận điểm 4 thành phần.</Text>

      {aiDown ? (
        <GlassCard style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ AI chấm điểm hiện không khả dụng{availability.message ? `: ${availability.message}` : '.'} Bạn
            vẫn nghe được câu mẫu.
          </Text>
        </GlassCard>
      ) : null}

      {loading ? (
        <LoadingState message="Đang tải câu mẫu…" />
      ) : error && samples.length === 0 ? (
        <ErrorState message={error ?? 'Không có dữ liệu.'} onRetry={load} />
      ) : (
        <View>
          <SectionTitle title="Chọn câu mẫu" />
          <View style={styles.sampleRow}>
            {samples.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.sampleChip, selected?.id === s.id && styles.sampleChipSelected]}
                onPress={() => chooseSample(s)}
              >
                <Text style={[styles.sampleText, selected?.id === s.id && styles.sampleTextSelected]} numberOfLines={2}>
                  {s.text}
                </Text>
              </Pressable>
            ))}
          </View>

          {selected ? (
            <GlassCard>
              <Text style={styles.sampleFull}>{selected.text}</Text>
              <View style={styles.listenRow}>
                <ListenButton text={selected.text} showLabel size={24} />
              </View>

              {state === 'idle' || state === 'stopped' ? (
                <GlassButton
                  title={uri ? '🔴 Thu lại' : '🔴 Bắt đầu thu âm'}
                  onPress={start}
                  variant={uri ? 'outline' : 'primary'}
                  style={styles.cta}
                />
              ) : (
                <GlassButton
                  title={`⏹️ Dừng thu âm (${seconds}s)`}
                  variant="danger"
                  onPress={stop}
                  style={styles.cta}
                />
              )}
              {recError ? <Text style={styles.error}>{recError}</Text> : null}

              {uri && state === 'stopped' ? (
                <View style={styles.afterRecord}>
                  <GlassButton
                    title="▶️ Nghe lại bản thu"
                    variant="outline"
                    onPress={() => playLocalAudio(uri).catch(() => undefined)}
                  />
                  <GlassButton
                    title="Chấm điểm"
                    onPress={submitRecording}
                    loading={scoring}
                    disabled={aiDown === true}
                  />
                </View>
              ) : null}
            </GlassCard>
          ) : null}

          {scoring && <LoadingState message="AI đang chấm điểm…" />}
          {error && selected ? <ErrorState message={error} /> : null}

          {result ? (
            <GlassCard style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                Điểm tổng: <Text style={styles.resultOverall}>{result.scores.overall}/100</Text>
              </Text>
              {SCORE_LABELS.map((s) => (
                <View key={s.key} style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>{s.label}</Text>
                  <ProgressBar value={result.scores[s.key] / 100} style={styles.scoreBar} />
                  <Text style={styles.scoreValue}>{result.scores[s.key]}</Text>
                </View>
              ))}
              <Text style={styles.transcriptLabel}>AI nghe bạn đọc là:</Text>
              <Text style={styles.transcript}>“{result.transcript}”</Text>
              {result.weakSounds.length > 0 ? (
                <View>
                  <Text style={styles.weakLabel}>Âm cần cải thiện:</Text>
                  <View style={styles.weakRow}>
                    {result.weakSounds.map((w, i) => (
                      <Text key={i} style={styles.weakChip}>/{w}/</Text>
                    ))}
                  </View>
                </View>
              ) : null}
              <Text style={styles.feedback}>{result.feedback}</Text>
            </GlassCard>
          ) : null}

          {history.length > 0 ? (
            <View>
              <SectionTitle title="Biểu đồ tiến bộ" />
              <GlassCard>
                <View style={styles.chart}>
                  {history.slice(0, 10).reverse().map((h) => (
                    <View key={h.id} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${Math.max(4, h.scores.overall)}%` }]} />
                      </View>
                      <Text style={styles.barValue}>{h.scores.overall}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.chartHint}>Điểm tổng 10 lần chấm gần nhất</Text>
              </GlassCard>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  sub: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md },
  warn: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' },
  warnText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  sampleRow: { gap: 8 },
  sampleChip: {
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: 8,
  },
  sampleChipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  sampleText: { fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
  sampleTextSelected: { color: colors.ink, fontWeight: '600' },
  sampleFull: { fontSize: 17, color: colors.ink, lineHeight: 25, fontWeight: '600' },
  listenRow: { marginTop: spacing.sm, marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  afterRecord: { gap: 8, marginTop: spacing.sm },
  resultCard: { borderWidth: 2, borderColor: colors.teal },
  resultTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  resultOverall: { color: colors.teal, fontSize: 22 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scoreLabel: { width: 78, fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
  scoreBar: { flex: 1 },
  scoreValue: { width: 34, textAlign: 'right', fontWeight: '800', color: colors.ink, fontSize: 13 },
  transcriptLabel: { fontSize: 12, color: colors.inkMuted, marginTop: spacing.sm, fontWeight: '600' },
  transcript: { fontSize: 14, color: colors.ink, fontStyle: 'italic', marginTop: 2, lineHeight: 20 },
  weakLabel: { fontSize: 13, fontWeight: '700', color: colors.danger, marginTop: spacing.sm },
  weakRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  weakChip: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 13,
  },
  feedback: { fontSize: 14, color: colors.inkSoft, marginTop: spacing.sm, lineHeight: 21 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140, justifyContent: 'center' },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: {
    width: 22,
    height: 110,
    backgroundColor: 'rgba(18,50,79,0.08)',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { backgroundColor: colors.teal, borderRadius: 8, width: '100%' },
  barValue: { fontSize: 10, color: colors.inkMuted, marginTop: 4, fontWeight: '700' },
  chartHint: { fontSize: 11, color: colors.inkMuted, textAlign: 'center', marginTop: 8 },
});
