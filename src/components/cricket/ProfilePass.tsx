import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useNavigation } from '../../navigation/Stack';
import { displayName, useAuth } from '../../state/auth';
import { control, radius, space } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { Gradient } from '../ui/Gradient';
import { Icon } from '../ui/Icon';
import { Glow } from '../ui/Primitives';
import { Touch } from '../ui/Touch';

/** Initials on a brand disc, or the user's photo when they have one. */
function Portrait({ name, url, size }: { name: string; url?: string | null; size: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');
  return (
    <View style={[styles.portrait, { width: size, height: size, borderRadius: size / 2 }]}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} />
      ) : (
        <AppText variant="title" weight="700" color="#FFFFFF" style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
          {initials}
        </AppText>
      )}
    </View>
  );
}

/** The pass background: deep blue, a soft light, and a large ball seam in the corner. */
function Backdrop() {
  return (
    <>
      <Gradient from="#3B68FC" to="#16308F" base="#0B1E5B" />
      <Glow color="#7FA2FF" size={240} opacity={0.3} style={{ left: -100, top: -130 }} />
      <View style={styles.ball} pointerEvents="none">
        <View style={styles.seam} />
      </View>
    </>
  );
}

/**
 * The profile as a member's pass: who you are and what you follow, on the
 * app's blue. Signed out, the same card invites you in.
 */
export function ProfilePass({ actions }: { actions?: React.ReactNode }) {
  const nav = useNavigation();
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.pass}>
        <Backdrop />
        <AppText variant="section" color="#FFFFFF">
          Join PAK CRICZONE
        </AppText>
        <AppText variant="bodySm" color="#D6E0FF" style={{ marginTop: 6, maxWidth: 300 }}>
          Save teams and players, react to matches and chat while they’re live.
        </AppText>
        <View style={styles.passActions}>
          <Touch scale onPress={() => nav.navigate('SignUp')} style={[styles.passButton, { backgroundColor: '#FFFFFF' }]} accessibilityLabel="Create account">
            <AppText variant="label" weight="700" color="#1C3FB8">
              Create account
            </AppText>
          </Touch>
          <Touch onPress={() => nav.navigate('SignIn')} style={[styles.passButton, styles.passGhost]} accessibilityLabel="Log in">
            <AppText variant="label" weight="700" color="#FFFFFF">
              Log in
            </AppText>
          </Touch>
        </View>
      </View>
    );
  }

  const name = displayName(user);
  return (
    <Touch scale={!actions} disabled={!!actions} onPress={() => nav.navigate('Settings')} style={styles.pass} accessibilityLabel={actions ? name : `${name}, open profile and settings`}>
      <Backdrop />
      <View style={styles.rowC}>
        <Portrait name={name} url={user.avatarUrl} size={60} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <AppText variant="section" color="#FFFFFF" numberOfLines={1} style={{ textTransform: 'capitalize' }}>
            {name}
          </AppText>
          <View style={[styles.rowC, { marginTop: 4 }]}>
            <AppText variant="caption" color="#C9D6FF" numberOfLines={1} style={{ flexShrink: 1 }}>
              @{user.username}
            </AppText>
            {user.emailVerified ? (
              <View style={styles.verified}>
                <Icon name="shieldCheck" size={12} color="#9FE3B8" />
                <AppText variant="micro" color="#CFF5DD" style={{ marginLeft: 4 }}>
                  Verified
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        {actions ? null : <Icon name="chevronRight" size={18} color="#C9D6FF" />}
      </View>
      {actions ? <View style={styles.passActions}>{actions}</View> : null}
    </Touch>
  );
}

/** Buttons for the pass's blue: a solid white one and an outlined one. */
export function PassButton({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Touch scale={!ghost} onPress={onPress} style={[styles.passButton, ghost ? styles.passGhost : { backgroundColor: '#FFFFFF' }]} accessibilityLabel={label}>
      <AppText variant="label" weight="700" color={ghost ? '#FFFFFF' : '#1C3FB8'}>
        {label}
      </AppText>
    </Touch>
  );
}

const styles = StyleSheet.create({
  pass: { marginHorizontal: space.lg, borderRadius: radius.xl, padding: space.lg, overflow: 'hidden' },
  portrait: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#5B82FF', borderWidth: 2.5, borderColor: '#FFFFFF' },
  verified: { flexDirection: 'row', alignItems: 'center', marginLeft: space.sm, paddingHorizontal: 7, height: 20, borderRadius: 10, backgroundColor: 'rgba(31,165,91,0.28)' },
  // A cricket ball's outline and seam, faint, off the top-right corner.
  ball: { position: 'absolute', right: -70, top: -70, width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  seam: { width: 96, height: 230, borderRadius: 120, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', transform: [{ rotate: '35deg' }] },
  passActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  passButton: { flex: 1, height: control.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  passGhost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
  rowC: { flexDirection: 'row', alignItems: 'center' },
});
