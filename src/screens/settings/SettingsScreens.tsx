import React, { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { useQuery } from '../../data/useQuery';
import { errorMessage } from '../../api/client';
import { Field } from '../../components/ui/Form';
import { repo } from '../../data/repo';
import { isEmail, useAuth } from '../../state/auth';
import { AppText } from '../../components/ui/AppText';
import { Segmented } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Button, Card, EmptyState, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation } from '../../navigation/Stack';
import { usePrefs } from '../../state/prefs';
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { PassButton, ProfilePass } from '../../components/cricket/ProfilePass';

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

const ABOUT: { slug: string; title: string; icon: IconName; cmsOnly?: boolean }[] = [
  { slug: 'about', title: 'About PAK CRICZONE', icon: 'info' },
  { slug: 'editorial-policy', title: 'Editorial policy', icon: 'bookOpen', cmsOnly: true },
  { slug: 'corrections', title: 'Corrections', icon: 'squarePen', cmsOnly: true },
  { slug: 'privacy', title: 'Privacy policy', icon: 'lock' },
  { slug: 'terms', title: 'Terms of service', icon: 'shield' },
];

export function SettingsScreen() {
  const nav = useNavigation();
  const published = useQuery('editorial:published', () =>
    Promise.all(ABOUT.filter(p => p.cmsOnly).map(p => repo.editorialPage(p.slug).then(x => (x ? p.slug : null)).catch(() => null))),
  );
  const aboutPages = ABOUT.filter(p => !p.cmsOnly || published.data?.includes(p.slug));
  const { preference, setPreference } = useTheme();
  const { newsLang, setNewsLang } = usePrefs();
  const { user, signOut } = useAuth();
  return (
    <Screen>
      <Header title="Settings" />
      <Body>
        <View style={{ marginTop: space.sm }}>
          <ProfilePass
            actions={
              user ? (
                <>
                  <PassButton label="Edit profile" onPress={() => nav.navigate('EditProfile')} />
                  <PassButton label="Sign out" ghost onPress={signOut} />
                </>
              ) : undefined
            }
          />
        </View>

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
        </Card>

        <SectionHeader title="About" style={{ marginTop: space.xxl }} />
        <Card padded={false} style={{ marginHorizontal: space.lg }}>
          {aboutPages.map((p, i) => (
            <View key={p.slug}>
              {i > 0 ? <Hairline inset={52} /> : null}
              <LinkRow icon={p.icon} title={p.title} onPress={() => nav.navigate('Editorial', { slug: p.slug, title: p.title })} />
            </View>
          ))}
          <Hairline inset={52} />
          <LinkRow icon="send" title="Contact us" onPress={() => nav.navigate('Contact')} />
          <Hairline inset={52} />
          <LinkRow icon="info" title="Version" value="0.1.0" />
        </Card>
      </Body>
    </Screen>
  );
}

/** The newsletter types the API sends (cric_info newsletter-templates), in its own words. */
const NEWSLETTERS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'newspaper', title: 'Daily digest', body: 'Top stories, results and fixtures every morning (only on days with real news).' },
  { icon: 'calendar', title: 'Weekly roundup', body: 'The week in cricket, every Sunday.' },
  { icon: 'sparkles', title: 'Match previews', body: 'Before Pakistan and PSL matches, with our win prediction.' },
  { icon: 'trophy', title: 'PSL updates', body: 'Points table, top performers and fixtures during the PSL.' },
  { icon: 'flame', title: 'Breaking news', body: 'Major verified stories, rarely.' },
];

/** Newsletter sign-up. Which emails arrive is managed from the link in every newsletter (the API keys preferences to it). */
export function AlertsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>();
  const [error, setError] = useState<string>();

  const subscribe = async () => {
    const value = email.trim();
    if (busy) return;
    if (!isEmail(value)) return setError('Enter a valid email address');
    setError(undefined);
    setBusy(true);
    try {
      await repo.subscribeNewsletter(value);
      setDone(value);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Newsletter" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Body keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: space.lg }}>
            <AppText variant="display">Cricket in your inbox</AppText>
            <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
              Subscribe once and get these emails. Turn any of them off from the link at the bottom of every newsletter.
            </AppText>
          </View>

          <View style={{ marginTop: space.lg }}>
            {NEWSLETTERS.map((n, i) => (
              <View key={n.title}>
                {i > 0 ? <Hairline inset={space.lg + 40} /> : null}
                <View style={styles.newsletterRow}>
                  <View style={[styles.newsletterIcon, { backgroundColor: colors.brandSoft }]}>
                    <Icon name={n.icon} size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <AppText variant="label" weight="700">
                      {n.title}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                      {n.body}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
            {done ? (
              <View style={[styles.done, { backgroundColor: colors.successSoft }]}>
                <Icon name="check" size={18} color={colors.success} />
                <AppText variant="label" color={colors.success} style={{ flex: 1, marginLeft: 10 }}>
                  Subscribed. A welcome email is on its way to {done}.
                </AppText>
              </View>
            ) : (
              <>
                <Field
                  label="Email address"
                  icon="mail"
                  value={email}
                  onChangeText={v => {
                    setEmail(v);
                    if (error) setError(undefined);
                  }}
                  error={error}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={subscribe}
                />
                <Button label={busy ? 'Subscribing…' : 'Subscribe'} onPress={subscribe} />
                <AppText variant="caption" color="textMuted" style={{ marginTop: space.md }}>
                  We only use your email for these newsletters. Unsubscribe any time.
                </AppText>
              </>
            )}
          </View>
        </Body>
      </KeyboardAvoidingView>
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
  // The API stores licensed odds snapshots per match; none are stored yet, so show that plainly.
  return (
    <Screen>
      <Header title="Odds intelligence" />
      <Body>
        <EmptyState
          icon="scale"
          title="No licensed prices yet"
          body="Prices from licensed sources appear here, with the source and update time, once odds feeds are connected. Until then, the converter turns any price into a probability."
        />
        <View style={{ paddingHorizontal: space.lg }}>
          <Button label="Open the odds converter" onPress={() => nav.navigate('Tool', { id: 'odds' })} />
        </View>
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
  newsletterRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: space.lg, paddingVertical: space.md },
  newsletterIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', padding: space.md, borderRadius: radius.md },
  star: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  gateIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
