import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipPlayer, WebPlayer, isClip, youtubeId } from '../../components/media/Players';
import { AppText } from '../../components/ui/AppText';
import { Icon } from '../../components/ui/Icon';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, useParams } from '../../navigation/Stack';
import { LightStatusBar } from '../../components/ui/Layout';
import { space } from '../../theme/tokens';

/** Plays a stream or video inside the app: a 16:9 player for videos, the full screen for pages. */
export default function WatchScreen() {
  const { url, title, subtitle } = useParams('Watch');
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const video = isClip(url) || !!youtubeId(url);

  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <LightStatusBar />
      <View style={styles.bar}>
        <Touch borderless onPress={nav.goBack} style={styles.close} accessibilityLabel="Close">
          <Icon name="x" size={22} color="#FFFFFF" />
        </Touch>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <AppText variant="label" weight="700" color="#FFFFFF" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="#9AA3B8" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {video ? (
        <View style={styles.stage}>
          {isClip(url) ? (
            <ClipPlayer uri={url} style={{ width, height: (width * 9) / 16 }} />
          ) : (
            <WebPlayer url={url} style={{ width, height: (width * 9) / 16 }} />
          )}
        </View>
      ) : (
        <WebPlayer url={url} style={{ flex: 1, marginBottom: insets.bottom }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, minHeight: 56 },
  close: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, justifyContent: 'center' },
});
