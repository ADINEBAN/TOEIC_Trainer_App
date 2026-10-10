import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing } from '@/src/theme';

export default function LoginScreen() {
  const { login, onboarded } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(onboarded ? '/(tabs)' : '/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>🎯</Text>
        <Text style={styles.title}>TOEIC Trainer</Text>
        <Text style={styles.subtitle}>Luyện TOEIC mỗi ngày, chạm mục tiêu điểm</Text>
      </View>

      <GlassCard>
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
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <GlassButton title="Đăng nhập" onPress={onLogin} loading={loading} style={styles.cta} />
        <Link href="/(auth)/forgot-password" style={styles.link}>
          Quên mật khẩu?
        </Link>
      </GlassCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Chưa có tài khoản? </Text>
        <Link href="/(auth)/register" style={styles.linkStrong}>
          Đăng ký ngay
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  logo: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  subtitle: { fontSize: 14, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
  cta: { marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.sm, fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.inkSoft, fontSize: 14 },
  linkStrong: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
