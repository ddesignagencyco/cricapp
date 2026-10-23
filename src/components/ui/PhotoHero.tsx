import React, { type ReactNode } from 'react';
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Fade } from './Primitives';

/**
 * Full-bleed photo block with a straight bottom edge. The image is sized
 * explicitly (Android won't stretch large bitmaps past a limit) and
 * centred, so every screen crops evenly. A dark fade at the top keeps the
 * status bar, logo and buttons readable over any photo.
 */
export function PhotoHero({
  source,
  ratio,
  height,
  dim = 0,
  children,
  style,
}: {
  source: ImageSourcePropType;
  /** Image width / height. */
  ratio: number;
  height: number;
  /** Extra darkening over the whole photo, 0..1. */
  dim?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const w = Math.max(width, height * ratio);
  const h = w / ratio;
  return (
    <View style={[{ height, overflow: 'hidden', backgroundColor: '#0B1020' }, style]}>
      <Image source={source} resizeMode="cover" style={{ position: 'absolute', width: w, height: h, left: (width - w) / 2, top: (height - h) / 2 }} />
      {dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(5,8,16,${dim})` }]} /> : null}
      <Fade color="#05080F" height={170} opacity={0.65} style={styles.top} />
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0 },
});
