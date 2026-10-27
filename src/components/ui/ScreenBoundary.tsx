import React, { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Button } from './Primitives';

/**
 * Contains a render error to the screen it happened in: the rest of the app
 * (tabs, other screens on the stack) keeps working, and the reader can go
 * back or retry instead of the whole app closing.
 */
export class ScreenBoundary extends Component<{ children: ReactNode; onBack?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) console.error('Screen crashed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <Fallback onRetry={() => this.setState({ failed: false })} onBack={this.props.onBack} />;
  }
}

function Fallback({ onRetry, onBack }: { onRetry: () => void; onBack?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.icon, { backgroundColor: colors.elevated }]}>
        <Icon name="triangleAlert" size={24} color={colors.warning} />
      </View>
      <AppText variant="title" align="center" style={{ marginTop: space.lg }}>
        Something went wrong
      </AppText>
      <AppText variant="body" color="textSecondary" align="center" style={{ marginTop: space.sm }}>
        This screen hit a problem. The rest of the app is fine.
      </AppText>
      <View style={styles.actions}>
        <Button label="Try again" onPress={onRetry} />
        {onBack ? <Button label="Go back" variant="secondary" onPress={onBack} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xl },
});
