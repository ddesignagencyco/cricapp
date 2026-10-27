import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '../../components/cricket/Badges';
import { displayName, useAuth } from '../../state/auth';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Screen, TabHeader } from '../../components/ui/Layout';
import { Card, Hairline } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, type Navigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';

interface Item {
  label: string;
  icon: IconName;
  go: (nav: Navigation) => void;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Cricket',
    items: [
      { label: 'PSL', icon: 'trophy', go: n => n.navigate('Psl') },
      { label: 'Upcoming fixtures', icon: 'calendar', go: n => n.navigate('Schedule') },
      { label: 'Series & tournaments', icon: 'layers', go: n => n.navigate('Tournaments') },
      { label: 'Find teams & players', icon: 'search', go: n => n.navigate('Search') },
      { label: 'Live streams', icon: 'tv', go: n => n.navigate('Streams') },
      { label: 'Gallery', icon: 'image', go: n => n.navigate('Gallery') },
      { label: 'Cricket tools', icon: 'calculator', go: n => n.navigate('Tools') },
    ],
  },
  {
    title: 'You',
    items: [
      { label: 'Favourites', icon: 'heart', go: n => n.navigate('Favourites') },
      { label: 'Newsletter', icon: 'mail', go: n => n.navigate('Alerts') },
      { label: 'Settings', icon: 'settings', go: n => n.navigate('Settings') },
    ],
  },
];

export default function MoreScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
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
                {user ? user.email : 'Comment, react and manage your profile'}
              </AppText>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textMuted} />
          </View>
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
                  <Touch onPress={() => it.go(nav)} style={styles.item}>
                    <Icon name={it.icon} size={20} color={colors.textSecondary} />
                    <AppText variant="body" weight="500" style={{ flex: 1, marginLeft: 16 }}>
                      {it.label}
                    </AppText>
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
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space.lg, paddingVertical: 4 },
});
