import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ProgressBar } from '@/src/components/ui/Progress';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/ui/States';
import { FlashcardView } from '@/src/components/vocab/FlashcardView';
import { vocabService } from '@/src/services/vocab.service';
import { colors, spacing } from '@/src/theme';
import type { SrsRating, Word } from '@/src/types';

const SESSION_SIZE = 20;

export default function FlashcardsScreen() {
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const due = await vocabService.dueFlashcards(SESSION_SIZE);
      setQueue(due);
      setIndex(0);
      setReviewed(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được flashcard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRate = async (ratingValue: SrsRating) => {
    const word = queue[index];
    if (!word || rating) return;
    setRating(true);
    try {
      await vocabService.review({
        wordId: word.custom ? undefined : word.id,
        customWordId: word.custom ? word.id : undefined,
        rating: ratingValue,
      });
    } catch {
      // Vẫn cho đi tiếp kể cả khi lưu tiến độ lỗi (offline): không chặn buổi học.
    } finally {
      setRating(false);
    }
    const nextReviewed = reviewed + 1;
    setReviewed(nextReviewed);
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Đang chuẩn bị thẻ…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  if (queue.length === 0 || done) {
    return (
      <Screen>
        <Text style={styles.title}>Flashcard</Text>
        {done ? (
          <GlassCard style={styles.doneCard}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>Xong buổi ôn!</Text>
            <Text style={styles.doneText}>Bạn đã ôn {reviewed} thẻ. Lịch ôn tiếp theo đã được lưu.</Text>
            <GlassButton title="Ôn tiếp" onPress={load} style={styles.cta} />
          </GlassCard>
        ) : (
          <EmptyState icon="checkmark-done-outline" message="Hôm nay không còn thẻ nào đến hạn. Quay lại sau nhé!" />
        )}
      </Screen>
    );
  }

  const word = queue[index];

  return (
    <Screen>
      <Text style={styles.title}>Flashcard</Text>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          Thẻ {index + 1}/{queue.length}
        </Text>
        <ProgressBar value={(index + 1) / queue.length} style={styles.progress} />
      </View>
      <FlashcardView word={word} onRate={onRate} disabled={rating} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.sm },
  progressRow: { marginBottom: spacing.md },
  progressText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600', marginBottom: 6 },
  progress: {},
  doneCard: { alignItems: 'center', marginTop: spacing.lg },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  doneText: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  cta: { marginTop: spacing.md, minWidth: 160 },
});
