import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ListenButton } from '@/src/components/ui/ListenButton';
import { colors, spacing } from '@/src/theme';
import type { Word } from '@/src/types';

export function WordCard({
  word,
  onPress,
  onToggleSave,
  saved,
}: {
  word: Word;
  onPress: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard>
        <View style={styles.row}>
          <View style={styles.main}>
            <Text style={styles.word}>{word.word}</Text>
            {word.ipa ? <Text style={styles.ipa}>/{word.ipa}/</Text> : null}
            <Text style={styles.meaning} numberOfLines={2}>
              {word.meaningVi}
            </Text>
            {word.topic ? <Text style={styles.topic}>{word.topic}</Text> : null}
          </View>
          <View style={styles.side}>
            <ListenButton text={word.exampleEn ? `${word.word}. ${word.exampleEn}` : word.word} />
            {onToggleSave ? (
              <Pressable onPress={onToggleSave} style={styles.saveBtn} hitSlop={10}>
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={saved ? colors.primary : colors.inkMuted}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1 },
  word: { fontSize: 18, fontWeight: '800', color: colors.ink },
  ipa: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  meaning: { fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  topic: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  side: { alignItems: 'center', gap: 8, marginLeft: spacing.sm },
  saveBtn: { padding: 4 },
});
