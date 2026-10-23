import React from 'react';
import { Image, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

const FRONT = require('../../assets/images/wave_front.png');
const BACK = require('../../assets/images/wave_back.png');
const W = 1600;
const H = 700;

/**
 * A static wavy top edge for a bottom panel: a soft brand-coloured wave
 * behind, the panel colour in front. Pre-rendered PNGs, tinted, so there's
 * no SVG module.
 */
export function Waves({
  color,
  accent,
  height,
  style,
}: {
  color: string;
  accent: string;
  /** Height of the panel the waves sit on top of. */
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const imgW = width * 1.35;
  const imgH = (H / W) * imgW;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height }, style]}>
      <Image
        source={BACK}
        style={{ position: 'absolute', left: -width * 0.25, width: imgW, height: imgH, top: -imgH * 0.09, tintColor: accent }}
      />
      <Image
        source={FRONT}
        style={{ position: 'absolute', left: -width * 0.08, width: imgW, height: imgH, top: -imgH * 0.06, tintColor: color }}
      />
      {/* Solid fill below the wave artwork. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: imgH * 0.9, bottom: 0, backgroundColor: color }} />
    </View>
  );
}
