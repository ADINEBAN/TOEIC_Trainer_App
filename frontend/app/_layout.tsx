import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/src/context/AuthContext';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(ai)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="word/[id]" />
        <Stack.Screen name="grammar" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="notebook" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}
