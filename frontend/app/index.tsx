import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Screen } from '@/src/components/ui/Screen';
import { LoadingState } from '@/src/components/ui/States';

export default function BootScreen() {
  const { user, loading, onboarded } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/(auth)/login');
    else if (!onboarded) router.replace('/onboarding');
    else router.replace('/(tabs)');
  }, [user, loading, onboarded]);

  return (
    <Screen scroll={false}>
      <LoadingState message="TOEIC Trainer…" />
    </Screen>
  );
}
