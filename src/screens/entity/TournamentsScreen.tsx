import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { LoadMore, nearEnd } from '../../components/ui/LoadMore';
import { Card, EmptyState, ErrorState, Hairline, SectionHeader, Tag } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { rememberSeries } from '../../data/refs';
import { repo, type Tournament } from '../../data/repo';
import { usePaged } from '../../data/usePaged';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { badgeFill, colorFor } from '../../utils/color';
import { shortDate } from '../../utils/format';

const FORMAT: Record<string, string> = { t20: 'T20', t20i: 'T20I', odi: 'ODI', test: 'Test', t10: 'T10', list_a: 'List A', first_class: 'First-class', the_hundred: '100-ball' };

/** Where the current season stands, from its dates. */
function phase(t: Tournament): { label: string; tone: 'success' | 'brand' | 'neutral' } | null {
  const start = t.currentSeason?.start_date ? +new Date(t.currentSeason.start_date) : NaN;
  const end = t.currentSeason?.end_date ? +new Date(t.currentSeason.end_date) + 86_400_000 : NaN;
  if (!Number.isFinite(start)) return null;
  const now = Date.now();
  if (now < start) return { label: 'UPCOMING', tone: 'brand' };
  if (!Number.isFinite(end) || now <= end) return { label: 'ONGOING', tone: 'success' };
  return { label: 'FINISHED', tone: 'neutral' };
}

/** All tournaments in the data feed, grouped by category and loaded a page at a time. */
export default function TournamentsScreen() {
  const list = usePaged('tournaments', repo.tournamentsPage);
  // International first, then categories (usually countries) alphabetically.
  const groups = useMemo(() => {
    const map = new Map<string, Tournament[]>();
    for (const t of list.items) {
      const k = t.category?.name || 'Other';
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === 'International' ? -1 : b === 'International' ? 1 : a.localeCompare(b)));
  }, [list.items]);

  return (
    <Screen>
      <Header title="Series & tournaments" />
      {list.loading ? (
        <SkeletonList count={6} height={64} />
      ) : list.error && !list.items.length ? (
        <ErrorState error={list.error} onRetry={list.refresh} />
      ) : !list.items.length ? (
        <EmptyState icon="layers" title="No tournaments yet" />
      ) : (
        <Body onRefresh={list.refresh} refreshing={list.refreshing} scrollEventThrottle={250} onScroll={e => nearEnd(e) && list.loadMore()}>
          {groups.map(([name, items], gi) => (
            <View key={name} style={{ marginTop: gi ? space.xl : 0 }}>
              <SectionHeader title={name} />
              <Card padded={false} style={{ marginHorizontal: space.lg }}>
                {items.map((t, i) => (
                  <View key={t.id}>
                    {i > 0 ? <Hairline inset={space.lg + 44 + space.md} /> : null}
                    <Row t={t} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onPress={list.loadMore} count={list.items.length} />
        </Body>
      )}
    </Screen>
  );
}

function Row({ t }: { t: Tournament }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const season = t.currentSeason;
  const tint = badgeFill(colorFor(t.name));
  const p = phase(t);
  const meta = [
    t.type ? FORMAT[t.type.toLowerCase()] ?? t.type.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '',
    season?.start_date ? `${shortDate(season.start_date)}${season.end_date ? ` – ${shortDate(season.end_date)}` : ''}` : '',
  ].filter(Boolean);
  const open = () => {
    // Register a name for the series header before its own fetch lands.
    rememberSeries({ id: t.id, name: t.name, short: t.name, slug: t.id, format: 'T20', kind: 'tournament', start: season?.start_date ?? '', end: season?.end_date ?? '', teamIds: [], color: tint });
    nav.navigate('Series', { id: t.id });
  };
  return (
    <Touch onPress={open} style={styles.row} accessibilityLabel={t.name}>
      <View style={[styles.mark, { backgroundColor: `${tint}22` }]}>
        <Icon name="trophy" size={20} color={tint} />
      </View>
      <View style={{ flex: 1, marginHorizontal: space.md }}>
        <AppText variant="label" weight="700" numberOfLines={2}>
          {t.name}
        </AppText>
        <View style={[styles.meta, { marginTop: 4 }]}>
          {p ? <Tag label={p.label} tone={p.tone} /> : null}
          {t.gender === 'women' ? <Tag label="WOMEN" tone="psl" style={{ marginLeft: 6 }} /> : null}
          {meta.length ? (
            <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginLeft: p || t.gender === 'women' ? 8 : 0, flexShrink: 1 }}>
              {meta.join(' · ')}
            </AppText>
          ) : null}
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Touch>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 72 },
  mark: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
