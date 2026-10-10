import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing } from '@/src/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải từ 6 ký tự trở lên.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại chưa khớp.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(name, email, password);
      router.replace('/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Tạo tài khoản</Text>
      <Text style={styles.subtitle}>Bắt đầu hành trình chinh phục TOEIC</Text>

      <GlassCard>
        <GlassInput label="Tên hiển thị" value={name} onChangeText={setName} placeholder="Tên của bạn" />
        <GlassInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="ban@example.com"
        />
        <GlassInput
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Tối thiểu 6 ký tự"
        />
        <GlassInput
          label="Nhập lại mật khẩu"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <GlassButton title="Đăng ký" onPress={onRegister} loading={loading} style={styles.cta} />
      </GlassCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Đã có tài khoản? </Text>
        <Link href="/(auth)/login" style={styles.linkStrong}>
          Đăng nhập
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: spacing.xl },
  subtitle: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md, marginTop: 4 },
  cta: { marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.inkSoft, fontSize: 14 },
  linkStrong: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
