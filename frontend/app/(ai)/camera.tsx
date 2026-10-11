import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/src/components/ui/Screen';
import { GlassButton } from '@/src/components/ui/GlassButton';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { GlassInput } from '@/src/components/ui/GlassInput';
import { ListenButton } from '@/src/components/ui/ListenButton';
import { ErrorState, LoadingState } from '@/src/components/ui/States';
import { aiService } from '@/src/services/ai.service';
import { colors, radius, spacing } from '@/src/theme';
import type { AiAvailability, PhotoWordResult } from '@/src/types';

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoWordResult | null>(null);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [availability, setAvailability] = useState<AiAvailability | null>(null);

  useEffect(() => {
    aiService.availability().then(setAvailability).catch(() => undefined);
  }, []);

  const pickImage = async (fromCamera: boolean) => {
    setError(null);
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền truy cập', 'Hãy cấp quyền để chụp/chọn ảnh học từ.');
        return;
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (!res.canceled && res.assets[0]) {
        const uri = res.assets[0].uri;
        setImageUri(uri);
        setResult(null);
        setSaved(false);
        setEditedName('');
        await analyze(uri);
      }
    } catch {
      setError('Không mở được camera/thư viện ảnh.');
    }
  };

  const analyze = async (uri: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const r = await aiService.recognizePhoto(uri);
      setResult(r);
      setEditedName(r.englishName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nhận diện thất bại.');
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!result || !editedName.trim()) return;
    setSaving(true);
    try {
      await aiService.savePhotoWord({
        englishName: editedName.trim(),
        ipa: result.ipa ?? undefined,
        meaningVi: result.meaningVi,
        exampleEn: result.exampleEn ?? undefined,
        imageUrl: result.imageUrl,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu từ thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const aiDown = availability && !availability.aiAvailable;

  return (
    <Screen>
      <Text style={styles.title}>Chụp ảnh học từ 📸</Text>
      <Text style={styles.sub}>Chụp một vật xung quanh bạn, AI sẽ cho biết tên tiếng Anh của nó.</Text>

      {aiDown ? (
        <GlassCard style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ AI hiện không khả dụng{availability.message ? `: ${availability.message}` : '.'}
          </Text>
        </GlassCard>
      ) : null}

      <View style={styles.btnRow}>
        <GlassButton title="📷 Chụp ảnh" onPress={() => pickImage(true)} style={styles.halfBtn} />
        <GlassButton title="🖼️ Chọn ảnh" variant="outline" onPress={() => pickImage(false)} style={styles.halfBtn} />
      </View>

      {imageUri ? (
        <GlassCard>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          {!result && !analyzing && error ? (
            <GlassButton title="Thử nhận diện lại" onPress={() => analyze(imageUri)} style={styles.cta} />
          ) : null}
        </GlassCard>
      ) : null}

      {analyzing && <LoadingState message="AI đang nhận diện…" />}
      {error ? <ErrorState message={error} /> : null}

      {result ? (
        <GlassCard style={styles.resultCard}>
          <Text style={styles.resultLabel}>AI nhận diện đây là:</Text>
          <GlassInput
            label="Tên tiếng Anh (sửa lại nếu AI đoán sai)"
            value={editedName}
            onChangeText={setEditedName}
            autoCapitalize="none"
          />
          {result.ipa ? <Text style={styles.ipa}>/{result.ipa}/</Text> : null}
          <Text style={styles.meaning}>{result.meaningVi}</Text>
          {result.exampleEn ? <Text style={styles.example}>{result.exampleEn}</Text> : null}
          <View style={styles.listenRow}>
            <ListenButton text={`${editedName}. ${result.exampleEn ?? ''}`} showLabel size={22} />
          </View>
          {saved ? (
            <Text style={styles.savedText}>✅ Đã lưu vào bộ từ của bạn, sẽ xuất hiện trong flashcard.</Text>
          ) : (
            <GlassButton
              title="Xác nhận & lưu vào từ của tôi"
              onPress={save}
              loading={saving}
              disabled={!editedName.trim()}
              style={styles.cta}
            />
          )}
        </GlassCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  sub: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.md },
  warn: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' },
  warnText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
  halfBtn: { flex: 1 },
  preview: { width: '100%', height: 240, borderRadius: radius.md, marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm },
  resultCard: { borderWidth: 2, borderColor: colors.teal },
  resultLabel: { fontSize: 13, color: colors.inkMuted, fontWeight: '600' },
  ipa: { fontSize: 15, color: colors.inkMuted, marginTop: 4 },
  meaning: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 6 },
  example: { fontSize: 14, color: colors.inkSoft, marginTop: 6, fontStyle: 'italic', lineHeight: 20 },
  listenRow: { marginTop: spacing.sm },
  savedText: { fontSize: 14, color: colors.success, fontWeight: '600', marginTop: spacing.sm, lineHeight: 20 },
});
