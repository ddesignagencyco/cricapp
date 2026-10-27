import React, { useState } from 'react';
import { KeyboardAvoidingView, Linking, StyleSheet, TextInput, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Field } from '../../components/ui/Form';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Button, Card, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { EDITORIAL_FALLBACK } from '../../data/editorial';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useParams } from '../../navigation/Stack';
import { isEmail, useAuth } from '../../state/auth';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space, control } from '../../theme/tokens';
import { shortDate } from '../../utils/format';

/** CMS HTML → paragraphs (the app has no HTML renderer; headings become their own lines). */
const toParagraphs = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/<\/(?:p|h\d|li)>|\n{2,}/i)
    .map(s =>
      s
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim(),
    )
    .filter(Boolean);

/** A policy page: the admins' CMS copy when published, otherwise the website's built-in copy. */
export function EditorialScreen() {
  const { slug, title } = useParams('Editorial');
  const { colors } = useTheme();
  const { data, loading } = useQuery(`editorial:${slug}`, () => repo.editorialPage(slug).catch(() => undefined));
  const fallback = EDITORIAL_FALLBACK[slug];

  return (
    <Screen>
      <Header title={title} />
      {loading ? (
        <SkeletonList count={3} height={100} />
      ) : (
        <Body contentStyle={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
          {data ? (
            <>
              <AppText variant="display">{data.title}</AppText>
              {data.updatedAt ? (
                <AppText variant="caption" color="textMuted" style={{ marginTop: 6 }}>
                  Updated {shortDate(data.updatedAt)}
                </AppText>
              ) : null}
              {toParagraphs(data.content).map((p, i) => (
                <AppText key={i} variant="body" style={styles.para}>
                  {p}
                </AppText>
              ))}
            </>
          ) : fallback ? (
            <>
              <AppText variant="display">{fallback.title}</AppText>
              {fallback.updatedAt ? (
                <AppText variant="caption" color="textMuted" style={{ marginTop: 6 }}>
                  Updated {shortDate(fallback.updatedAt)}
                </AppText>
              ) : null}
              <AppText variant="body" color="textSecondary" style={styles.para}>
                {fallback.intro}
              </AppText>
              {fallback.sections.map((s, i) => (
                <View key={i} style={{ marginTop: space.xl }}>
                  {s.title ? (
                    <AppText variant="headline" weight="700" style={{ marginBottom: 6 }}>
                      {s.title}
                    </AppText>
                  ) : null}
                  <AppText variant="body" color="textSecondary" style={{ lineHeight: 24 }}>
                    {s.text}
                  </AppText>
                </View>
              ))}
              {fallback.outro ? (
                <View style={[styles.note, { backgroundColor: colors.brandSoft }]}>
                  <AppText variant="label" color="text">
                    {fallback.outro}
                  </AppText>
                </View>
              ) : null}
            </>
          ) : (
            <AppText variant="body" color="textSecondary">
              This page has no published content yet.
            </AppText>
          )}
        </Body>
      )}
    </Screen>
  );
}

const SOCIAL_ICON: Record<string, IconName> = {
  whatsapp: 'messageCircle',
  telegram: 'send',
  email: 'mail',
  website: 'globe',
};

/** "@handle" / bare id → a URL for the platform; full URLs pass through (the website's rules). */
function socialHref(platform: string, value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  const p = platform.toLowerCase();
  if (p === 'whatsapp') return `https://wa.me/${v.replace(/\D/g, '')}`;
  if (p === 'telegram') return `https://t.me/${handle}`;
  if (p === 'x' || p === 'twitter') return `https://x.com/${handle}`;
  if (p === 'instagram') return `https://instagram.com/${handle}`;
  if (p === 'facebook') return `https://facebook.com/${handle}`;
  if (p === 'youtube') return `https://youtube.com/@${handle}`;
  if (p === 'tiktok') return `https://tiktok.com/@${handle}`;
  return v;
}

/** Contact details from the admins' site settings, the social links, and the contact form. */
export function ContactScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const settings = useQuery('site-settings', () => repo.siteSettings().catch(() => null));
  const s = settings.data;
  const [name, setName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  const details = s
    ? (
        [
          ['mail', 'Email', s.email, s.email && `mailto:${s.email}`],
          ['send', 'Support', s.supportEmail, s.supportEmail && `mailto:${s.supportEmail}`],
          ['smartphone', 'Phone', s.phone, s.phone && `tel:${s.phone.replace(/\s/g, '')}`],
          ['messageCircle', 'WhatsApp', s.whatsapp, s.whatsapp && socialHref('whatsapp', s.whatsapp)],
          ['mapPin', 'Address', [s.address, s.city, s.country].filter(Boolean).join(', '), null],
          ['clock', 'Hours', s.workingHours, null],
        ] as [IconName, string, string | null, string | null | false][]
      ).filter(([, , v]) => v)
    : [];
  const socials = (s?.socials ?? []).filter(x => x.platform?.trim() && x.value?.trim());

  const send = async () => {
    if (busy) return;
    if (name.trim().length < 2) return setError('Enter your name');
    if (!isEmail(email)) return setError('Enter a valid email address');
    if (message.trim().length < 10) return setError('Write a little more so we can help');
    setError(undefined);
    setBusy(true);
    try {
      await repo.contact({ name: name.trim(), email: email.trim(), message: message.trim() });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Contact us" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Body keyboardShouldPersistTaps="handled">
          {details.length ? (
            <Card padded={false} style={styles.card}>
              {details.map(([icon, label, value, href], i) => (
                <View key={label}>
                  {i > 0 ? <Hairline inset={space.lg + 36 + space.md} /> : null}
                  <Touch disabled={!href} onPress={() => href && Linking.openURL(href)} style={styles.detail}>
                    <View style={[styles.detailIcon, { backgroundColor: colors.brandSoft }]}>
                      <Icon name={icon} size={16} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <AppText variant="caption" color="textMuted">
                        {label}
                      </AppText>
                      <AppText variant="label" weight="600" color={href ? 'accent' : 'text'}>
                        {value}
                      </AppText>
                    </View>
                  </Touch>
                </View>
              ))}
            </Card>
          ) : null}

          {socials.length ? (
            <>
              <SectionHeader title="Follow us" style={{ marginTop: space.xl }} />
              <View style={styles.socials}>
                {socials.map(x => (
                  <Touch key={x.platform + x.value} onPress={() => Linking.openURL(socialHref(x.platform, x.value))} style={[styles.social, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                    <Icon name={SOCIAL_ICON[x.platform.toLowerCase()] ?? 'externalLink'} size={16} color={colors.accent} />
                    <AppText variant="label" weight="600" style={{ marginLeft: 8, textTransform: 'capitalize' }}>
                      {x.platform}
                    </AppText>
                  </Touch>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="Send us a message" style={{ marginTop: details.length || socials.length ? space.xl : 0 }} />
          <View style={{ paddingHorizontal: space.lg }}>
            {sent ? (
              <View style={[styles.note, { backgroundColor: colors.successSoft, flexDirection: 'row', alignItems: 'center', marginTop: 0 }]}>
                <Icon name="check" size={18} color={colors.success} />
                <AppText variant="label" color={colors.success} style={{ flex: 1, marginLeft: 10 }}>
                  Thanks — your message has reached the team.
                </AppText>
              </View>
            ) : (
              <>
                <Field label="Your name" icon="user" value={name} onChangeText={setName} placeholder="Ali Raza" autoCapitalize="words" />
                <Field label="Email address" icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                <AppText variant="label" weight="600" color="textSecondary" style={{ marginBottom: 6 }}>
                  Message
                </AppText>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={5000}
                  placeholder="How can we help?"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.message, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontFamily: fontFamily['400'] }]}
                />
                {error ? (
                  <AppText variant="caption" color="danger" style={{ marginTop: 8 }}>
                    {error}
                  </AppText>
                ) : null}
                <View style={{ marginTop: space.lg }}>
                  <Button label={busy ? 'Sending…' : 'Send message'} onPress={send} />
                </View>
              </>
            )}
          </View>
        </Body>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  para: { marginTop: space.md, lineHeight: 24 },
  note: { marginTop: space.xl, padding: space.lg, borderRadius: radius.md },
  card: { marginHorizontal: space.lg },
  detail: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 60 },
  detailIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  socials: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg },
  social: { flexDirection: 'row', alignItems: 'center', height: control.md, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth * 2 },
  message: { minHeight: 130, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.md, fontSize: 15, textAlignVertical: 'top' },
});
