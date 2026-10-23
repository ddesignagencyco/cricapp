import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { FavouriteButton } from '../ui/FavouriteButton';
import type { FavouriteKind } from '../../state/prefs';
import { Glow } from '../ui/Primitives';

/** Large identity block for hubs and entity pages: colour bloom, mark, title, favourite. */
export function HubHeader({
  color,
  mark,
  overline,
  title,
  subtitle,
  favourite,
  children,
}: {
  color: string;
  mark: ReactNode;
  overline?: string;
  title: string;
  subtitle?: string;
  /** Shows the favourite toggle for this entity. */
  favourite?: { kind: FavouriteKind; id: string };
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Glow color={color} size={420} opacity={colors.scheme === 'dark' ? 0.24 : 0.14} style={{ left: -160, top: -260 }} />
      <View style={styles.row}>
        {mark}
        <View style={{ flex: 1, marginLeft: space.lg }}>
          {overline ? (
            <AppText variant="overline" color="textMuted">
              {overline}
            </AppText>
          ) : null}
          <AppText variant="display" numberOfLines={2} accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {favourite ? (
          <View style={[styles.fav, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <FavouriteButton kind={favourite.kind} id={favourite.id} label={title} />
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  fav: { borderRadius: 23, borderWidth: StyleSheet.hairlineWidth * 2, marginLeft: space.sm },
});
