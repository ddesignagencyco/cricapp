import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'react-native';
import Video, { ResizeMode, ViewType } from 'react-native-video';
import { WebView } from 'react-native-webview';
import { SITE_URL } from '../../config';
import { AppText } from '../ui/AppText';

/*
 * In-app playback. Cloudinary clips (shorts, gallery videos) play in the
 * native player; YouTube streams play in YouTube's embedded player (the only
 * way their terms allow); other pages (a channel, a provider) open in an
 * in-app web view instead of leaving the app.
 */

/** "https://www.youtube.com/watch?v=ID", "youtu.be/ID", "/live/ID", "/embed/ID" → "ID". */
export function youtubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ??
    url.match(/youtu\.be\/([\w-]{11})/) ??
    url.match(/youtube\.com\/(?:embed|live|shorts)\/([\w-]{11})/);
  return m ? m[1] : null;
}

/**
 * Cloudinary clips are uploaded at full size (some are 4K, 30+ MB). Ask for a
 * 720p rendition instead: a fraction of the data, and phones decode it easily.
 */
export function lightClip(url: string) {
  return url.includes('res.cloudinary.com') && /\/video\/upload\/(?!c_limit)/.test(url)
    ? url.replace('/video/upload/', '/video/upload/c_limit,w_720,q_auto/')
    : url;
}

/** A direct media file the native player can open. */
export const isClip = (url: string) => /\.(mp4|m3u8|mov|webm)(\?|$)/i.test(url) || /\/video\/upload\//.test(url);

function Loading() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      <ActivityIndicator color="#FFFFFF" />
    </View>
  );
}

/** Native clip player. `controls` for videos; shorts loop without chrome. */
export function ClipPlayer({
  uri,
  paused,
  loop,
  controls = true,
  cover,
  poster,
  style,
}: {
  uri: string;
  paused?: boolean;
  loop?: boolean;
  controls?: boolean;
  cover?: boolean;
  /** Shown until the first frame is ready. */
  poster?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.black, style]}>
      <Video
        source={{ uri: lightClip(uri) }}
        style={StyleSheet.absoluteFill}
        resizeMode={cover ? ResizeMode.COVER : ResizeMode.CONTAIN}
        paused={paused}
        repeat={loop}
        controls={controls}
        playInBackground={false}
        // TextureView composes with the overlays drawn on top (a SurfaceView can stay black under them).
        viewType={ViewType.TEXTURE}
        onReadyForDisplay={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      {/* Poster over the (opaque) video surface until the first frame lands. */}
      {poster && !ready ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode={cover ? 'cover' : 'contain'} /> : null}
      {!ready && !failed ? <Loading /> : null}
      {failed ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <AppText variant="label" color="#FFFFFF">
            This video can’t be played right now.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** YouTube's embedded player, or an in-app page for anything that isn't a single video. */
export function WebPlayer({ url, style }: { url: string; style?: StyleProp<ViewStyle> }) {
  const [loading, setLoading] = useState(true);
  const id = youtubeId(url);
  // The embed needs a page origin; the site's own is the honest one.
  const source = id
    ? {
        html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`,
        baseUrl: SITE_URL,
      }
    : { uri: url };
  return (
    <View style={[styles.black, style]}>
      <WebView
        source={source}
        style={styles.black}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? <Loading /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  black: { backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
