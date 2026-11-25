import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProfilePass } from '../../components/cricket/ProfilePass';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Screen, TabHeader } from '../../components/ui/Layout';
import { Card, Hairline, IconButton, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, type Navigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

interface QuickHub {
  label: string;
  subtitle: string;
  icon: IconName;
  color: string;
  go: (nav: Navigation) => void;
}

interface MenuItem {
  label: string;
  hint: string;
  icon: IconName;
  color: string;
  go: (nav: Navigation) => void;
}

const FEATURED_HUBS: QuickHub[] = [
  { label: 'PSL Hub', subtitle: 'Table, fixtures & stats', icon: 'trophy', color: '#E39B12', go: n => n.navigate('Psl') },
  { label: 'Pakistan', subtitle: 'Matches, squad & news', icon: 'flag', color: '#16B800', go: n => n.navigate('Pakistan') },
  { label: 'Rankings', subtitle: 'ICC teams & players', icon: 'award', color: '#3B82F6', go: n => n.navigate('Rankings') },
  { label: 'Cricket Tools', subtitle: 'NRR, DLS & compare', icon: 'calculator', color: '#0EA5A4', go: n => n.navigate('Tools') },
];

const GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Explore Cricket',
    items: [
      { label: 'Upcoming fixtures', hint: 'Full international & domestic schedule', icon: 'calendar', color: '#16B800', go: n => n.navigate('Schedule') },
      { label: 'Series & tournaments', hint: 'All active competitions & points tables', icon: 'layers', color: '#7C5CFF', go: n => n.navigate('Tournaments') },
      { label: 'Live streams', hint: 'Official cricket channels & highlights', icon: 'tv', color: '#EF4444', go: n => n.navigate('Streams') },
      { label: 'Photo gallery', hint: 'Match photos & short clips', icon: 'image', color: '#D6409F', go: n => n.navigate('Gallery') },
      { label: 'Teams & players', hint: 'Search squads, profiles & stats', icon: 'search', color: '#0EA5A4', go: n => n.navigate('Search') },
    ],
  },
  {
    title: 'Your Space',
    items: [
      { label: 'Favourites', hint: 'Saved teams, players & matches', icon: 'heart', color: '#EF4444', go: n => n.navigate('Favourites') },
      { label: 'Newsletter & alerts', hint: 'Daily digests & match previews', icon: 'mail', color: '#F07A16', go: n => n.navigate('Alerts') },
      { label: 'Settings', hint: 'Profile, theme, policies & about', icon: 'settings', color: '#64748B', go: n => n.navigate('Settings') },
    ],
  },
];

export default function MoreScreen() {
  const nav = useNavigation();
  const { colors, isDark, setPreference } = useTheme();

  const toggleTheme = () => setPreference(isDark ? 'light' : 'dark');

  return (
    <Screen>
      <TabHeader
        title="More"
        right={
          <IconButton
            icon={isDark ? 'sun' : 'moon'}
            label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={toggleTheme}
          />
        }
      />
      <Body bottomInset={false} contentStyle={{ paddingTop: space.md }}>
        <ProfilePass />

        <SectionHeader title="Quick Hubs" style={{ marginTop: space.xl }} />
        <View style={styles.hubGrid}>
          {FEATURED_HUBS.map(hub => (
            <Touch
              key={hub.label}
              scale
              onPress={() => hub.go(nav)}
              accessibilityLabel={`${hub.label}, ${hub.subtitle}`}
              style={[
                styles.hubCard,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
              ]}
            >
              <View style={styles.hubTop}>
                <View style={[styles.hubIcon, { backgroundColor: `${hub.color}1F` }]}>
                  <Icon name={hub.icon} size={20} color={hub.color} />
                </View>
                <Icon name="arrowUpRight" size={16} color={colors.textMuted} />
              </View>
              <AppText variant="headline" weight="700" numberOfLines={1} style={{ marginTop: space.md }}>
                {hub.label}
              </AppText>
              <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                {hub.subtitle}
              </AppText>
            </Touch>
          ))}
        </View>

        {GROUPS.map(g => (
          <View key={g.title} style={{ marginTop: space.xl }}>
            <SectionHeader title={g.title} />
            <Card padded={false} style={{ marginHorizontal: space.lg }}>
              {g.items.map((it, i) => (
                <View key={it.label}>
                  {i > 0 ? <Hairline inset={space.lg + 40 + space.md} /> : null}
                  <Touch onPress={() => it.go(nav)} style={styles.item} accessibilityLabel={it.label}>
                    <View style={[styles.tile, { backgroundColor: `${it.color}1C` }]}>
                      <Icon name={it.icon} size={19} color={it.color} />
                    </View>
                    <View style={styles.itemCopy}>
                      <AppText variant="body" weight="600" numberOfLines={1}>
                        {it.label}
                      </AppText>
                      <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                        {it.hint}
                      </AppText>
                    </View>
                    <Icon name="chevronRight" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </Touch>
                </View>
              ))}
            </Card>
          </View>
        ))}

        <View style={styles.footer}>
          <AppText variant="caption" color="textMuted">
            CriczApp • Every Run. Every Ball. Live.
          </AppText>
        </View>
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  hubCard: {
    width: '48.5%',
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
  },
  hubTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hubIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
    marginLeft: space.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: space.xl,
  },
});
