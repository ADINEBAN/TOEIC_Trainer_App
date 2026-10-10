import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { Chip } from '@/src/components/ui/Chip';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/ui/States';
import { WordCard } from '@/src/components/vocab/WordCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { vocabService } from '@/src/services/vocab.service';
import { colors, radius, spacing } from '@/src/theme';
import type { CustomWordPayload, Word } from '@/src/types';

const PAGE_SIZE = 20;

export default function VocabScreen() {
  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CustomWordPayload>({ word: '', meaningVi: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPage = useCallback(
    async (pageNum: number, q: string, t: string | null, append: boolean) => {
      if (pageNum === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await vocabService.list({
          search: q || undefined,
          topic: t ?? undefined,
          page: pageNum,
          size: PAGE_SIZE,
        });
        setWords((w) => (append ? [...w, ...res.items] : res.items));
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (e) {
        if (pageNum === 0) setError(e instanceof Error ? e.message : 'Không tải được từ vựng.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    vocabService.topics().then(setTopics).catch(() => undefined);
    vocabService.notebook().then((n) => setSavedIds(new Set(n.savedWords.map((w) => w.id)))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => loadPage(0, search, topic, false), 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search, topic, loadPage]);

  const toggleSave = async (word: Word) => {
    try {
      if (savedIds.has(word.id)) {
        await vocabService.unsaveWord(word.id, !!word.custom);
        setSavedIds((s) => {
          const next = new Set(s);
          next.delete(word.id);
          return next;
        });
      } else {
        await vocabService.saveWord(word.id, !!word.custom);
        setSavedIds((s) => new Set(s).add(word.id));
      }
    } catch {
      // non-blocking
    }
  };

  const submitCustomWord = async () => {
    if (!form.word.trim() || !form.meaningVi.trim()) {
      setFormError('Nhập từ và nghĩa tiếng Việt.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await vocabService.addCustom(form);
      setWords((w) => [created, ...w]);
      setModalVisible(false);
      setForm({ word: '', meaningVi: '' });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Không thêm được từ.');
    } finally {
      setSaving(false);
    }
  };

  const openWord = (word: Word) =>
    router.push(`/word/${word.id}?custom=${word.custom ? '1' : '0'}` as never);

  return (
    <Screen padded={false} scroll={false}>
      <FlatList
        data={words}
        keyExtractor={(w) => `${w.custom ? 'c' : 's'}-${w.id}`}
        contentContainerStyle={styles.list}
        style={styles.flatList}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Từ vựng</Text>
              <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={22} color={colors.white} />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.inkMuted} />
              <TextInput
                style={styles.search}
                placeholder="Tìm từ…"
                placeholderTextColor={colors.inkMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicRow}>
              <Chip label="Tất cả" selected={topic === null} onPress={() => setTopic(null)} />
              {topics.map((t) => (
                <Chip key={t} label={t} selected={topic === t} onPress={() => setTopic(t === topic ? null : t)} />
              ))}
            </ScrollView>
            <SectionTitle title={topic ? `Chủ đề: ${topic}` : 'Tất cả từ'} />
          </View>
        }
        renderItem={({ item }) => (
          <WordCard
            word={item}
            onPress={() => openWord(item)}
            onToggleSave={() => toggleSave(item)}
            saved={savedIds.has(item.id)}
          />
        )}
        onEndReached={() => {
          if (!loadingMore && page + 1 < totalPages) loadPage(page + 1, search, topic, true);
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Đang tải từ vựng…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadPage(0, search, topic, false)} />
          ) : (
            <EmptyState message="Chưa có từ nào. Thử đổi từ khoá tìm kiếm." />
          )
        }
        ListFooterComponent={loadingMore ? <LoadingState message="Đang tải thêm…" /> : null}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Thêm từ của tôi</Text>
            <GlassInput label="Từ *" value={form.word} onChangeText={(v) => setForm((f) => ({ ...f, word: v }))} placeholder="vd. negotiate" autoCapitalize="none" />
            <GlassInput label="Phiên âm IPA" value={form.ipa ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, ipa: v }))} placeholder="vd. nɪˈɡoʊʃieɪt" />
            <GlassInput label="Nghĩa tiếng Việt *" value={form.meaningVi} onChangeText={(v) => setForm((f) => ({ ...f, meaningVi: v }))} placeholder="vd. đàm phán" />
            <GlassInput label="Ví dụ tiếng Anh" value={form.exampleEn ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, exampleEn: v }))} placeholder="vd. They negotiated a deal." />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <GlassButton title="Huỷ" variant="ghost" onPress={() => setModalVisible(false)} />
              <GlassButton title="Lưu từ" onPress={submitCustomWord} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  search: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.ink },
  topicRow: { marginTop: spacing.sm, paddingHorizontal: spacing.md, maxHeight: 44 },
  flatList: { flex: 1 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,50,79,0.35)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.sky,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
});
