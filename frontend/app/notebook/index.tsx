import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/Section';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/ui/States';
import { WordCard } from '@/src/components/vocab/WordCard';
import { QuestionCard } from '@/src/components/practice/QuestionCard';
import { vocabService } from '@/src/services/vocab.service';
import { colors, spacing } from '@/src/theme';
import type { Notebook } from '@/src/types';

export default function NotebookScreen() {
  const [data, setData] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await vocabService.notebook());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được sổ tay.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Text style={styles.title}>Sổ tay</Text>

      {loading ? (
        <LoadingState message="Đang tải sổ tay…" />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Không có dữ liệu.'} onRetry={load} />
      ) : (
        <View>
          <SectionTitle title={`Từ đã lưu (${data.savedWords.length})`} />
          {data.savedWords.length === 0 ? (
            <EmptyState icon="bookmark-outline" message="Chưa lưu từ nào." />
          ) : (
            data.savedWords.map((w) => (
              <WordCard
                key={w.id}
                word={w}
                onPress={() => router.push(`/word/${w.id}?custom=${w.custom ? '1' : '0'}` as never)}
              />
            ))
          )}

          <SectionTitle title={`Câu đã bookmark (${data.bookmarks.length})`} />
          {data.bookmarks.length === 0 ? (
            <EmptyState icon="flag-outline" message="Chưa bookmark câu nào." />
          ) : (
            data.bookmarks.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                selected={null}
                onSelect={() => undefined}
                showAnswer
                locked
              />
            ))
          )}

          <SectionTitle title={`Lỗi sai cần ôn (${data.mistakes.length})`} />
          {data.mistakes.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" message="Chưa có lỗi sai nào." />
          ) : (
            data.mistakes.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                selected={null}
                onSelect={() => undefined}
                showAnswer
                locked
              />
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
});
