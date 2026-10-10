import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Reuse pattern from the previous TOEIC_Trainer repo:
// EXPO_PUBLIC_API_BASE_URL wins; otherwise auto-detect the Expo dev host
// so a phone on the same Wi-Fi can reach the backend on this machine.
const DEFAULT_PORT = '8080';
const ANDROID_EMULATOR_URL = `http://10.0.2.2:${DEFAULT_PORT}`;
const LOCALHOST_URL = `http://localhost:${DEFAULT_PORT}`;

function extractHost(uri?: string | null) {
  if (!uri) return null;
  try {
    const normalized = uri.includes('://') ? uri : `http://${uri}`;
    return new URL(normalized).hostname;
  } catch {
    return null;
  }
}

function getExpoHost() {
  return (
    extractHost(Constants.expoConfig?.hostUri) ??
    extractHost(Constants.linkingUri)
  );
}

function getDefaultBaseUrl() {
  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:${DEFAULT_PORT}`;
  return Platform.OS === 'android' ? ANDROID_EMULATOR_URL : LOCALHOST_URL;
}

function normalizeBaseUrl(raw: string) {
  return raw.trim().replace(/\/+$/, '');
}

const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = normalizeBaseUrl(
  configured && configured.length > 0 ? configured : getDefaultBaseUrl()
);

// The backend serves audio bytes from this path: GET /api/tts?text=...&voice=george
export const TTS_VOICE = 'george';
