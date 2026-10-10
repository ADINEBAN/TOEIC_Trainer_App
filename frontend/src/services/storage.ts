import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'toeic_trainer_jwt';
const USER_KEY = 'toeic_trainer_user';
const ONBOARDED_KEY = 'toeic_trainer_onboarded';
const ADMIN_TOKEN_KEY = 'toeic_trainer_admin_jwt';
// Optional user-supplied Speechify key (on-device only). The backend key is
// the default path; this is a labeled fallback, never a shared secret.
const OWN_SPEECHIFY_KEY = 'toeic_trainer_own_speechify_key';

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage failures are non-fatal
  }
}

export async function getStoredUser(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export async function setStoredUser(json: string | null): Promise<void> {
  try {
    if (json) await AsyncStorage.setItem(USER_KEY, json);
    else await AsyncStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export async function isOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // ignore
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch {
    // ignore
  }
}

export async function getAdminToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAdminToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(ADMIN_TOKEN_KEY, token);
    else await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function getOwnSpeechifyKey(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(OWN_SPEECHIFY_KEY);
    const key = v?.trim();
    return key ? key : null;
  } catch {
    return null;
  }
}

export async function setOwnSpeechifyKey(key: string | null): Promise<void> {
  try {
    if (key && key.trim()) await AsyncStorage.setItem(OWN_SPEECHIFY_KEY, key.trim());
    else await AsyncStorage.removeItem(OWN_SPEECHIFY_KEY);
  } catch {
    // ignore
  }
}
