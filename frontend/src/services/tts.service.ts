// Speechify George (simba-3.2) playback via the backend proxy.
// The app NEVER holds a shared API key: the backend owns the Speechify key and
// serves cached MP3 bytes at GET /api/tts?text=...&voice=george.
// Optional on-device fallback: the user may enter their OWN Speechify key in
// Profile (stored only on this device, clearly labeled there).
//
// Cache layers (per requirements doc, section 7):
//   1. in-memory (this session)
//   2. device file cache keyed by sha256(text)
//   3. server-side cache (backend serves cache hits, never re-calls Speechify)
// Status is always reported honestly so the UI can show:
//   "đang tạo giọng George" / "đang phát từ cache" / "giọng dự phòng".

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { TTS_VOICE } from '@/src/config/env';
import { aiService } from '@/src/services/ai.service';
import { getOwnSpeechifyKey, setOwnSpeechifyKey } from '@/src/services/storage';

export const SPEECHIFY_MODEL = 'simba-3.2';
export const SPEECHIFY_VOICE_ID = TTS_VOICE; // "george"
export const SPEECHIFY_VOICE_NAME = 'George';
const DIRECT_SPEECHIFY_URL = 'https://api.speechify.ai/v1/audio/speech';
const CACHE_DIR = 'toeic-tts-cache-v2';

export type TtsStatus =
  | 'idle'
  | 'creating' // đang tạo giọng George (gọi backend / Speechify)
  | 'playing-george' // phát file George vừa tạo
  | 'playing-cache' // phát từ cache (bộ nhớ / máy)
  | 'fallback' // giọng máy của thiết bị (backend không khả dụng)
  | 'error';

export interface SpeakOptions {
  voice?: string;
  disableFallback?: boolean;
  onStatus?: (status: TtsStatus) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

// --- minimal sha256 (pure JS) for cache keys ---
function sha256Hex(input: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(chunk + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, hh = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + hh) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((x) => (x >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

const memoryCache = new Map<string, string>();
const pendingByKey = new Map<string, Promise<string>>();
let activePlayer: AudioPlayer | null = null;
let playbackId = 0;

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function cacheKeyFor(text: string, voice: string) {
  return sha256Hex(`${SPEECHIFY_MODEL}|${voice}|${normalizeText(text)}`);
}

function getCacheDir(): FileSystem.Directory {
  const dir = new FileSystem.Directory(FileSystem.Paths.cache, CACHE_DIR);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

function base64ToBytes(base64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array(Math.max(0, (clean.length * 3) / 4 - padding));
  let bi = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i]);
    const b = alphabet.indexOf(clean[i + 1]);
    const c = clean[i + 2] === '=' ? 0 : alphabet.indexOf(clean[i + 2]);
    const d = clean[i + 3] === '=' ? 0 : alphabet.indexOf(clean[i + 3]);
    const v = (a << 18) | (b << 12) | (c << 6) | d;
    if (bi < bytes.length) bytes[bi++] = (v >> 16) & 0xff;
    if (bi < bytes.length) bytes[bi++] = (v >> 8) & 0xff;
    if (bi < bytes.length) bytes[bi++] = v & 0xff;
  }
  return bytes;
}

// Bytes -> base64 for data URIs on web.
function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const v = (a << 16) | (b << 8) | c;
    out += alphabet[(v >> 18) & 63] + alphabet[(v >> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(v >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? alphabet[v & 63] : '=';
  }
  return out;
}

async function fetchFromBackend(text: string, voice: string): Promise<Uint8Array> {
  const buffer = await aiService.ttsAudio(text, voice);
  return new Uint8Array(buffer);
}

type DirectSpeechifyPayload = { audio_data?: string; message?: string; error?: string };

async function fetchWithOwnKey(text: string, apiKey: string): Promise<Uint8Array> {
  const response = await fetch(DIRECT_SPEECHIFY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_format: 'mp3',
      input: normalizeText(text),
      model: SPEECHIFY_MODEL,
      voice_id: SPEECHIFY_VOICE_ID,
    }),
  });
  const payload = (await response.json().catch(() => null)) as DirectSpeechifyPayload | null;
  if (!response.ok || !payload?.audio_data) {
    throw new Error(payload?.message || payload?.error || `Speechify trả về lỗi ${response.status}.`);
  }
  return base64ToBytes(payload.audio_data);
}

async function getOrCreateAudioFile(text: string, voice: string, status: (s: TtsStatus) => void): Promise<string> {
  const key = cacheKeyFor(text, voice);
  const cached = memoryCache.get(key);
  if (cached) {
    status('playing-cache');
    return cached;
  }

  const pending = pendingByKey.get(key);
  if (pending) {
    status('playing-cache');
    return pending;
  }

  const job = (async () => {
    if (Platform.OS !== 'web') {
      const dir = getCacheDir();
      const file = new FileSystem.File(dir, `george-${key}.mp3`);
      if (file.exists && file.size > 0) {
        memoryCache.set(key, file.uri);
        status('playing-cache');
        return file.uri;
      }
    }

    status('creating');
    // Default path: backend proxy (backend owns the key, serves its cache).
    // Optional on-device path: user's own key, entered in Profile.
    const ownKey = await getOwnSpeechifyKey();
    const bytes = ownKey ? await fetchWithOwnKey(text, ownKey) : await fetchFromBackend(text, voice);

    if (Platform.OS === 'web') {
      const dataUri = `data:audio/mpeg;base64,${bytesToBase64(bytes)}`;
      memoryCache.set(key, dataUri);
      status('playing-george');
      return dataUri;
    }

    const dir = getCacheDir();
    const file = new FileSystem.File(dir, `george-${key}.mp3`);
    file.create({ overwrite: true });
    file.write(bytes);
    memoryCache.set(key, file.uri);
    status('playing-george');
    return file.uri;
  })();

  pendingByKey.set(key, job);
  try {
    return await job;
  } finally {
    pendingByKey.delete(key);
  }
}

async function stopActivePlayer() {
  const player = activePlayer;
  activePlayer = null;
  if (!player) return;
  try {
    player.pause();
  } catch {
    // already finished
  }
  try {
    player.remove();
  } catch {
    // ignore cleanup failures
  }
}

export async function stopTts(): Promise<void> {
  playbackId += 1;
  await stopActivePlayer();
  await Speech.stop().catch(() => undefined);
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function playUri(uri: string, options: SpeakOptions): Promise<void> {
  const id = ++playbackId;
  return new Promise<void>((resolve, reject) => {
    const player = createAudioPlayer({ uri }, { updateInterval: 250 });
    activePlayer = player;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (activePlayer === player) activePlayer = null;
    };

    const subscription = player.addListener('playbackStatusUpdate', (s) => {
      if (id !== playbackId) return;
      if (s.error) {
        const err = new Error(s.error);
        if (!started) {
          subscription.remove();
          cleanup();
          try {
            player.remove();
          } catch {
            // ignore
          }
          reject(err);
        } else {
          options.onError?.(err);
        }
        return;
      }
      if (!s.isLoaded) return;
      if (!started) {
        started = true;
        if (timer) clearTimeout(timer);
        options.onStatus?.('playing-george');
        resolve();
      }
      if (s.didJustFinish) {
        subscription.remove();
        cleanup();
        try {
          player.remove();
        } catch {
          // ignore
        }
        options.onDone?.();
      }
    });

    timer = setTimeout(() => {
      if (started || id !== playbackId) return;
      subscription.remove();
      cleanup();
      try {
        player.remove();
      } catch {
        // ignore
      }
      reject(new Error('Không phát được audio.'));
    }, 20000);

    try {
      player.play();
    } catch (error) {
      subscription.remove();
      cleanup();
      reject(error instanceof Error ? error : new Error('Không phát được audio.'));
    }
  });
}

async function speakWithDeviceVoice(text: string, options: SpeakOptions): Promise<void> {
  await stopActivePlayer();
  await Speech.stop().catch(() => undefined);
  options.onStatus?.('fallback');
  Speech.speak(text, {
    language: 'en-US',
    rate: 0.95,
    onDone: options.onDone,
    onError: options.onError,
    onStopped: options.onDone,
  });
}

export async function speakText(rawText: string, options: SpeakOptions = {}): Promise<TtsStatus> {
  const text = normalizeText(rawText);
  if (!text) return 'idle';
  const voice = options.voice ?? SPEECHIFY_VOICE_ID;
  const report = (s: TtsStatus) => options.onStatus?.(s);

  playbackId += 1;
  await stopActivePlayer();
  await Speech.stop().catch(() => undefined);
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);

  try {
    const uri = await getOrCreateAudioFile(text, voice, report);
    await playUri(uri, options);
    return 'playing-george';
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Không phát được giọng George.');
    options.onError?.(err);
    if (options.disableFallback) {
      report('error');
      throw err;
    }
    await speakWithDeviceVoice(text, options);
    return 'fallback';
  }
}

// Play an already-existing local audio file (e.g. a speaking recording).
export async function playLocalAudio(uri: string, options: Omit<SpeakOptions, 'voice'> = {}): Promise<void> {
  playbackId += 1;
  await stopActivePlayer();
  await Speech.stop().catch(() => undefined);
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  await playUri(uri, options);
}

export function clearTtsMemoryCache(): void {
  memoryCache.clear();
}

export async function clearTtsFileCache(): Promise<void> {
  memoryCache.clear();
  try {
    const dir = new FileSystem.Directory(FileSystem.Paths.cache, CACHE_DIR);
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}

export async function getTtsFileCacheSize(): Promise<number> {
  try {
    const dir = new FileSystem.Directory(FileSystem.Paths.cache, CACHE_DIR);
    if (!dir.exists) return 0;
    const entries = dir.list();
    let total = 0;
    for (const entry of entries) {
      if (entry instanceof FileSystem.File) total += entry.size ?? 0;
    }
    return total;
  } catch {
    return 0;
  }
}

// One-line human-readable status for the UI.
export function ttsStatusLabel(status: TtsStatus): string {
  switch (status) {
    case 'creating':
      return 'Đang tạo giọng George…';
    case 'playing-george':
      return 'Đang phát giọng George';
    case 'playing-cache':
      return 'Đang phát từ bộ nhớ đệm';
    case 'fallback':
      return 'Giọng dự phòng của máy';
    case 'error':
      return 'Không phát được audio';
    default:
      return '';
  }
}

// Re-exported so the Profile screen can manage the optional on-device key.
export { getOwnSpeechifyKey };
export function saveOwnSpeechifyKey(key: string): Promise<void> {
  return setOwnSpeechifyKey(key);
}
export function removeOwnSpeechifyKey(): Promise<void> {
  return setOwnSpeechifyKey(null);
}
