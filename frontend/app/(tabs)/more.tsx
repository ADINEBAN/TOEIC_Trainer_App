import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SectionTitle } from '@/src/components/ui/Section';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing } from '@/src/theme';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  color: string;
  onPress: () => void;
}

export default function MoreScreen() {
  const { user, logout } = useAuth();

  const confirmLogout = () =>
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);

  const aiItems: MenuItem[] = [
    { icon: 'share-social-outline', label: 'Mạng ngữ nghĩa', desc: 'Học từ theo cụm liên quan', color: colors.primary, onPress: () => router.push('/(ai)/semantic' as never) },
    { icon: 'camera-outline', label: 'Chụp ảnh học từ', desc: 'Nhận diện vật thể → tên tiếng Anh', color: colors.teal, onPress: () => router.push('/(ai)/camera' as never) },
    { icon: 'document-text-outline', label: 'Nạp tài liệu', desc: 'PDF/Word/TXT → đề + từ vựng', color: '#8B5CF6', onPress: () => router.push('/(ai)/docs' as never) },
    { icon: 'mic-outline', label: 'Speaking Coach', desc: 'Chấm phát âm 4 thành phần', color: colors.orange, onPress: () => router.push('/(ai)/speaking' as never) },
    { icon: 'headset-outline', label: 'Học rảnh tay', desc: 'Ôn bằng giọng nói', color: '#EC4899', onPress: () => router.push('/(ai)/handsfree' as never) },
  ];

  const studyItems: MenuItem[] = [
    { icon: 'bookmark-outline', label: 'Sổ tay', desc: 'Từ đã lưu, câu bookmark, lỗi sai', color: colors.primary, onPress: () => router.push('/notebook' as never) },
    { icon: 'school-outline', label: 'Ngữ pháp', desc: 'Bài học + quiz ngắn', color: colors.teal, onPress: () => router.push('/grammar' as never) },
  ];

  const accountItems: MenuItem[] = [
    { icon: 'person-outline', label: 'Hồ sơ', desc: user?.email ?? '', color: colors.inkSoft, onPress: () => router.push('/profile' as never) },
    { icon: 'shield-checkmark-outline', label: 'Quản trị', desc: 'Dành cho tài khoản ADMIN', color: colors.inkSoft, onPress: () => router.push('/admin' as never) },
    { icon: 'log-out-outline', label: 'Đăng xuất', desc: '', color: colors.danger, onPress: confirmLogout },
  ];

  const renderGroup = (title: string, items: MenuItem[]) => (
    <View>
      <SectionTitle title={title} />
      <GlassCard>
        {items.map((item, i) => (
          <Pressable
            key={item.label}
            style={[styles.row, i < items.length - 1 && styles.rowBorder]}
            onPress={item.onPress}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.color}1A` }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.rowMain}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              {item.desc ? <Text style={styles.rowDesc}>{item.desc}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
          </Pressable>
        ))}
      </GlassCard>
    </View>
  );

  return (
    <Screen>
      <Text style={styles.title}>Thêm</Text>
      {renderGroup('AI for Life', aiItems)}
      {renderGroup('Học tập', studyItems)}
      {renderGroup('Tài khoản', accountItems)}
      <Text style={styles.version}>TOEIC Trainer • v1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowDesc: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  version: { textAlign: 'center', fontSize: 11, color: colors.inkMuted, marginTop: spacing.lg },
});
