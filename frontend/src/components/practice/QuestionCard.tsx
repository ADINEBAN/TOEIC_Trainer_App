import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ListenButton } from '@/src/components/ui/ListenButton';
import { playLocalAudio, stopTts } from '@/src/services/tts.service';
import { colors, radius, spacing } from '@/src/theme';
import type { Question } from '@/src/types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Plays the listening audio attached to a question (Part 1–4).
function QuestionAudioButton({ uri }: { uri: string }) {
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    if (playing) {
      await stopTts().catch(() => undefined);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    try {
      await playLocalAudio(uri, {
        onDone: () => setPlaying(false),
        onError: () => setPlaying(false),
      });
    } catch {
      setPlaying(false);
    }
  };

  return (
    <Pressable onPress={toggle} style={styles.audioBtn}>
      <Ionicons name={playing ? 'stop-circle' : 'play-circle'} size={34} color={colors.primary} />
      <Text style={styles.audioLabel}>{playing ? 'Đang phát… chạm để dừng' : 'Nghe đoạn audio'}</Text>
    </Pressable>
  );
}

interface QuestionCardProps {
  question: Question;
  index: number;
  selected: number | null;
  onSelect: (optionIndex: number) => void;
  showAnswer?: boolean;
  flagged?: boolean;
  onToggleFlag?: () => void;
  locked?: boolean;
}

export function QuestionCard({
  question,
  index,
  selected,
  onSelect,
  showAnswer = false,
  flagged = false,
  onToggleFlag,
  locked = false,
}: QuestionCardProps) {
  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <Text style={styles.qIndex}>Câu {index + 1}</Text>
        <View style={styles.headerActions}>
          <Text style={styles.part}>Part {question.part}</Text>
          {onToggleFlag ? (
            <Pressable onPress={onToggleFlag} hitSlop={10} style={styles.flagBtn}>
              <Ionicons
                name={flagged ? 'flag' : 'flag-outline'}
                size={18}
                color={flagged ? colors.orange : colors.inkMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {question.imageUrl ? (
        <Image source={{ uri: question.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      <Text style={styles.prompt}>{question.prompt}</Text>

      {question.audioUrl ? <QuestionAudioButton uri={question.audioUrl} /> : null}

      <View style={styles.options}>
        {question.options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = showAnswer && i === question.correctIndex;
          const isWrong = showAnswer && isSelected && i !== question.correctIndex;
          return (
            <Pressable
              key={i}
              disabled={locked}
              onPress={() => onSelect(i)}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                isCorrect && styles.optionCorrect,
                isWrong && styles.optionWrong,
              ]}
            >
              <View
                style={[
                  styles.letter,
                  isSelected && styles.letterSelected,
                  isCorrect && styles.letterCorrect,
                  isWrong && styles.letterWrong,
                ]}
              >
                <Text
                  style={[
                    styles.letterText,
                    (isSelected || isCorrect || isWrong) && styles.letterTextOn,
                  ]}
                >
                  {LETTERS[i] ?? i + 1}
                </Text>
              </View>
              <Text style={styles.optionText}>{option}</Text>
              {isCorrect ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : null}
              {isWrong ? <Ionicons name="close-circle" size={20} color={colors.danger} /> : null}
            </Pressable>
          );
        })}
      </View>

      {showAnswer && question.explanation ? (
        <View style={styles.explain}>
          <Text style={styles.explainTitle}>Giải thích</Text>
          <Text style={styles.explainText}>{question.explanation}</Text>
        </View>
      ) : null}

      {showAnswer && question.prompt ? (
        <View style={styles.listenRow}>
          <ListenButton text={question.prompt} showLabel size={20} />
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qIndex: { fontSize: 15, fontWeight: '800', color: colors.ink },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  part: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  flagBtn: { padding: 4 },
  image: { width: '100%', height: 180, borderRadius: radius.md, marginTop: spacing.sm },
  prompt: { fontSize: 15, color: colors.ink, lineHeight: 22, marginTop: spacing.sm },
  audioBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  audioLabel: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  options: { marginTop: spacing.sm, gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(18,50,79,0.12)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionCorrect: { borderColor: colors.success, backgroundColor: 'rgba(22,163,74,0.10)' },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(18,50,79,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterSelected: { backgroundColor: colors.primary },
  letterCorrect: { backgroundColor: colors.success },
  letterWrong: { backgroundColor: colors.danger },
  letterText: { fontWeight: '800', color: colors.inkSoft, fontSize: 13 },
  letterTextOn: { color: colors.white },
  optionText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 },
  explain: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(18,181,165,0.10)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  explainTitle: { fontSize: 13, fontWeight: '800', color: colors.teal, marginBottom: 4 },
  explainText: { fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  listenRow: { marginTop: spacing.sm },
});
