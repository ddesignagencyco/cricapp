import React from 'react';
import { ActivityIndicator, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Primitives';

/** True when a scroll view is within ~1.5 screens of its end: time to fetch the next page. */
export function nearEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - layoutMeasurement.height * 1.5;
}

/** Footer for paged lists: spinner while the next page loads, a button as a fallback, nothing at the end. */
export function LoadMore({ hasMore, loading, onPress, count, label = 'Load more' }: { hasMore: boolean; loading: boolean; onPress: () => void; count: number; label?: string }) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (hasMore) {
    return (
      <View style={{ paddingVertical: space.lg, alignItems: 'center' }}>
        <Button label={label} variant="secondary" compact onPress={onPress} />
      </View>
    );
  }
  return count > 0 ? (
    <AppText variant="caption" color="textMuted" align="center" style={{ paddingVertical: space.xl }}>
      You’re all caught up
    </AppText>
  ) : null;
}
