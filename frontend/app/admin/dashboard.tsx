import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { SectionTitle, StatTile } from '@/src/components/ui/Section';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { adminService } from '@/src/services/admin.service';
import { getAdminToken, setAdminToken } from '@/src/services/storage';
import { colors, spacing } from '@/src/theme';
import type { AdminOverview, GrammarLesson, Question, Word } from '@/src/types';

type Tab = 'overview' | 'questions' | 'words' | 'grammar';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'questions', label: 'Câu hỏi' },
  { key: 'words', label: 'Từ vựng' },
  { key: 'grammar', label: 'Ngữ pháp' },
];

const emptyQuestion: Partial<Question> = { part: 5, prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' };
const emptyWord: Partial<Word> = { word: '', ipa: '', meaningVi: '', meaningEn: '', exampleEn: '', exampleVi: '', topic: '', level: '' };
const emptyLesson: Partial<GrammarLesson> & { content?: string } = { title: '', summary: '', level: '', content: '' };

export default function AdminDashboardScreen() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [lessons, setLessons] = useState<GrammarLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qPage, setQPage] = useState(0);
  const [qTotalPages, setQTotalPages] = useState(1);
  const [wPage, setWPage] = useState(0);
  const [wTotalPages, setWTotalPages] = useState(1);
  const [editingQ, setEditingQ] = useState<Partial<Question> | null>(null);
  const [editingW, setEditingW] = useState<Partial<Word> | null>(null);
  const [editingL, setEditingL] = useState<(Partial<GrammarLesson> & { content?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getAdminToken().then((t) => {
      if (!t) router.replace('/admin' as never);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'overview') {
        setOverview(await adminService.overview());
      } else if (tab === 'questions') {
        const p = await adminService.listQuestions(qPage);
        setQuestions(p.items);
        setQTotalPages(p.totalPages);
      } else if (tab === 'words') {
        const p = await adminService.listWords(wPage);
        setWords(p.items);
        setWTotalPages(p.totalPages);
      } else {
        setLessons(await adminService.listLessons());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [tab, qPage, wPage]);

  useEffect(() => {
    load();
  }, [load]);

  const logoutAdmin = async () => {
    await setAdminToken(null);
    router.replace('/admin' as never);
  };

  const confirmDelete = (kind: string, id: string, action: () => Promise<void>) =>
    Alert.alert('Xoá', `Xoá ${kind} này?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await action();
            load();
          } catch (e) {
            Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không xoá được.');
          }
        },
      },
    ]);

  const saveQuestion = async () => {
    if (!editingQ?.prompt?.trim() || !editingQ.options?.filter((o) => o.trim()).length) {
      setFormError('Nhập đề bài và ít nhất 1 đáp án.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await adminService.upsertQuestion(editingQ);
      setEditingQ(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  };

  const saveWord = async () => {
    if (!editingW?.word?.trim() || !editingW.meaningVi?.trim()) {
      setFormError('Nhập từ và nghĩa tiếng Việt.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await adminService.upsertWord(editingW);
      setEditingW(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  };

  const saveLesson = async () => {
    if (!editingL?.title?.trim()) {
      setFormError('Nhập tiêu đề bài học.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await adminService.upsertLesson(editingL);
      setEditingL(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  };

  const renderModal = (title: string, content: React.ReactNode, onSave: () => void, onClose: () => void) => (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{title}</Text>
            {content}
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <GlassButton title="Huỷ" variant="ghost" onPress={onClose} />
              <GlassButton title="Lưu" onPress={onSave} loading={saving} />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Bảng điều khiển</Text>
        <Pressable onPress={logoutAdmin} hitSlop={10}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingState message="Đang tải…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tab === 'overview' && overview ? (
        <View>
          <SectionTitle title="Tổng quan hệ thống" />
          <View style={styles.tiles}>
            <StatTile icon="people" label="Người dùng" value={overview.totalUsers} />
            <StatTile icon="help-circle" label="Câu hỏi" value={overview.totalQuestions} />
          </View>
          <View style={styles.tiles}>
            <StatTile icon="book" label="Từ vựng" value={overview.totalWords} color={colors.teal} />
            <StatTile icon="school" label="Bài ngữ pháp" value={overview.totalLessons} color={colors.teal} />
          </View>
          <View style={styles.tiles}>
            <StatTile icon="pulse" label="DAU" value={overview.dau} color={colors.orange} />
            <StatTile icon="create" label="Lượt làm hôm nay" value={overview.attemptsToday} color={colors.orange} />
          </View>
        </View>
      ) : tab === 'questions' ? (
        <View>
          <GlassButton title="＋ Thêm câu hỏi" onPress={() => { setFormError(null); setEditingQ({ ...emptyQuestion }); }} style={styles.addBtn} />
          {questions.map((q) => (
            <GlassCard key={q.id}>
              <Text style={styles.rowTitle} numberOfLines={2}>Part {q.part} — {q.prompt}</Text>
              <View style={styles.rowActions}>
                <GlassButton title="Sửa" variant="outline" onPress={() => { setFormError(null); setEditingQ({ ...q }); }} />
                <GlassButton title="Xoá" variant="danger" onPress={() => confirmDelete('câu hỏi', q.id, () => adminService.deleteQuestion(q.id))} />
              </View>
            </GlassCard>
          ))}
          <View style={styles.pager}>
            <GlassButton title="←" variant="ghost" disabled={qPage === 0} onPress={() => setQPage((p) => p - 1)} />
            <Text style={styles.pageLabel}>{qPage + 1}/{qTotalPages}</Text>
            <GlassButton title="→" variant="ghost" disabled={qPage + 1 >= qTotalPages} onPress={() => setQPage((p) => p + 1)} />
          </View>
        </View>
      ) : tab === 'words' ? (
        <View>
          <GlassButton title="＋ Thêm từ" onPress={() => { setFormError(null); setEditingW({ ...emptyWord }); }} style={styles.addBtn} />
          {words.map((w) => (
            <GlassCard key={w.id}>
              <Text style={styles.rowTitle}>{w.word} <Text style={styles.rowSub}>— {w.meaningVi}</Text></Text>
              <View style={styles.rowActions}>
                <GlassButton title="Sửa" variant="outline" onPress={() => { setFormError(null); setEditingW({ ...w }); }} />
                <GlassButton title="Xoá" variant="danger" onPress={() => confirmDelete('từ', w.id, () => adminService.deleteWord(w.id))} />
              </View>
            </GlassCard>
          ))}
          <View style={styles.pager}>
            <GlassButton title="←" variant="ghost" disabled={wPage === 0} onPress={() => setWPage((p) => p - 1)} />
            <Text style={styles.pageLabel}>{wPage + 1}/{wTotalPages}</Text>
            <GlassButton title="→" variant="ghost" disabled={wPage + 1 >= wTotalPages} onPress={() => setWPage((p) => p + 1)} />
          </View>
        </View>
      ) : (
        <View>
          <GlassButton title="＋ Thêm bài ngữ pháp" onPress={() => { setFormError(null); setEditingL({ ...emptyLesson }); }} style={styles.addBtn} />
          {lessons.map((l) => (
            <GlassCard key={l.id}>
              <Text style={styles.rowTitle}>{l.title}</Text>
              <Text style={styles.rowSub} numberOfLines={2}>{l.summary}</Text>
              <View style={styles.rowActions}>
                <GlassButton title="Sửa" variant="outline" onPress={() => { setFormError(null); setEditingL({ ...l }); }} />
                <GlassButton title="Xoá" variant="danger" onPress={() => confirmDelete('bài học', l.id, () => adminService.deleteLesson(l.id))} />
              </View>
            </GlassCard>
          ))}
        </View>
      )}

      {editingQ
        ? renderModal(
            editingQ.id ? 'Sửa câu hỏi' : 'Thêm câu hỏi',
            <View>
              <GlassInput label="Part (1–7)" value={String(editingQ.part ?? 5)} onChangeText={(v) => setEditingQ((f) => f && ({ ...f, part: Number(v) || 5 }))} keyboardType="number-pad" />
              <GlassInput label="Đề bài" value={editingQ.prompt ?? ''} onChangeText={(v) => setEditingQ((f) => f && ({ ...f, prompt: v }))} multiline />
              <GlassInput label="Các đáp án (mỗi dòng một đáp án)" value={(editingQ.options ?? []).join('\n')} onChangeText={(v) => setEditingQ((f) => f && ({ ...f, options: v.split('\n') }))} multiline />
              <GlassInput label="Đáp án đúng (số thứ tự, bắt đầu từ 0)" value={String(editingQ.correctIndex ?? 0)} onChangeText={(v) => setEditingQ((f) => f && ({ ...f, correctIndex: Number(v) || 0 }))} keyboardType="number-pad" />
              <GlassInput label="Giải thích" value={editingQ.explanation ?? ''} onChangeText={(v) => setEditingQ((f) => f && ({ ...f, explanation: v }))} multiline />
            </View>,
            saveQuestion,
            () => setEditingQ(null)
          )
        : null}

      {editingW
        ? renderModal(
            editingW.id ? 'Sửa từ' : 'Thêm từ',
            <View>
              <GlassInput label="Từ *" value={editingW.word ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, word: v }))} autoCapitalize="none" />
              <GlassInput label="IPA" value={editingW.ipa ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, ipa: v }))} />
              <GlassInput label="Nghĩa tiếng Việt *" value={editingW.meaningVi ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, meaningVi: v }))} />
              <GlassInput label="Định nghĩa tiếng Anh" value={editingW.meaningEn ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, meaningEn: v }))} multiline />
              <GlassInput label="Ví dụ tiếng Anh" value={editingW.exampleEn ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, exampleEn: v }))} multiline />
              <GlassInput label="Ví dụ tiếng Việt" value={editingW.exampleVi ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, exampleVi: v }))} multiline />
              <GlassInput label="Chủ đề" value={editingW.topic ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, topic: v }))} />
              <GlassInput label="Cấp độ" value={editingW.level ?? ''} onChangeText={(v) => setEditingW((f) => f && ({ ...f, level: v }))} />
            </View>,
            saveWord,
            () => setEditingW(null)
          )
        : null}

      {editingL
        ? renderModal(
            editingL.id ? 'Sửa bài ngữ pháp' : 'Thêm bài ngữ pháp',
            <View>
              <GlassInput label="Tiêu đề *" value={editingL.title ?? ''} onChangeText={(v) => setEditingL((f) => f && ({ ...f, title: v }))} />
              <GlassInput label="Tóm tắt" value={editingL.summary ?? ''} onChangeText={(v) => setEditingL((f) => f && ({ ...f, summary: v }))} multiline />
              <GlassInput label="Cấp độ" value={editingL.level ?? ''} onChangeText={(v) => setEditingL((f) => f && ({ ...f, level: v }))} />
              <GlassInput label="Nội dung bài học" value={editingL.content ?? ''} onChangeText={(v) => setEditingL((f) => f && ({ ...f, content: v }))} multiline />
            </View>,
            saveLesson,
            () => setEditingL(null)
          )
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  tabs: { marginTop: spacing.sm, maxHeight: 44 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginRight: 8,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
  tabLabelActive: { color: colors.white },
  tiles: { flexDirection: 'row', marginHorizontal: -4, marginBottom: spacing.sm },
  addBtn: { marginTop: spacing.sm, marginBottom: spacing.sm },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowSub: { fontWeight: '400', color: colors.inkSoft, fontSize: 13 },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: spacing.md },
  pageLabel: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(18,50,79,0.35)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.sky,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
});
