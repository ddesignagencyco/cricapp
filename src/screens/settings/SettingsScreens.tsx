import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { displayName, useAuth } from '../../state/auth';
import { AppText } from '../../components/ui/AppText';
import { Segmented } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Button, Card, Glow, Hairline, SectionHeader, Tag } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { team } from '../../data/refs';
import { useNavigation } from '../../navigation/Stack';
import { usePrefs, type AlertPrefs } from '../../state/prefs';
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { notificationStatus, requestNotifications, type PermissionState } from '../../utils/permissions';

function ToggleRow({ icon, title, body, value, onChange }: { icon: IconName; title: string; body?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Touch onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={styles.toggle}>
      <Icon name={icon} size={20} color={colors.textSecondary} />
      <View style={{ flex: 1, marginLeft: 14, marginRight: 8 }}>
        <AppText variant="body" weight="500">
          {title}
        </AppText>
        {body ? (
          <AppText variant="caption" color="textMuted">
            {body}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.brand }}
        thumbColor="#FFFFFF"
        importantForAccessibility="no"
      />
    </Touch>
  );
}

function LinkRow({ icon, title, value, onPress }: { icon: IconName; title: string; value?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Touch onPress={onPress} style={styles.toggle}>
      <Icon name={icon} size={20} color={colors.textSecondary} />
      <AppText variant="body" weight="500" style={{ flex: 1, marginLeft: 14 }}>
        {title}
      </AppText>
      {value ? (
        <AppText variant="label" color="textMuted" style={{ marginRight: 6 }}>
          {value}
        </AppText>
      ) : null}
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Touch>
  );
}

export function SettingsScreen() {
  const nav = useNavigation();
  const { colors, preference, setPreference } = useTheme();
  const { newsLang, setNewsLang } = usePrefs();
  const [dataSaver, setDataSaver] = useState(false);
  const { user, signOut } = useAuth();
  return (
    <Screen>
      <Header title="Settings" />
      <Body>
        <Card style={{ marginHorizontal: space.lg, marginTop: space.sm, overflow: 'hidden' }}>
          <Glow color={colors.brand} size={240} opacity={0.22} style={{ right: -110, top: -120 }} />
          {user ? (
            <View style={styles.rowC}>
              <Avatar name={displayName(user)} size={48} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="headline" weight="700" style={{ textTransform: 'capitalize' }}>
                  {displayName(user)}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {user.email}
                </AppText>
              </View>
              <Button label="Sign out" variant="secondary" compact onPress={signOut} />
            </View>
          ) : (
            <>
              <AppText variant="headline" weight="700">
                Your account
              </AppText>
              <AppText variant="caption" color="textSecondary" style={{ marginTop: 4, marginBottom: 14 }}>
                Sign in to keep favourites, alerts and comments on every device.
              </AppText>
              <Button label="Sign in or create account" compact onPress={() => nav.navigate('SignIn')} />
            </>
          )}
        </Card>

        <SectionHeader title="Appearance" style={{ marginTop: space.xxl }} />
        <View style={{ paddingHorizontal: space.lg }}>
          <Segmented<ThemePreference>
            value={preference}
            onChange={setPreference}
            options={[
              { key: 'dark', label: 'Dark' },
              { key: 'light', label: 'Light' },
              { key: 'system', label: 'System' },
            ]}
          />
        </View>

        <SectionHeader title="Language" style={{ marginTop: space.xxl }} />
        <Card padded={false} style={{ marginHorizontal: space.lg }}>
          <View style={{ padding: space.lg }}>
            <AppText variant="label" weight="600" style={{ marginBottom: 10 }}>
              News language
            </AppText>
            <Segmented
              value={newsLang}
              onChange={setNewsLang}
              options={[
                { key: 'en', label: 'English' },
                { key: 'ur', label: 'اردو' },
              ]}
            />
          </View>
          <Hairline />
          <View style={[styles.toggle, { justifyContent: 'space-between' }]}>
            <Icon name="languages" size={20} color={colors.textSecondary} />
            <AppText variant="body" weight="500" style={{ flex: 1, marginLeft: 14 }}>
              App language
            </AppText>
            <Tag label="URDU UI SOON" style={{ alignSelf: "center" }} />
          </View>
        </Card>

        <SectionHeader title="Notifications & data" style={{ marginTop: space.xxl }} />
        <Card padded={false} style={{ marginHorizontal: space.lg }}>
          <LinkRow icon="bell" title="Alerts" onPress={() => nav.navigate('Alerts')} />
          <Hairline inset={52} />
          <LinkRow icon="heart" title="Favourites" onPress={() => nav.navigate('Favourites')} />
          <Hairline inset={52} />
          <ToggleRow icon="smartphone" title="Data saver" body="Lower-resolution images and slower refresh on mobile data" value={dataSaver} onChange={setDataSaver} />
        </Card>

        <SectionHeader title="About" style={{ marginTop: space.xxl }} />
        <Card padded={false} style={{ marginHorizontal: space.lg }}>
          <LinkRow icon="bookOpen" title="Editorial & corrections policy" />
          <Hairline inset={52} />
          <LinkRow icon="shieldCheck" title="How our predictions work" onPress={() => nav.navigate('ModelPerformance')} />
          <Hairline inset={52} />
          <LinkRow icon="lock" title="Privacy policy" />
          <Hairline inset={52} />
          <LinkRow icon="info" title="Version" value="0.1.0" />
        </Card>
      </Body>
    </Screen>
  );
}

const ALERTS: { key: keyof AlertPrefs; icon: IconName; title: string; body: string }[] = [
  { key: 'matchStart', icon: 'play', title: 'Match start & toss', body: 'When a favourite team takes the field' },
  { key: 'wickets', icon: 'circleDot', title: 'Wickets', body: 'Every wicket when your favourite teams play' },
  { key: 'milestones', icon: 'award', title: 'Milestones', body: 'Fifties, hundreds and five-fors' },
  { key: 'results', icon: 'trophy', title: 'Results', body: 'Final result and player of the match' },
  { key: 'breakingNews', icon: 'flame', title: 'Breaking news', body: 'Squads, injuries and major stories' },
  { key: 'predictionSwings', icon: 'trendingUpDown', title: 'Big prediction swings', body: 'When win probability moves 15+ points' },
];

export function AlertsScreen() {
  const nav = useNavigation();
  const { alerts, setAlert, favouritesOf } = usePrefs();
  const teams = favouritesOf('team');
  const { colors } = useTheme();
  const [perm, setPerm] = useState<PermissionState>('unknown');
  useEffect(() => {
    notificationStatus().then(setPerm);
  }, []);
  return (
    <Screen>
      <Header title="Alerts" />
      <Body>
        {/* Asked here, in context, rather than up front during the welcome. */}
        {perm !== 'granted' ? (
          <View style={[styles.permCard, { backgroundColor: colors.brand }]}>
            <Icon name="bellRing" size={24} color="#FFFFFF" />
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <AppText variant="headline" weight="700" color="#FFFFFF">
                Turn on notifications
              </AppText>
              <AppText variant="caption" color="#DCE4FF" style={{ marginTop: 2 }}>
                {perm === 'blocked' ? 'Notifications are off for this app. Enable them in system settings.' : 'Get wickets, results and breaking news as they happen.'}
              </AppText>
            </View>
            {perm === 'blocked' ? (
              <Button label="Settings" compact variant="secondary" onPress={() => Linking.openSettings()} />
            ) : (
              <Button label="Allow" compact variant="secondary" onPress={async () => setPerm(await requestNotifications())} />
            )}
          </View>
        ) : null}
        <Card padded={false} style={{ marginHorizontal: space.lg, marginTop: space.sm }}>
          {ALERTS.map((a, i) => (
            <View key={a.key}>
              {i > 0 ? <Hairline inset={52} /> : null}
              <ToggleRow icon={a.icon} title={a.title} body={a.body} value={alerts[a.key]} onChange={v => setAlert(a.key, v)} />
            </View>
          ))}
        </Card>
        <SectionHeader title="For your favourite teams" action="Manage" onAction={() => nav.navigate('Favourites')} style={{ marginTop: space.xxl }} />
        {!teams.length ? (
          <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg }}>
            Tap the heart on any team to get its alerts here.
          </AppText>
        ) : null}
        <View style={styles.wrap}>
          {teams.map(t => (
            <View key={t} style={[styles.teamPill]}>
              <TeamBadge id={t} size={28} />
              <AppText variant="label" weight="600" style={{ marginLeft: 8 }}>
                {team(t).name}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
          Push delivery is switched on once the notification service is connected to the backend.
        </AppText>
      </Body>
    </Screen>
  );
}

export function OddsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation();
  const [confirmed, setConfirmed] = useState(false);
  if (!confirmed) {
    return (
      <Screen>
        <Header title="Odds intelligence" />
        <Body contentStyle={{ paddingHorizontal: space.lg, paddingTop: space.xl }}>
          <View style={[styles.gateIcon, { backgroundColor: colors.warningSoft }]}>
            <Icon name="shieldCheck" size={30} color={colors.warning} />
          </View>
          <AppText variant="display" style={{ marginTop: space.xl }}>
            For adults only
          </AppText>
          <AppText variant="body" color="textSecondary" style={{ marginTop: space.md }}>
            This section compares prices from licensed sources as analysis. We don't take bets or link to bookmakers. Availability depends on your region.
          </AppText>
          <View style={{ gap: space.md, marginTop: space.xl }}>
            {['Licensed feeds only, with source and update time on every price', 'Model probability shown beside market probability', 'No guaranteed-profit claims, ever'].map(t => (
              <View key={t} style={styles.rowC}>
                <Icon name="check" size={18} color={colors.success} />
                <AppText variant="label" color="text" style={{ marginLeft: 10, flex: 1 }}>
                  {t}
                </AppText>
              </View>
            ))}
          </View>
          <Button label="I am 18 or older" style={{ marginTop: space.xxxl }} onPress={() => setConfirmed(true)} />
          <Button label="Use the odds converter instead" variant="ghost" style={{ marginTop: space.sm }} onPress={() => nav.navigate('Tool', { id: 'odds' })} />
        </Body>
      </Screen>
    );
  }
  const rows = [
    { src: 'Source A', pak: 2.55, sa: 1.52, at: '2m' },
    { src: 'Source B', pak: 2.62, sa: 1.5, at: '1m' },
    { src: 'Source C', pak: 2.48, sa: 1.55, at: '4m' },
  ];
  const best = Math.max(...rows.map(r => r.pak));
  return (
    <Screen>
      <Header title="Odds intelligence" subtitle="PAK vs SA · 2nd T20I · Match winner" />
      <Body>
        <View style={[styles.sample, { backgroundColor: colors.warningSoft }]}>
          <AppText variant="micro" color="warning">
            SAMPLE LAYOUT — NOT LIVE PRICES. LICENSED FEEDS CONNECT IN PHASE 5.
          </AppText>
        </View>
        <Card padded={false} style={{ marginHorizontal: space.lg, marginTop: space.md }}>
          <View style={[styles.oddsHead, { backgroundColor: colors.elevated }]}>
            <AppText variant="micro" color="textMuted" style={{ flex: 1 }}>
              SOURCE
            </AppText>
            <AppText variant="micro" color="textMuted" style={styles.oddsCol}>
              PAK
            </AppText>
            <AppText variant="micro" color="textMuted" style={styles.oddsCol}>
              SA
            </AppText>
          </View>
          {rows.map((r, i) => (
            <View key={r.src}>
              {i > 0 ? <Hairline /> : null}
              <View style={styles.oddsRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" weight="600">
                    {r.src}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    Updated {r.at} ago
                  </AppText>
                </View>
                <View style={[styles.oddsCol, r.pak === best && { backgroundColor: colors.successSoft, borderRadius: radius.xs }]}>
                  <AppText variant="headline" weight="700" tabular align="center" color={r.pak === best ? 'success' : 'text'}>
                    {r.pak.toFixed(2)}
                  </AppText>
                </View>
                <AppText variant="headline" weight="700" tabular style={styles.oddsCol}>
                  {r.sa.toFixed(2)}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
        <SectionHeader title="Model vs market" style={{ marginTop: space.xxl }} />
        <Card style={{ marginHorizontal: space.lg }}>
          {[
            { label: 'Market (no margin)', p: 0.38 },
            { label: 'Our model', p: 0.35 },
          ].map(x => (
            <View key={x.label} style={{ marginBottom: 14 }}>
              <View style={styles.rowC}>
                <AppText variant="label" color="textSecondary" style={{ flex: 1 }}>
                  {x.label}
                </AppText>
                <AppText variant="label" weight="700" tabular>
                  PAK {Math.round(x.p * 100)}%
                </AppText>
              </View>
              <View style={[styles.mvm, { backgroundColor: colors.elevated }]}>
                <View style={{ width: `${x.p * 100}%`, height: 6, borderRadius: 3, backgroundColor: team('pak').color }} />
              </View>
            </View>
          ))}
          <AppText variant="caption" color="textMuted">
            Analytical comparison only. Differences are not betting advice.
          </AppText>
        </Card>
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  permCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginTop: space.sm, marginBottom: space.md, padding: space.lg, borderRadius: radius.lg },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 60, paddingVertical: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg },
  teamPill: { flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  followRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: space.sm, minHeight: 58 },
  star: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  gateIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sample: { marginHorizontal: space.lg, marginTop: space.sm, padding: space.md, borderRadius: radius.sm },
  oddsHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 8 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 60 },
  oddsCol: { width: 72, textAlign: 'center', paddingVertical: 6 },
  mvm: { height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
});
