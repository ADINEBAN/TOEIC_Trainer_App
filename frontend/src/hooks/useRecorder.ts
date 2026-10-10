import { useCallback, useRef, useState } from 'react';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from 'expo-audio';

export type RecorderState = 'idle' | 'recording' | 'stopped';

// Thin wrapper around expo-audio's useAudioRecorder for the Speaking Coach
// and hands-free mode.
export function useRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<RecorderState>('idle');
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    setError(null);
    setUri(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Cần quyền micro để thu âm. Hãy cấp quyền trong cài đặt máy.');
        return false;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setState('recording');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không bắt đầu thu âm được.');
      return false;
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    try {
      await recorder.stop();
      const recordedUri = recorder.uri;
      if (timerRef.current) clearInterval(timerRef.current);
      setUri(recordedUri ?? null);
      setState('stopped');
      return recordedUri ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không dừng thu âm được.');
      return null;
    }
  }, [recorder]);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('idle');
    setUri(null);
    setSeconds(0);
    setError(null);
  }, []);

  return { state, uri, seconds, error, start, stop, reset };
}
