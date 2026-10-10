import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { ProgressBar } from '@/src/components/ui/Progress';
import { ErrorState } from '@/src/components/ui/States';
import { QuestionCard } from '@/src/components/practice/QuestionCard';
import { aiService } from '@/src/services/ai.service';
import { colors, spacing } from '@/src/theme';
import type { AiAvailability, DocAnalysis } from '@/src/types';

const ACCEPTED = ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function DocsScreen() {
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<DocAnalysis | null>(null);
  const [history, setHistory] = useState<DocAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    aiService.availability().then(setAvailability).catch(() => undefined);
    aiService.docHistory().then(setHistory).catch(() => undefined);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const pollAnalysis = (analysisId: string) => {
    stopPolling();
    pollTimer.current = setInterval(async () => {
      try {
        const a = await aiService.docAnalysis(analysisId);
        setAnalysis(a);
        if (a.status !== 'PROCESSING') {
          stopPolling();
          aiService.docHistory().then(setHistory).catch(() => undefined);
        }
      } catch {
        stopPolling();
      }
    }, 3000);
  };

  const pickAndUpload = async () => {
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ACCEPTED, copyToCacheDirectory: true });
      if (res.canceled || !res.assets[0]) return;
      const file = res.assets[0];
      setUploading(true);
      const { analysisId } = await aiService.uploadDoc(file.uri, file.name, file.mimeType ?? 'application/octet-stream');
      setUploading(false);
      const a = await aiService.docAnalysis(analysisId);
      setAnalysis(a);
      if (a.status === 'PROCESSING') pollAnalysis(analysisId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nạp tài liệu thất bại.');
      setUploading(false);
    }
  };

  const openHistoryItem = async (id: string) => {
    try {
      const a = await aiService.docAnalysis(id);
      setAnalysis(a);
      if (a.status === 'PROCESSING') pollAnalysis(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không mở được tài liệu.');
    }
  };

  const aiDown = availability && !availability.aiAvailable;

  return (
    <Screen>
      <Text style={styles.title}>Nạp tài liệu sinh đề 📄</Text>
      <Text style={styles.sub}>Nạp PDF, DOCX hoặc TXT — AI trích từ vựng, ngữ pháp, mẹo và sinh câu hỏi Part.</Text>

      {aiDown ? (
        <GlassCard style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ AI hiện không khả dụng{availability.message ? `: ${availability.message}` : '.'} Tài liệu đã
            phân tích trước đó vẫn xem lại được.
          </Text>
        </GlassCard>
      ) : null}

      <GlassButton
        title="📤 Chọn tài liệu (PDF / DOCX / TXT)"
        onPress={pickAndUpload}
        loading={uploading}
        style={styles.cta}
      />
      {error ? <ErrorState message={error} /> : null}

      {analysis ? (
        <View>
          <SectionTitle title={analysis.fileName} />
          {analysis.status === 'PROCESSING' ? (
            <GlassCard>
              <Text style={styles.progressLabel}>Đang phân tích… {analysis.progress}%</Text>
              <ProgressBar value={analysis.progress / 100} />
              <Text style={styles.progressHint}>Xử lý theo từng đoạn, bạn có thể thoát app — xong sẽ lưu lại.</Text>
            </GlassCard>
          ) : analysis.status === 'FAILED' ? (
            <ErrorState message={analysis.error ?? 'Phân tích thất bại.'} />
          ) : (
            <View>
              {analysis.vocabAdded && analysis.vocabAdded.length > 0 ? (
                <View>
                  <SectionTitle title={`Từ vựng mới (${analysis.vocabAdded.length}) — đã vào flashcard`} />
                  <GlassCard>
                    {analysis.vocabAdded.map((v, i) => (
                      <Text key={i} style={styles.vocabItem}>
                        • <Text style={styles.vocabWord}>{v.word}</Text> — {v.meaningVi}
                      </Text>
                    ))}
                  </GlassCard>
                </View>
              ) : null}

              {analysis.grammarPoints && analysis.grammarPoints.length > 0 ? (
                <View>
                  <SectionTitle title="Điểm ngữ pháp" />
                  <GlassCard>
                    {analysis.grammarPoints.map((g, i) => (
                      <Text key={i} style={styles.bullet}>• {g}</Text>
                    ))}
                  </GlassCard>
                </View>
              ) : null}

              {analysis.tips && analysis.tips.length > 0 ? (
                <View>
                  <SectionTitle title="Mẹo làm bài" />
                  <GlassCard>
                    {analysis.tips.map((t, i) => (
                      <Text key={i} style={styles.bullet}>💡 {t}</Text>
                    ))}
                  </GlassCard>
                </View>
              ) : null}

              {analysis.questions && analysis.questions.length > 0 ? (
                <View>
                  <SectionTitle title={`Câu hỏi đã sinh (${analysis.questions.length})`} />
                  {analysis.questions.map((q, i) => (
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
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      {history.length > 0 ? (
        <View>
          <SectionTitle title="Đã phân tích trước đây" />
          {history.map((h) => (
            <Pressable key={h.id} onPress={() => openHistoryItem(h.id)}>
              <GlassCard>
                <View style={styles.historyRow}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                  <View style={styles.historyMain}>
                    <Text style={styles.historyName} numberOfLines={1}>{h.fileName}</Text>
                    <Text style={styles.historyMeta}>
                      {h.status === 'DONE' ? 'Hoàn tất' : h.status === 'PROCESSING' ? `Đang xử lý ${h.progress}%` : 'Thất bại'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  sub: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md, lineHeight: 20 },
  warn: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' },
  warnText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  cta: { marginBottom: spacing.sm },
  progressLabel: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  progressHint: { fontSize: 12, color: colors.inkMuted, marginTop: 8, lineHeight: 18 },
  vocabItem: { fontSize: 14, color: colors.inkSoft, marginBottom: 6, lineHeight: 20 },
  vocabWord: { fontWeight: '800', color: colors.ink },
  bullet: { fontSize: 14, color: colors.inkSoft, marginBottom: 6, lineHeight: 20 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyMain: { flex: 1 },
  historyName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  historyMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
});
