import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { authService } from '@/src/services/auth.service';
import { colors, spacing } from '@/src/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res.message || 'Đã gửi link đặt lại mật khẩu. Kiểm tra hộp thư của bạn.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi yêu cầu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Quên mật khẩu</Text>
      <Text style={styles.subtitle}>Nhập email đăng ký, hệ thống sẽ gửi link đặt lại có thời hạn.</Text>
      <GlassCard>
        <GlassInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="ban@example.com"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <GlassButton title="Gửi link đặt lại" onPress={onSubmit} loading={loading} style={styles.cta} />
        <Link href="/(auth)/login" style={styles.link}>
          Quay lại đăng nhập
        </Link>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: spacing.xl },
  subtitle: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md, marginTop: 4, lineHeight: 20 },
  cta: { marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  success: { color: colors.success, fontSize: 13, marginTop: spacing.sm, lineHeight: 19 },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.sm, fontSize: 14 },
});
