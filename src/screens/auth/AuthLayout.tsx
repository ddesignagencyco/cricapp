import React, { type ReactNode } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { BrandMark } from '../../components/ui/Layout';
import { Fade, IconButton } from '../../components/ui/Primitives';
import { Waves } from '../../components/ui/Waves';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

const PHOTO = require('../../assets/images/onboard_hubs.jpg');
const RATIO = 1080 / 1620;

/**
 * Shared shell for sign-in, sign-up and recovery: a photo header with the
 * logo, a static wave edge, and the form on the panel. The form scrolls
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
  /** Shorter photo for steps with longer forms. */
  compactHeader?: boolean;
}) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const headerH = Math.max(180, Math.min(height * (compactHeader ? 0.24 : 0.3), 300)) + insets.top;
  const imgW = Math.max(width, headerH * RATIO);
  const imgH = imgW / RATIO;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={{ height: headerH, overflow: 'hidden', backgroundColor: '#0B1631' }}>
            <Image
              source={PHOTO}
              resizeMode="cover"
              style={{ position: 'absolute', width: imgW, height: imgH, left: (width - imgW) / 2, top: (headerH - imgH) / 2 }}
            />
            <Fade color="#03060C" height={140} opacity={0.7} style={{ position: 'absolute', top: 0 }} />
            <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
              <IconButton icon="arrowLeft" label="Back" color="#FFFFFF" onPress={nav.goBack} />
              <View style={{ flex: 1 }} />
              <View style={styles.logoPill}>
                <BrandMark height={22} />
              </View>
            </View>
            <Waves color={colors.background} accent={colors.brand} height={70} />
          </View>
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
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm },
  logoPill: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginRight: space.sm },
  panel: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
});
