import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Fade } from './Primitives';

const HFADE = require('../../assets/images/hfade.png');

/**
 * Two-colour diagonal-feel gradient from tinted fade images over a deep
 * base: `from` blooms in from the left, `to` from the right. No native
 * gradient module.
 */
export function Gradient({ from, to, base = '#0D1733', strength = 1 }: { from: string; to: string; base?: string; strength?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
      <Image source={HFADE} resizeMode="stretch" style={[styles.fill, { tintColor: from, opacity: 0.78 * strength }]} />
      <Image source={HFADE} resizeMode="stretch" style={[styles.fill, { tintColor: to, opacity: 0.62 * strength, transform: [{ scaleX: -1 }] }]} />
      {/* Darken the lower part so footer text stays readable. */}
      <Fade color="#060B1C" height={220} flip opacity={0.5} style={styles.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  bottom: { position: 'absolute', bottom: 0 },
});
