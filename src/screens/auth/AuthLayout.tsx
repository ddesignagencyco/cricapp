import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { BrandMark } from '../../components/ui/Layout';
import { Glow, IconButton } from '../../components/ui/Primitives';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';

/**
 * Shared shell for sign-in, sign-up and recovery: a clean page with the
 * back arrow, the PCZ mark centred, a left-aligned title and the form.
 * A faint brand-blue bloom in the corner is the only decoration. The form
 * scrolls and lifts above the keyboard on small screens.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  hideBack,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  hideBack?: boolean;
}) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Glow color={colors.brand} size={360} opacity={colors.scheme === 'dark' ? 0.18 : 0.12} style={{ right: -170, top: -150 }} />
      <Glow color={colors.brand} size={300} opacity={colors.scheme === 'dark' ? 0.12 : 0.08} style={{ left: -160, bottom: -140 }} />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xl }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            {!hideBack && nav.canGoBack() ? <IconButton icon="arrowLeft" label="Back" onPress={nav.goBack} /> : <View style={styles.backSpace} />}
          </View>
          <View style={styles.brand}>
            <BrandMark height={40} />
          </View>
          <AppText variant="display" accessibilityRole="header" style={styles.title}>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl },
  topRow: { height: 48, flexDirection: 'row', alignItems: 'center', marginLeft: -12 },
  backSpace: { width: 44, height: 44 },
  brand: { alignItems: 'center', marginTop: space.xs, marginBottom: space.xxl },
  title: { fontSize: 28, lineHeight: 34 },
});
