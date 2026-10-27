import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NewsHero, NewsRow, NewsTile } from '../../components/cricket/NewsCards';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Body, Header, Screen, TabHeader } from '../../components/ui/Layout';
import { EmptyState, ErrorState, Hairline, IconButton, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { repo } from '../../data/repo';
import type { Article, NewsCategory } from '../../data/types';
import { usePaged } from '../../data/usePaged';
import { LoadMore, nearEnd } from '../../components/ui/LoadMore';
import { useNavigation, useParams } from '../../navigation/Stack';
import { usePrefs } from '../../state/prefs';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

/** How each section is laid out: stacked rows, or a horizontal rail of tiles. */
const SECTIONS: { title: string; categories: NewsCategory[]; layout: 'rows' | 'rail' }[] = [
  { title: 'Pakistan', categories: ['Pakistan'], layout: 'rows' },
  { title: 'PSL', categories: ['PSL'], layout: 'rail' },
  { title: 'Match reports', categories: ['Match News'], layout: 'rows' },
  { title: 'Analysis & features', categories: ['Analysis', 'Features', 'Explainers'], layout: 'rail' },
  { title: 'International', categories: ['International'], layout: 'rows' },
  { title: 'Records & interviews', categories: ['Records', 'Interviews'], layout: 'rows' },
];

function Rows({ list }: { list: Article[] }) {
  return (
    <View>
      {list.map((a, i) => (
        <View key={a.id}>
          {i > 0 ? <Hairline inset={space.lg} /> : null}
          <NewsRow article={a} />
        </View>
      ))}
    </View>
  );
}

/** Two-way language switch in the header: English | اردو. */
function LanguageToggle() {
  const { colors } = useTheme();
  const { newsLang, setNewsLang } = usePrefs();
  const options = [
    { key: 'en' as const, label: 'EN', a11y: 'English' },
    { key: 'ur' as const, label: 'اردو', a11y: 'Urdu' },
  ];
  return (
    <View style={[styles.lang, { backgroundColor: colors.elevated, borderColor: colors.border }]} accessibilityRole="radiogroup">
      {options.map(o => {
        const on = newsLang === o.key;
        return (
          <Touch
            key={o.key}
            onPress={() => setNewsLang(o.key)}
            accessibilityRole="radio"
            hitSlop={{ top: 8, bottom: 8 }}
            accessibilityState={{ selected: on }}
            accessibilityLabel={`News in ${o.a11y}`}
            style={[styles.langOpt, on && { backgroundColor: colors.brand }]}
          >
            <AppText
              variant="label"
              weight="700"
              color={on ? 'onBrand' : 'textSecondary'}
              style={o.key === 'ur' ? { fontFamily: undefined, fontWeight: '700' } : undefined}
            >
              {o.label}
            </AppText>
          </Touch>
        );
      })}
    </View>
  );
}

export default function NewsScreen() {
  const nav = useNavigation();
  const { newsLang } = usePrefs();
  const feed = usePaged(`news:${newsLang}`, p => repo.newsPage({ lang: newsLang }, p));
  const data = feed.items;

  const used = new Set<string>();
  const take = (list: Article[], n: number) => {
    const out = list.filter(a => !used.has(a.id)).slice(0, n);
    out.forEach(a => used.add(a.id));
    return out;
  };

  return (
    <Screen>
      <TabHeader
        title={newsLang === 'ur' ? 'خبریں' : 'News'}
        right={
          <>
            <LanguageToggle />
            <IconButton icon="search" label="Search" onPress={() => nav.navigate('Search')} />
          </>
        }
      />
      {feed.loading ? (
        <SkeletonList count={4} height={100} />
      ) : feed.error && !data.length ? (
        <ErrorState error={feed.error} onRetry={feed.refresh} />
      ) : !data.length ? (
        <EmptyState icon="newspaper" title="No stories yet" />
      ) : (
        <Body
          onRefresh={feed.refresh}
          refreshing={feed.refreshing}
          bottomInset={false}
          contentStyle={{ paddingTop: space.sm }}
          scrollEventThrottle={250}
          onScroll={e => nearEnd(e) && feed.loadMore()}
        >
          {(() => {
            const lead = take(data.filter(a => a.featured || a.breaking), 1)[0] ?? take(data, 1)[0];
            const latest = take(data, 3);
            return (
              <>
                {lead ? <NewsHero article={lead} /> : null}
                {latest.length ? (
                  <>
                    <SectionHeader title={newsLang === 'ur' ? 'تازہ ترین' : 'Latest'} style={{ marginTop: space.xl }} />
                    <Rows list={latest} />
                  </>
                ) : null}
                {newsLang === 'en'
                  ? SECTIONS.map(sec => {
                      const list = take(
                        data.filter(a => sec.categories.includes(a.category)),
                        sec.layout === 'rail' ? 6 : 3,
                      );
                      if (!list.length) return null;
                      return (
                        <View key={sec.title}>
                          <SectionHeader
                            title={sec.title}
                            action="See all"
                            onAction={() => nav.navigate('NewsSection', { title: sec.title, categories: sec.categories })}
                            style={{ marginTop: space.xxl }}
                          />
                          {/* A rail of one card leaves a blank strip; one story reads better as a row. */}
                          {sec.layout === 'rail' && list.length > 1 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
                              {list.map(a => (
                                <NewsTile key={a.id} article={a} />
                              ))}
                            </ScrollView>
                          ) : (
                            <Rows list={list} />
                          )}
                        </View>
                      );
                    })
                  : null}
                {(() => {
                  // Everything not placed above, plus each page loaded as the reader scrolls.
                  const rest = data.filter(a => !used.has(a.id));
                  return rest.length ? (
                    <>
                      <SectionHeader title={newsLang === 'ur' ? 'مزید خبریں' : 'More stories'} style={{ marginTop: space.xxl }} />
                      <Rows list={rest} />
                    </>
                  ) : null;
                })()}
                <LoadMore hasMore={feed.hasMore} loading={feed.loadingMore} onPress={feed.loadMore} count={data.length} />
              </>
            );
          })()}
        </Body>
      )}
    </Screen>
  );
}

/** "See all" for one news section. */
export function NewsSectionScreen() {
  const { title, categories } = useParams('NewsSection');
  const feed = usePaged(`news:section:${categories.join(',')}`, p => repo.newsPage({ lang: 'en', categories }, p));
  return (
    <Screen>
      <Header title={title} />
      {feed.loading ? (
        <SkeletonList count={5} height={90} />
      ) : feed.error && !feed.items.length ? (
        <ErrorState error={feed.error} onRetry={feed.refresh} />
      ) : !feed.items.length ? (
        <EmptyState icon="newspaper" title="No stories yet" />
      ) : (
        <Body onRefresh={feed.refresh} refreshing={feed.refreshing} scrollEventThrottle={250} onScroll={e => nearEnd(e) && feed.loadMore()}>
          <Rows list={feed.items} />
          <LoadMore hasMore={feed.hasMore} loading={feed.loadingMore} onPress={feed.loadMore} count={feed.items.length} />
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lang: {
    flexDirection: 'row',
    height: 36,
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginRight: 4,
  },
  langOpt: { minWidth: 46, paddingHorizontal: 10, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
