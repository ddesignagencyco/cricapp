import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { author, team as teamOf } from '../../data/refs';
import type { Article } from '../../data/types';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Fade, Glow } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { badgeFill, shade } from '../../utils/color';

/**
 * Cover art for an article: its photo when it has one, otherwise a
 * generated cover from the associated teams' colours and codes.
 */
export function ArticleArt({ article, height, rounded = radius.md }: { article: Article; height: number; rounded?: number }) {
  const { colors } = useTheme();
  const [a, b] = [article.teamIds[0], article.teamIds[1] ?? article.teamIds[0]].map(id => teamOf(id ?? 'pak'));
  if (article.image) {
    return (
      <View style={{ height, borderRadius: rounded, overflow: 'hidden', backgroundColor: colors.elevated }}>
        <Image source={{ uri: article.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    );
  }
  return (
    // Generated cover in the story's team colours, deepened so white text stays crisp.
    <View style={{ height, borderRadius: rounded, overflow: 'hidden', backgroundColor: shade(badgeFill(a.color), 0.35), justifyContent: 'center', alignItems: 'center' }}>
      <Glow color={a.color} size={height * 2.2} opacity={0.55} style={{ left: -height * 0.9, top: -height * 0.7 }} />
      <Glow color={b.color} size={height * 2.2} opacity={0.45} style={{ right: -height * 1.1, bottom: -height * 1.2 }} />
      <AppText
        variant="hero"
        numberOfLines={1}
        adjustsFontSizeToFit
        color="#FFFFFF"
        style={{ fontSize: height * 0.24, lineHeight: height * 0.34, letterSpacing: -0.5, paddingHorizontal: 8 }}
      >
        {a.short}
        {b.id !== a.id ? <AppText variant="hero" color="#C9D6FF" style={{ fontSize: height * 0.13 }}>{' v '}</AppText> : null}
        {b.id !== a.id ? b.short : ''}
      </AppText>
    </View>
  );
}

function Meta({ article, light }: { article: Article; light?: boolean }) {
  const { colors } = useTheme();
  const by = author(article.authorId);
  return (
    <View style={styles.meta}>
      {article.breaking ? (
        <View style={styles.meta}>
          <View style={[styles.breakDot, { backgroundColor: colors.live }]} />
          <AppText variant="micro" color={light ? '#FFFFFF' : 'live'} style={{ marginRight: 8 }}>
            BREAKING
          </AppText>
        </View>
      ) : (
        <AppText variant="micro" color={light ? '#FFFFFF' : 'text'} style={{ marginRight: 8 }} uppercase>
          {article.category}
        </AppText>
      )}
      <AppText variant="caption" weight="600" color={light ? '#D4DBF2' : colors.accent} numberOfLines={1}>
        {ago(article.publishedAt)}
        {by && !light ? ` · ${by.name}` : ''}
      </AppText>
    </View>
  );
}

/** Full-bleed lead story with the headline over the image. */
export function NewsHero({ article }: { article: Article }) {
  const nav = useNavigation();
  const ur = article.lang === 'ur';
  return (
    <Touch scale onPress={() => nav.navigate('Article', { id: article.id })} style={styles.hero}>
      <ArticleArt article={article} height={250} rounded={radius.xl} />
      <View style={styles.heroShade} pointerEvents="none">
        <Fade color="#03060C" height={190} flip opacity={0.92} />
      </View>
      <View style={styles.heroText}>
        <Meta article={article} light />
        <AppText variant="title" color="#FFFFFF" rtl={ur} numberOfLines={3} style={{ marginTop: 6 }}>
          {article.title}
        </AppText>
      </View>
    </Touch>
  );
}

/** Standard list row: thumbnail beside headline. */
export function NewsRow({ article }: { article: Article }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const ur = article.lang === 'ur';
  return (
    <Touch onPress={() => nav.navigate('Article', { id: article.id })} style={[styles.row, ur && { flexDirection: 'row-reverse' }, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1, [ur ? 'marginLeft' : 'marginRight']: space.md }}>
        <AppText variant="headline" rtl={ur} numberOfLines={3}>
          {article.title}
        </AppText>
        <View style={{ marginTop: 8 }}>
          <Meta article={article} />
        </View>
      </View>
      <View style={{ width: 104 }}>
        <ArticleArt article={article} height={78} rounded={radius.sm} />
      </View>
    </Touch>
  );
}

/** Wide card for horizontal rails. */
export function NewsTile({ article, width = 260 }: { article: Article; width?: number }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  return (
    <Touch
      scale
      onPress={() => nav.navigate('Article', { id: article.id })}
      style={[styles.tile, { width, backgroundColor: colors.surface, borderColor: colors.hairline }]}
    >
      <ArticleArt article={article} height={140} rounded={0} />
      <View style={{ padding: space.md }}>
        <Meta article={article} />
        <AppText variant="headline" numberOfLines={3} style={{ marginTop: 6 }} rtl={article.lang === 'ur'}>
          {article.title}
        </AppText>
      </View>
    </Touch>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center' },
  breakDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  hero: { marginHorizontal: space.lg, borderRadius: radius.xl, overflow: 'hidden' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroText: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg },
  row: { flexDirection: 'row', paddingHorizontal: space.lg, paddingVertical: 14, alignItems: 'flex-start' },
  tile: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
});
