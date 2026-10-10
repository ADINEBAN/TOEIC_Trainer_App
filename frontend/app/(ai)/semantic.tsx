import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ListenButton } from '@/src/components/ui/ListenButton';
import { SectionTitle } from '@/src/components/ui/Section';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { aiService } from '@/src/services/ai.service';
import { colors, radius, spacing } from '@/src/theme';
import type { AiAvailability, SemanticGraph, SemanticRelation } from '@/src/types';

const RELATION_LABELS: Record<SemanticRelation['relation'], { label: string; color: string }> = {
  synonym: { label: 'Đồng nghĩa', color: colors.primary },
  antonym: { label: 'Trái nghĩa', color: colors.danger },
  wordFamily: { label: 'Cùng họ từ', color: colors.teal },
  collocation: { label: 'Hay đi kèm', color: colors.orange },
};

export default function SemanticScreen() {
  const { word: initialWord } = useLocalSearchParams<{ word?: string }>();
  const [query, setQuery] = useState(initialWord ?? '');
  const [graph, setGraph] = useState<SemanticGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    aiService.availability().then(setAvailability).catch(() => undefined);
  }, []);

  const load = useCallback(async (word: string) => {
    const w = word.trim();
    if (!w) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const g = await aiService.semanticGraph(w);
      setGraph(g);
      setQuery(g.center.word);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được mạng từ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialWord) load(initialWord);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCenter = async () => {
    if (!graph) return;
    setSaving(true);
    try {
      await aiService.saveSemanticWord(graph.center.word);
      setSaved(true);
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
    }
  };

  const groups = (['synonym', 'antonym', 'wordFamily', 'collocation'] as const)
    .map((rel) => ({ rel, items: graph?.relations.filter((r) => r.relation === rel) ?? [] }))
    .filter((g) => g.items.length > 0);

  return (
    <Screen>
      <Text style={styles.title}>Mạng ngữ nghĩa 🕸️</Text>
      <Text style={styles.sub}>Nhập một từ để xem các từ liên quan quanh nó.</Text>

      {availability && !availability.aiAvailable ? (
        <GlassCard style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ AI hiện không khả dụng{availability.message ? `: ${availability.message}` : '.'} Các từ đã
            có quan hệ lưu trong hệ thống vẫn xem được bình thường.
          </Text>
        </GlassCard>
      ) : null}

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="vd. achieve"
          placeholderTextColor={colors.inkMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          onSubmitEditing={() => load(query)}
          returnKeyType="search"
        />
        <GlassButton title="Tìm" onPress={() => load(query)} loading={loading} style={styles.searchBtn} />
      </View>

      {loading && <LoadingState message="Đang dựng mạng từ…" />}
      {error && !loading ? <ErrorState message={error} onRetry={() => load(query)} /> : null}

      {graph && !loading ? (
        <View>
          <GlassCard style={styles.centerCard}>
            <Text style={styles.centerWord}>{graph.center.word}</Text>
            {graph.center.ipa ? <Text style={styles.ipa}>/{graph.center.ipa}/</Text> : null}
            <Text style={styles.meaning}>{graph.center.meaningVi}</Text>
            <View style={styles.centerActions}>
              <ListenButton text={graph.center.word} showLabel />
              <GlassButton
                title={saved ? 'Đã lưu ✓' : 'Thêm vào ôn tập'}
                variant="outline"
                onPress={saveCenter}
                loading={saving}
                disabled={saved}
              />
            </View>
          </GlassCard>

          {groups.map((g) => (
            <View key={g.rel}>
              <SectionTitle title={RELATION_LABELS[g.rel].label} />
              <View style={styles.relGrid}>
                {g.items.map((r, i) => (
                  <Pressable
                    key={`${r.word}-${i}`}
                    style={[styles.relChip, { borderColor: RELATION_LABELS[g.rel].color }]}
                    onPress={() => load(r.word)}
                  >
                    <Text style={[styles.relWord, { color: RELATION_LABELS[g.rel].color }]}>{r.word}</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.inkMuted} />
                  </Pressable>
                ))}
              </View>
              {g.items[0]?.example ? (
                <Text style={styles.exampleHint}>VD: “{g.items[0].example}”</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  sub: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md },
  warn: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' },
  warnText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  search: {
    flex: 1,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  searchBtn: { minWidth: 80 },
  centerCard: { alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  centerWord: { fontSize: 32, fontWeight: '800', color: colors.primary },
  ipa: { fontSize: 15, color: colors.inkMuted, marginTop: 4 },
  meaning: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 6 },
  centerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.sm },
  relGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  relWord: { fontSize: 15, fontWeight: '700' },
  exampleHint: { fontSize: 12, color: colors.inkMuted, fontStyle: 'italic', marginTop: 6 },
});
