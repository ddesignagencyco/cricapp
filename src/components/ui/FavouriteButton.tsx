import React, { useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { usePrefs, type FavouriteKind } from '../../state/prefs';
import { useTheme } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Touch } from './Touch';

/** Heart toggle for any favouritable item, with a small pop on save. */
export function FavouriteButton({
  kind,
  id,
  label,
  variant = 'icon',
  color,
}: {
  kind: FavouriteKind;
  id: string;
  /** Spoken name, e.g. "Pakistan". */
  label: string;
  variant?: 'icon' | 'pill';
  color?: string;
}) {
  const { colors } = useTheme();
  const { isFavourite, toggleFavourite } = usePrefs();
  const on = isFavourite(kind, id);
  const pop = useRef(new Animated.Value(1)).current;

  const press = () => {
    if (!on) {
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }).start();
    }
    toggleFavourite(kind, id);
  };

  const icon = (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <Icon name={on ? 'heartFill' : 'heart'} size={variant === 'pill' ? 16 : 22} color={on ? colors.live : color ?? colors.text} />
    </Animated.View>
  );

  if (variant === 'pill') {
    return (
      <Touch
        onPress={press}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={on ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
        style={[styles.pill, on ? { backgroundColor: colors.liveSoft, borderColor: colors.liveSoft } : { backgroundColor: colors.elevated, borderColor: colors.border }]}
      >
        {icon}
        <AppText variant="label" weight="700" color={on ? 'live' : 'text'} style={{ marginLeft: 6 }}>
          {on ? 'Favourite' : 'Add to favourites'}
        </AppText>
      </Touch>
    );
  }
  return (
    <Touch
      borderless
      onPress={press}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={on ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      style={styles.icon}
    >
      {icon}
    </Touch>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
});
