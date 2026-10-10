import { Text } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { colors } from '@/src/theme';

export default function NotFoundScreen() {
  return (
    <Screen scroll={false}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>
        Không tìm thấy trang này
      </Text>
      <Link href="/(tabs)" style={{ color: colors.primary, textAlign: 'center', marginTop: 12 }}>
        Về trang chủ
      </Link>
    </Screen>
  );
}
