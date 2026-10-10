import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { practiceService } from '@/src/services/practice.service';
import { colors, spacing } from '@/src/theme';
import type { TestKind } from '@/src/types';

const TESTS: { kind: TestKind; name: string; desc: string; questions: string; time: string }[] = [
  { kind: 'MINI', name: 'Mini Test', desc: 'Làm quen áp lực giờ', questions: '20 câu', time: '~25 phút' },
  { kind: 'HALF', name: 'Half Test', desc: 'Nửa đề thi thật', questions: '100 câu', time: '~75 phút' },
  { kind: 'FULL', name: 'Full Test', desc: 'Đề thi TOEIC hoàn chỉnh', questions: '200 câu', time: '~120 phút' },
];

export default function TestSetupScreen() {
  const [starting, setStarting] = useState<TestKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (kind: TestKind) => {
    setStarting(kind);
    setError(null);
    try {
      const session = await practiceService.startTest(kind);
      router.push(`/practice/run?testId=${session.testId}` as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được bài thi.');
    } finally {
      setStarting(null);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Thi thử</Text>
      <Text style={styles.sub}>Chấm theo thang /495 mỗi kỹ năng, tổng /990 như thi thật.</Text>

      <SectionTitle title="Chọn đề thi" />
      {TESTS.map((t) => (
        <Pressable key={t.kind} onPress={() => start(t.kind)} disabled={starting !== null}>
          <GlassCard style={starting === t.kind ? styles.starting : undefined}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="timer-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.main}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.desc}>{t.desc}</Text>
                <Text style={styles.meta}>
                  {t.questions} • {t.time}
                </Text>
              </View>
              <Text style={styles.go}>{starting === t.kind ? '…' : 'Bắt đầu →'}</Text>
            </View>
          </GlassCard>
        </Pressable>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GlassCard>
        <Text style={styles.tipTitle}>💡 Mẹo làm bài thi thử</Text>
        <Text style={styles.tip}>
          • Đáp án tự lưu trong lúc làm — thoát app mở lại vẫn tiếp tục được.{'\n'}• Gắn cờ 🚩
          câu chưa chắc để xem lại trước khi nộp.{'\n'}• Hết giờ hệ thống tự nộp bài.
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  sub: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.sm },
  starting: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', color: colors.ink },
  desc: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  meta: { fontSize: 12, color: colors.inkMuted, marginTop: 4, fontWeight: '600' },
  go: { fontSize: 14, fontWeight: '700', color: colors.primary },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
  tipTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  tip: { fontSize: 13, color: colors.inkSoft, lineHeight: 20 },
});
