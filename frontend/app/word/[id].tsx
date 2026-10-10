import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { ListenButton } from '@/src/components/ui/ListenButton';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { SectionTitle } from '@/src/components/ui/Section';
import { vocabService } from '@/src/services/vocab.service';
import { colors, spacing } from '@/src/theme';
import type { CustomWordPayload, Word } from '@/src/types';

export default function WordDetailScreen() {
  const { id, custom } = useLocalSearchParams<{ id: string; custom?: string }>();
  const isCustom = custom === '1';
  const [word, setWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CustomWordPayload>({ word: '', meaningVi: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const w = await vocabService.detail(id, isCustom);
      setWord(w);
      setForm({
        word: w.word,
        ipa: w.ipa ?? '',
        meaningVi: w.meaningVi,
        meaningEn: w.meaningEn ?? '',
        exampleEn: w.exampleEn ?? '',
        exampleVi: w.exampleVi ?? '',
        topic: w.topic ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được chi tiết từ.');
    } finally {
      setLoading(false);
    }
  }, [id, isCustom]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEdit = async () => {
    if (!id || !form.word.trim() || !form.meaningVi.trim()) {
      setFormError('Nhập từ và nghĩa tiếng Việt.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await vocabService.updateCustom(id, form);
      setWord(updated);
      setEditing(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Xoá từ', `Xoá "${word?.word}" khỏi từ của bạn?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await vocabService.deleteCustom(id!);
            router.back();
          } catch (e) {
            Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không xoá được từ.');
          }
        },
      },
    ]);

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Đang tải chi tiết từ…" />
      </Screen>
    );
  }

  if (error || !word) {
    return (
      <Screen>
        <ErrorState message={error ?? 'Không có dữ liệu.'} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <GlassCard>
        <View style={styles.headRow}>
          <View style={styles.headMain}>
            <Text style={styles.word}>{word.word}</Text>
            {word.ipa ? <Text style={styles.ipa}>/{word.ipa}/</Text> : null}
          </View>
          <ListenButton text={word.exampleEn ? `${word.word}. ${word.exampleEn}` : word.word} showLabel size={24} />
        </View>
        {word.topic ? <Text style={styles.topic}>{word.topic}</Text> : null}
        {isCustom ? <Text style={styles.customTag}>Từ của bạn</Text> : null}
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Nghĩa" />
        <Text style={styles.meaning}>{word.meaningVi}</Text>
        {word.meaningEn ? <Text style={styles.meaningEn}>{word.meaningEn}</Text> : null}
      </GlassCard>

      {word.exampleEn ? (
        <GlassCard>
          <SectionTitle title="Ví dụ" />
          <Text style={styles.exampleEn}>{word.exampleEn}</Text>
          {word.exampleVi ? <Text style={styles.exampleVi}>{word.exampleVi}</Text> : null}
          <ListenButton text={word.exampleEn} showLabel size={20} />
        </GlassCard>
      ) : null}

      <GlassButton
        title="Xem mạng ngữ nghĩa 🕸️"
        variant="outline"
        onPress={() => router.push(`/(ai)/semantic?word=${encodeURIComponent(word.word)}` as never)}
        style={styles.cta}
      />

      {isCustom ? (
        <View style={styles.customActions}>
          <GlassButton title="Sửa" variant="outline" onPress={() => setEditing(true)} />
          <GlassButton title="Xoá" variant="danger" onPress={confirmDelete} />
        </View>
      ) : null}

      <Modal visible={editing} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Sửa từ của bạn</Text>
            <GlassInput label="Từ *" value={form.word} onChangeText={(v) => setForm((f) => ({ ...f, word: v }))} autoCapitalize="none" />
            <GlassInput label="IPA" value={form.ipa ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, ipa: v }))} />
            <GlassInput label="Nghĩa tiếng Việt *" value={form.meaningVi} onChangeText={(v) => setForm((f) => ({ ...f, meaningVi: v }))} />
            <GlassInput label="Ví dụ tiếng Anh" value={form.exampleEn ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, exampleEn: v }))} />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <GlassButton title="Huỷ" variant="ghost" onPress={() => setEditing(false)} />
              <GlassButton title="Lưu" onPress={saveEdit} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headMain: { flex: 1 },
  word: { fontSize: 30, fontWeight: '800', color: colors.ink },
  ipa: { fontSize: 16, color: colors.inkMuted, marginTop: 4 },
  topic: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  customTag: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  meaning: { fontSize: 18, fontWeight: '700', color: colors.ink, lineHeight: 26 },
  meaningEn: { fontSize: 14, color: colors.inkSoft, marginTop: 6, lineHeight: 21 },
  exampleEn: { fontSize: 15, color: colors.ink, lineHeight: 23 },
  exampleVi: { fontSize: 13, color: colors.inkMuted, marginTop: 4, lineHeight: 19 },
  cta: { marginTop: spacing.sm },
  customActions: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(18,50,79,0.35)', justifyContent: 'flex-end' },
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
