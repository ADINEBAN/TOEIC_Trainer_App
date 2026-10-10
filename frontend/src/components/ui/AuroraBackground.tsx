import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '@/src/theme';

// Light glass "aurora" backdrop: sky base + layered translucent blobs.
export function AuroraBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={[styles.blob, styles.blobC]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.sky,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  blobA: {
    width: 320,
    height: 320,
    top: -90,
    right: -80,
    backgroundColor: '#BFDDFB',
  },
  blobB: {
    width: 260,
    height: 260,
    top: 240,
    left: -90,
    backgroundColor: '#C9F2EC',
    opacity: 0.5,
  },
  blobC: {
    width: 220,
    height: 220,
    bottom: -60,
    right: 40,
    backgroundColor: '#D9E8FF',
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
});
