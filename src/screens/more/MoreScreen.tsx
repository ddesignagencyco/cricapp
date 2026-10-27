import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProfilePass } from '../../components/cricket/ProfilePass';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Screen, TabHeader } from '../../components/ui/Layout';
import { Card, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, type Navigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space, control } from '../../theme/tokens';

interface Item {
  label: string;
  hint: string;
  icon: IconName;
  /** Each row keeps its own colour so the list can be scanned by colour. */
  color: string;
  go: (nav: Navigation) => void;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Cricket',
    items: [
      { label: 'PSL', hint: 'Table, fixtures and leaders', icon: 'trophy', color: '#E39B12', go: n => n.navigate('Psl') },
      { label: 'Upcoming fixtures', hint: 'Every match coming up', icon: 'calendar', color: '#3B68FC', go: n => n.navigate('Schedule') },
      { label: 'Series & tournaments', hint: 'All competitions we cover', icon: 'layers', color: '#7C5CFF', go: n => n.navigate('Tournaments') },
      { label: 'Find teams & players', hint: 'Search profiles and squads', icon: 'search', color: '#0EA5A4', go: n => n.navigate('Search') },
      { label: 'Live streams', hint: 'Where to watch', icon: 'tv', color: '#E5484D', go: n => n.navigate('Streams') },
      { label: 'Gallery', hint: 'Photos and short clips', icon: 'image', color: '#D6409F', go: n => n.navigate('Gallery') },
      { label: 'Cricket tools', hint: 'Run rates, compare, DLS', icon: 'calculator', color: '#1FA55B', go: n => n.navigate('Tools') },
    ],
  },
  {
    title: 'You',
    items: [
      { label: 'Favourites', hint: 'Teams, players and matches you saved', icon: 'heart', color: '#E5484D', go: n => n.navigate('Favourites') },
      { label: 'Newsletter', hint: 'Cricket in your inbox', icon: 'mail', color: '#F07A16', go: n => n.navigate('Alerts') },
      { label: 'Settings', hint: 'Profile, theme, language', icon: 'settings', color: '#64748B', go: n => n.navigate('Settings') },
    ],
  },
];

export default function MoreScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  return (
    <Screen>
      <TabHeader title="More" />
      <Body bottomInset={false} contentStyle={{ paddingTop: space.lg }}>
        <ProfilePass />

        {GROUPS.map(g => (
          <View key={g.title} style={{ marginTop: space.xl }}>
            <SectionHeader title={g.title} />
            <Card padded={false} style={{ marginHorizontal: space.lg }}>
              {g.items.map((it, i) => (
                <View key={it.label}>
                  {i > 0 ? <Hairline inset={space.lg + 38 + space.md} /> : null}
                  <Touch onPress={() => it.go(nav)} style={styles.item} accessibilityLabel={it.label}>
                    <View style={[styles.tile, { backgroundColor: `${it.color}1F` }]}>
                      <Icon name={it.icon} size={19} color={it.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <AppText variant="body" weight="600" numberOfLines={1}>
                        {it.label}
                      </AppText>
                      <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 1 }}>
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
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  pass: { marginHorizontal: space.lg, borderRadius: radius.xl, padding: space.lg, overflow: 'hidden' },
  portrait: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)' },
  passStats: { flexDirection: 'row', marginTop: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(255,255,255,0.22)' },
  passStat: { flex: 1, alignItems: 'center' },
  passStatDivider: { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: 'rgba(255,255,255,0.22)' },
  passActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  passButton: { flex: 1, height: control.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  passGhost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.sm },
  tile: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
