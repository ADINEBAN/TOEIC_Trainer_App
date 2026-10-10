import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ListenButton } from '@/src/components/ui/ListenButton';
import { colors, radius, spacing } from '@/src/theme';
import type { SrsRating, Word } from '@/src/types';

const RATINGS: { key: SrsRating; label: string; color: string }[] = [
  { key: 'again', label: 'Chưa nhớ', color: '#DC2626' },
  { key: 'hard', label: 'Khó', color: '#F59E0B' },
  { key: 'good', label: 'Nhớ', color: '#16A34A' },
  { key: 'easy', label: 'Dễ', color: '#1D7FE0' },
];

export function FlashcardView({
  word,
  onRate,
  disabled = false,
}: {
  word: Word;
  onRate: (rating: SrsRating) => void;
  disabled?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <View>
      <Pressable onPress={() => setFlipped((f) => !f)}>
        <GlassCard style={styles.card}>
          {!flipped ? (
            <View style={styles.face}>
              <Text style={styles.word}>{word.word}</Text>
              {word.ipa ? <Text style={styles.ipa}>/{word.ipa}/</Text> : null}
              <View style={styles.listenRow}>
                <ListenButton text={word.word} showLabel />
              </View>
              <Text style={styles.flipHint}>Chạm để lật thẻ</Text>
            </View>
          ) : (
            <View style={styles.face}>
              <Text style={styles.meaning}>{word.meaningVi}</Text>
              {word.meaningEn ? <Text style={styles.meaningEn}>{word.meaningEn}</Text> : null}
              {word.exampleEn ? (
                <View style={styles.example}>
                  <Text style={styles.exampleEn}>{word.exampleEn}</Text>
                  {word.exampleVi ? <Text style={styles.exampleVi}>{word.exampleVi}</Text> : null}
                  <ListenButton text={word.exampleEn} showLabel size={18} />
                </View>
              ) : null}
            </View>
          )}
        </GlassCard>
      </Pressable>

      <View style={styles.ratings}>
        {RATINGS.map((r) => (
          <Pressable
            key={r.key}
            disabled={disabled || !flipped}
            onPress={() => {
              onRate(r.key);
              setFlipped(false);
            }}
            style={[styles.rateBtn, { borderColor: r.color }, (!flipped || disabled) && styles.rateDisabled]}
          >
            <Text style={[styles.rateLabel, { color: r.color }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      {!flipped ? (
        <Text style={styles.rateHint}>
          <Ionicons name="information-circle-outline" size={13} color={colors.inkMuted} /> Lật thẻ rồi tự đánh
          giá mức độ nhớ
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 300, justifyContent: 'center' },
  face: { alignItems: 'center', paddingVertical: spacing.lg },
  word: { fontSize: 34, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  ipa: { fontSize: 16, color: colors.inkMuted, marginTop: 6 },
  listenRow: { marginTop: spacing.md },
  flipHint: { fontSize: 12, color: colors.inkMuted, marginTop: spacing.md },
  meaning: { fontSize: 24, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  meaningEn: { fontSize: 14, color: colors.inkSoft, marginTop: 6, textAlign: 'center' },
  example: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.md,
    padding: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  exampleEn: { fontSize: 15, color: colors.ink, textAlign: 'center', lineHeight: 22 },
  exampleVi: { fontSize: 13, color: colors.inkMuted, marginTop: 4, textAlign: 'center' },
  ratings: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  rateBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.glass,
  },
  rateDisabled: { opacity: 0.4 },
  rateLabel: { fontWeight: '800', fontSize: 14 },
  rateHint: { textAlign: 'center', fontSize: 12, color: colors.inkMuted, marginTop: spacing.sm },
});
