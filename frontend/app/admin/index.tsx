import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { adminService } from '@/src/services/admin.service';
import { setAdminToken } from '@/src/services/storage';
import { colors, spacing } from '@/src/theme';

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      setError('Nhập email và mật khẩu quản trị.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.login(email, password);
      if (res.user.role !== 'ADMIN') {
        setError('Tài khoản này không có quyền quản trị.');
        return;
      }
      await setAdminToken(res.token);
      router.replace('/admin/dashboard' as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập quản trị thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Quản trị 🛡️</Text>
      <Text style={styles.sub}>Khu vực dành cho tài khoản có quyền ADMIN. Giao diện web giữ khung tối đa 430px.</Text>
      <GlassCard>
        <GlassInput
          label="Email quản trị"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="admin@example.com"
        />
        <GlassInput
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <GlassButton title="Đăng nhập quản trị" onPress={onLogin} loading={loading} style={styles.cta} />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: spacing.xl },
  sub: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md, marginTop: 4, lineHeight: 20 },
  cta: { marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
});
