import React, { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { MatchHeroCard, MatchRow } from '../../components/cricket/MatchCards';
import { NewsHero, NewsRow } from '../../components/cricket/NewsCards';
import { BannerCarousel, ShortsRow } from '../../components/cricket/Media';
import { WinProbBar } from '../../components/cricket/Charts';
import { TeamBadge } from '../../components/cricket/Badges';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Gradient } from '../../components/ui/Gradient';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Screen, TabHeader } from '../../components/ui/Layout';
import { Card, Glow, Hairline, IconButton, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import type { RouteName } from '../../navigation/routes';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { dayLabel, time } from '../../utils/format';

function LiveCarousel({ data }: { data: Awaited<ReturnType<typeof repo.home>> }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const cardW = width - space.lg * 2 - (data.live.length > 1 ? 20 : 0);
  const items = data.live.length ? data.live : data.upcoming.slice(0, 3);
  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;
  return (
    <View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={m => m.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + space.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <MatchHeroCard match={item} width={cardW} prediction={data.livePredictions[item.id]} />
        )}
      />
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((m, i) => (
            <View
              key={m.id}
              style={[styles.dot, { backgroundColor: i === index ? colors.text : colors.border, width: i === index ? 16 : 6 }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HubTile({
  title,
  subtitle,
  color,
  icon,
  route,
}: {
  title: string;
  subtitle: string;
  color: string;
  icon: IconName;
  route: RouteName;
}) {
  const { colors } = useTheme();
  const nav = useNavigation();
  return (
    <Touch
      scale
      onPress={() => nav.navigate(route as 'Pakistan')}
      style={[styles.hub, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
    >
      <Glow color={color} size={220} opacity={colors.scheme === 'dark' ? 0.28 : 0.18} style={{ right: -110, top: -110 }} />
      <View style={[styles.hubIcon, { backgroundColor: colors.elevated }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <AppText variant="headline" weight="700" style={{ marginTop: 22 }}>
        {title}
      </AppText>
      <AppText variant="caption" color="textSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
        {subtitle}
      </AppText>
    </Touch>
  );
}

/** Each shortcut has its own colour so the row reads at a glance. */
const SHORTCUTS: { label: string; icon: IconName; route: RouteName; color: string }[] = [
  { label: 'Schedule', icon: 'calendar', route: 'Schedule', color: '#3B68FC' },
  { label: 'Rankings', icon: 'listOrdered', route: 'Rankings', color: '#9A5CF0' },
  { label: 'Gallery', icon: 'image', route: 'Gallery', color: '#F0478A' },
  { label: 'Tools', icon: 'calculator', route: 'Tools', color: '#14B8A6' },
];

function Shortcuts() {
  const { colors } = useTheme();
  const nav = useNavigation();
  return (
    <View style={styles.shortcuts}>
      {SHORTCUTS.map(s => (
        <Touch key={s.label} onPress={() => nav.navigate(s.route as 'Tools')} style={styles.shortcut} accessibilityLabel={s.label}>
          <View style={[styles.shortcutIcon, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Icon name={s.icon} size={22} color={s.color} />
          </View>
          <AppText variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
            {s.label}
          </AppText>
        </Touch>
      ))}
    </View>
  );
}

function PredictionTeaser({ data }: { data: Awaited<ReturnType<typeof repo.home>> }) {
  const nav = useNavigation();
  const p = data.featuredPrediction;
  const m = data.upcoming.find(x => x.id === p.matchId);
  if (!m) return null;
  // Graphite feature card with a faint brand glow: stands apart from the blue live hero.
  return (
    <Touch scale onPress={() => nav.navigate('Prediction', { id: m.id })} style={styles.teaser}>
      <Gradient from="#2E3442" to="#1A1E27" base="#14171D" />
      <Glow color="#3B68FC" size={280} opacity={0.35} style={{ right: -120, top: -140 }} />
      <View style={styles.rowCenter}>
        <View style={[styles.aiIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <Icon name="sparkles" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText variant="label" weight="700" color="#FFFFFF">
            AI Match Preview
          </AppText>
          <AppText variant="caption" color="#C9D3F2">
            {dayLabel(m.startTime)} · {time(m.startTime)} · {m.title}
          </AppText>
        </View>
        <View style={styles.confidence}>
          <AppText variant="micro" color="#FFFFFF">
            {p.confidence.toUpperCase()}
          </AppText>
        </View>
      </View>
      <View style={[styles.rowCenter, { marginTop: 18, marginBottom: 14 }]}>
        <TeamBadge id={m.teamA} size={44} solid />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText variant="display" tabular color="#FFFFFF">
            {Math.round(p.winA * 100)}
            <AppText variant="title" color="#AEBBE6">
              %
            </AppText>
          </AppText>
          <AppText variant="caption" color="#D7DEF6">
            {team(m.teamA).name} to win
          </AppText>
        </View>
        <TeamBadge id={m.teamB} size={44} solid />
      </View>
      <WinProbBar teamA={m.teamA} teamB={m.teamB} p={p.winA} height={6} showLabels={false} />
      <View style={[styles.rowCenter, styles.teaserFoot]}>
        <AppText variant="caption" color="#C9D3F2" style={{ flex: 1 }}>
          Projected {team(p.projected.teamId).short} score{' '}
          <AppText variant="caption" weight="700" color="#FFFFFF" tabular>
            {p.projected.low}–{p.projected.high}
          </AppText>
        </AppText>
        <AppText variant="caption" weight="700" color="#FFFFFF">
          Full preview
        </AppText>
        <Icon name="chevronRight" size={14} color="#FFFFFF" />
      </View>
    </Touch>
  );
}

export default function HomeScreen() {
  const nav = useNavigation();
  const { data, loading, refresh, refreshing } = useQuery('home', repo.home, { live: true });

  return (
    <Screen>
      <TabHeader
        right={
          <>
            <IconButton icon="search" label="Search" onPress={() => nav.navigate('Search')} />
            <IconButton icon="bell" label="Alerts" badge onPress={() => nav.navigate('Alerts')} />
          </>
        }
      />
      {loading || !data ? (
        <SkeletonList count={4} height={150} />
      ) : (
        <Body onRefresh={refresh} refreshing={refreshing} bottomInset={false}>
          <View style={{ paddingTop: space.xs }}>
            <ShortsRow shorts={data.shorts} />
          </View>
          <View style={{ marginTop: space.lg }}>
            <BannerCarousel banners={data.banners} />
          </View>
          <SectionHeader
            title={data.live.length ? 'Live now' : 'Coming up'}
            overline={data.live.length ? `${data.live.length} MATCHES IN PLAY` : undefined}
            action="All matches"
            onAction={() => nav.navigate('Schedule')}
            style={{ marginTop: space.xxl }}
          />
          <LiveCarousel data={data} />

          <View style={styles.hubs}>
            <HubTile title="Pakistan" subtitle="Squads, fixtures, stats" color="#1FB86A" icon="flag" route="Pakistan" />
            <HubTile title="PSL" subtitle="Teams, table, draft" color="#F5C04A" icon="trophy" route="Psl" />
          </View>
          <Shortcuts />

          <SectionHeader title="Top stories" action="News" onAction={() => nav.navigate('Tabs', { tab: 'news' })} style={{ marginTop: space.xxl }} />
          <NewsHero article={data.stories[0]} />
          <View style={{ marginTop: space.xs }}>
            {data.stories.slice(1, 4).map((a, i) => (
              <View key={a.id}>
                {i > 0 ? <Hairline inset={space.lg} /> : null}
                <NewsRow article={a} />
              </View>
            ))}
          </View>

          <SectionHeader title="Predictions" overline="POWERED BY OUR MATCH MODEL" style={{ marginTop: space.xl }} />
          <PredictionTeaser data={data} />

          <SectionHeader title="Upcoming" action="Schedule" onAction={() => nav.navigate('Schedule')} style={{ marginTop: space.xxl }} />
          <Card padded={false} style={{ marginHorizontal: space.lg }}>
            {data.upcoming.slice(0, 3).map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Hairline /> : null}
                <MatchRow match={m} />
              </View>
            ))}
          </Card>

          <SectionHeader title="Results" style={{ marginTop: space.xxl }} />
          <Card padded={false} style={{ marginHorizontal: space.lg }}>
            {data.results.slice(0, 3).map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Hairline /> : null}
                <MatchRow match={m} />
              </View>
            ))}
          </Card>
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { height: 6, borderRadius: 3 },
  hubs: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, marginTop: space.xxl },
  hub: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.lg,
    overflow: 'hidden',
  },
  hubIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg, marginTop: space.lg },
  shortcut: { alignItems: 'center', width: 76, paddingVertical: 4, borderRadius: radius.md },
  shortcutIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  aiIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teaser: { marginHorizontal: space.lg, borderRadius: radius.xl, padding: space.lg, overflow: 'hidden' },
  teaserFoot: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(255,255,255,0.16)' },
  confidence: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
});
