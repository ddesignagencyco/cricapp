import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { displayName, useAuth } from '../../state/auth';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Screen, TabHeader } from '../../components/ui/Layout';
import { Card, Hairline, Tag } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, type Navigation } from '../../navigation/Stack';
import { usePrefs } from '../../state/prefs';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';

interface Item {
  label: string;
  icon: IconName;
  go?: (nav: Navigation) => void;
  tag?: string;
  color?: string;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Cricket',
    items: [
      { label: 'Pakistan', icon: 'flag', go: n => n.navigate('Pakistan') },
      { label: 'PSL', icon: 'trophy', go: n => n.navigate('Psl') },
      { label: 'Schedule & results', icon: 'calendar', go: n => n.navigate('Schedule') },
      { label: 'Series & tournaments', icon: 'layers', go: n => n.navigate('Series', { id: 'pak-sa-t20' }) },
      { label: 'Teams & players', icon: 'users', go: n => n.navigate('Search') },
      { label: 'Rankings', icon: 'listOrdered', go: n => n.navigate('Rankings') },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { label: 'Cricket tools', icon: 'calculator', go: n => n.navigate('Tools') },
      { label: 'Compare players', icon: 'gitCompare', go: n => n.navigate('Compare', { kind: 'players' }) },
      { label: 'Model performance', icon: 'chartLine', go: n => n.navigate('ModelPerformance') },
      { label: 'Odds intelligence', icon: 'scale', go: n => n.navigate('Odds'), tag: '18+' },
      { label: 'Fantasy XI', icon: 'wandSparkles', tag: 'SOON' },
      { label: 'Gallery', icon: 'image', go: n => n.navigate('Gallery') },
    ],
  },
  {
    title: 'You',
    items: [
      { label: 'Favourites', icon: 'heart', go: n => n.navigate('Favourites') },
      { label: 'Alerts', icon: 'bell', go: n => n.navigate('Alerts') },
      { label: 'Settings', icon: 'settings', go: n => n.navigate('Settings') },
    ],
  },
  {
    title: 'About',
    items: [
      { label: 'Editorial & corrections policy', icon: 'bookOpen' },
      { label: 'Contact us', icon: 'mail' },
      { label: 'Privacy & terms', icon: 'lock' },
    ],
  },
];

export default function MoreScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const teams = usePrefs().favouritesOf('team');
  const { user } = useAuth();
  return (
    <Screen>
      <TabHeader title="More" />
      <Body bottomInset={false}>
        <Card onPress={() => (user ? nav.navigate('Settings') : nav.navigate('SignIn'))} style={{ marginHorizontal: space.lg, marginTop: space.sm }}>
          <View style={styles.rowC}>
            {user ? (
              <Avatar name={displayName(user)} size={46} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.elevated }]}>
                <Icon name="user" size={22} color={colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="headline" weight="700" style={user ? { textTransform: 'capitalize' } : undefined}>
                {user ? displayName(user) : 'Sign in'}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {user ? user.email : 'Sync favourites and alerts across devices'}
              </AppText>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textMuted} />
          </View>
          {teams.length ? (
            <View style={[styles.rowC, { marginTop: 14, gap: 6 }]}>
              {teams.slice(0, 6).map(t => (
                <TeamBadge key={t} id={t} size={26} />
              ))}
              <AppText variant="caption" color="textMuted" style={{ marginLeft: 6 }}>
                {teams.length} favourite {teams.length === 1 ? 'team' : 'teams'}
              </AppText>
            </View>
          ) : null}
        </Card>

        {GROUPS.map(g => (
          <View key={g.title} style={{ marginTop: space.xl }}>
            <AppText variant="overline" color="textMuted" style={{ paddingHorizontal: space.lg + 4, marginBottom: space.sm }}>
              {g.title.toUpperCase()}
            </AppText>
            <Card padded={false} style={{ marginHorizontal: space.lg }}>
              {g.items.map((it, i) => (
                <View key={it.label}>
                  {i > 0 ? <Hairline inset={56} /> : null}
                  <Touch onPress={it.go ? () => it.go!(nav) : undefined} disabled={!it.go && it.tag === 'SOON'} style={styles.item}>
                    <Icon name={it.icon} size={20} color={colors.textSecondary} />
                    <AppText variant="body" weight="500" style={{ flex: 1, marginLeft: 16 }} color={it.tag === 'SOON' ? 'textMuted' : 'text'}>
                      {it.label}
                    </AppText>
                    {it.tag ? <Tag label={it.tag} tone={it.tag === '18+' ? 'warning' : 'neutral'} style={{ alignSelf: 'center' }} /> : null}
                    {it.go ? <Icon name="chevronRight" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} /> : null}
                  </Touch>
                </View>
              ))}
            </Card>
          </View>
        ))}
        <AppText variant="caption" color="textDisabled" align="center" style={{ marginTop: space.xxl }}>
          PAK CRICZONE · v0.1.0 (UI preview)
        </AppText>
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: space.lg },
});
