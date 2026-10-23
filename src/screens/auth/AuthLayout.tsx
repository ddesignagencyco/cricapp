import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { PhotoHero } from '../../components/ui/PhotoHero';
import { BrandMark } from '../../components/ui/Layout';
import { IconButton } from '../../components/ui/Primitives';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

/** Floodlit stadium (Unsplash licence), 1440 × 900. */
const PHOTO = require('../../assets/images/auth_stadium.jpg');

/**
 * Shared shell for sign-in, sign-up and recovery: a stadium photo with the
 * PCZ mark and a straight edge, then the form on the page. The form scrolls
 * and lifts above the keyboard on small screens.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  compactHeader,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Shorter hero for steps with longer forms. */
  compactHeader?: boolean;
}) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const heroH = Math.round(Math.max(190, Math.min(height * (compactHeader ? 0.24 : 0.3), 290)) + insets.top);
  const logoH = compactHeader ? 40 : 52;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
          <PhotoHero source={PHOTO} ratio={1440 / 900} height={heroH} dim={0.3}>
            <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
              <IconButton icon="arrowLeft" label="Back" color="#FFFFFF" onPress={nav.goBack} />
            </View>
            <View style={[styles.brand, { paddingTop: insets.top }]}>
              <View style={styles.logoCard}>
                <BrandMark height={logoH} />
              </View>
              {!compactHeader ? (
                <AppText variant="label" weight="600" color="#DCE5FF" style={{ marginTop: space.md }}>
                  Pakistan’s home of cricket
                </AppText>
              ) : null}
            </View>
          </PhotoHero>
          <View style={[styles.panel, { paddingBottom: insets.bottom + space.xl }]}>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
                {subtitle}
              </AppText>
            ) : null}
            <View style={{ marginTop: space.xl }}>{children}</View>
            <View style={{ flex: 1 }} />
            {footer ? <View style={{ marginTop: space.xl }}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.sm, zIndex: 1 },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  panel: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.md },
});
