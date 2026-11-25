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

/** Initials on a CriczApp green disc, or the user's photo when they have one. */
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
        <Image source={{ uri: url }} fadeDuration={0} style={{ width: size, height: size }} />
      ) : (
        <AppText variant="title" weight="700" color="#FFFFFF" style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
          {initials || 'C'}
        </AppText>
      )}
    </View>
  );
}

/** Deep CriczApp navy-to-turf backdrop with subtle green glow and cricket ball watermark. */
function Backdrop() {
  return (
    <>
      <Gradient from="#0E3B22" to="#06152F" base="#06152F" />
      <Glow color="#16B800" size={240} opacity={0.28} style={{ left: -90, top: -130 }} />
      <View style={styles.ball} pointerEvents="none">
        <View style={styles.seam} />
      </View>
    </>
  );
}

/**
 * The CriczApp member pass: crisp navy + turf green hero card for account
 * status when signed in, or a clean Sign Up / Log In invitation when signed out.
 */
export function ProfilePass({ actions }: { actions?: React.ReactNode }) {
  const nav = useNavigation();
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.pass}>
        <Backdrop />
        <View style={styles.rowC}>
          <View style={styles.guestAvatar}>
            <Icon name="user" size={26} color="#80E800" />
          </View>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <AppText variant="section" weight="700" color="#FFFFFF" numberOfLines={1}>
              Guest
            </AppText>
            <AppText variant="caption" color="#CBD5E1" numberOfLines={2} style={{ marginTop: 2, lineHeight: 17 }}>
              Browsing as guest · Sign in to save favourites & join live chat
            </AppText>
          </View>
        </View>
        <View style={styles.passActions}>
          <Touch scale onPress={() => nav.navigate('SignUp')} style={[styles.passButton, styles.primaryBtn]} accessibilityLabel="Create account">
            <AppText variant="label" weight="700" color="#FFFFFF">
              Create account
            </AppText>
          </Touch>
          <Touch scale onPress={() => nav.navigate('SignIn')} style={[styles.passButton, styles.passGhost]} accessibilityLabel="Log in">
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
    <Touch
      scale={!actions}
      disabled={!!actions}
      onPress={() => nav.navigate('Settings')}
      style={styles.pass}
      accessibilityLabel={actions ? name : `${name}, open profile and settings`}
    >
      <Backdrop />
      <View style={styles.rowC}>
        <Portrait name={name} url={user.avatarUrl} size={56} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <AppText variant="section" weight="700" color="#FFFFFF" numberOfLines={1} style={{ textTransform: 'capitalize' }}>
            {name}
          </AppText>
          <View style={[styles.rowC, { marginTop: 4 }]}>
            <AppText variant="caption" color="#CBD5E1" numberOfLines={1} style={{ flexShrink: 1 }}>
              @{user.username}
            </AppText>
            {user.emailVerified ? (
              <View style={styles.verified}>
                <Icon name="shieldCheck" size={12} color="#80E800" />
                <AppText variant="micro" color="#DCFCE7" style={{ marginLeft: 4 }}>
                  Verified
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        {actions ? null : (
          <View style={styles.chevronPill}>
            <Icon name="chevronRight" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>
      {actions ? <View style={styles.passActions}>{actions}</View> : null}
    </Touch>
  );
}

/** Action buttons for the signed-in ProfilePass card. */
export function PassButton({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Touch scale onPress={onPress} style={[styles.passButton, ghost ? styles.passGhost : styles.whiteBtn]} accessibilityLabel={label}>
      <AppText variant="label" weight="700" color={ghost ? '#FFFFFF' : '#06152F'}>
        {label}
      </AppText>
    </Touch>
  );
}

const styles = StyleSheet.create({
  pass: {
    marginHorizontal: space.lg,
    borderRadius: radius.xl,
    padding: space.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(22,184,0,0.28)',
  },
  guestAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(22,184,0,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(128,232,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portrait: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#0F8231',
    borderWidth: 2,
    borderColor: '#80E800',
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: space.sm,
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(22,184,0,0.24)',
  },
  chevronPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    position: 'absolute',
    right: -65,
    top: -65,
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: 'rgba(128,232,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seam: {
    width: 92,
    height: 220,
    borderRadius: 115,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.09)',
    transform: [{ rotate: '35deg' }],
  },
  passActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  passButton: { flex: 1, height: control.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#16B800' },
  whiteBtn: { backgroundColor: '#FFFFFF' },
  passGhost: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  rowC: { flexDirection: 'row', alignItems: 'center' },
});
