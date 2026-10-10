import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { speakText, stopTts, ttsStatusLabel, type TtsStatus } from '@/src/services/tts.service';
import { colors, radius } from '@/src/theme';

// Speaker button that plays George via the backend proxy and shows honest status.
export function ListenButton({
  text,
  size = 22,
  showLabel = false,
}: {
  text: string;
  size?: number;
  showLabel?: boolean;
}) {
  const [status, setStatus] = useState<TtsStatus>('idle');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopTts().catch(() => undefined);
    };
  }, []);

  const busy = status === 'creating';

  const onPress = useCallback(async () => {
    if (busy) return;
    if (status === 'playing-george' || status === 'playing-cache') {
      await stopTts().catch(() => undefined);
      if (mounted.current) setStatus('idle');
      return;
    }
    setStatus('creating');
    try {
      await speakText(text, {
        onStatus: (s) => mounted.current && setStatus(s),
        onDone: () => mounted.current && setStatus('idle'),
        onError: () => mounted.current && setStatus('idle'),
      });
      if (mounted.current) setStatus('idle');
    } catch {
      if (mounted.current) setStatus('idle');
    }
  }, [text, busy, status]);

  const isFallback = status === 'fallback';
  const label = busy ? ttsStatusLabel('creating') : isFallback ? ttsStatusLabel('fallback') : null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityLabel="Nghe phát âm"
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={isFallback ? 'volume-medium-outline' : 'volume-high'}
            size={size}
            color={isFallback ? colors.orange : colors.primary}
          />
        )}
      </Pressable>
      {showLabel && label ? <Text style={styles.status}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  status: { fontSize: 11, color: colors.inkMuted, maxWidth: 140 },
});
