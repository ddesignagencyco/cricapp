import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/*
 * App-wide safety net: a render/runtime error in any screen is caught here and
 * shown as a recoverable message instead of a blank white screen. Kept
 * dependency-free (no theme/hooks) so it still works if the error came from one
 * of those providers.
 */

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) console.error('[ErrorBoundary]', error);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>An unexpected error occurred. Please try again.</Text>
        <Pressable onPress={this.reset} style={styles.btn} accessibilityRole="button">
          <Text style={styles.btnText}>Reload</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0B0D12' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  btn: { height: 48, paddingHorizontal: 28, borderRadius: 12, backgroundColor: '#3B68FC', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
