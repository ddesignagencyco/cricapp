import React, { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Stack } from './navigation/Stack';
import { screens } from './navigation/screens';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { PrefsProvider } from './state/prefs';
import { AuthProvider } from './state/auth';
import { storage } from './utils/storage';

/**
 * Root surface. Top and bottom insets are handled per screen (headers and
 * tab bar); left and right are handled here so a notch in landscape, or a
 * curved edge, never covers content.
 */
function Root({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    storage.get<boolean>('onboarded').then(v => setOnboarded(!!v));
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PrefsProvider>
            <Root>
              {onboarded === null ? null : (
                <Stack
                  screens={screens}
                  initialRoute={onboarded ? 'Tabs' : 'Onboarding'}
                />
              )}
            </Root>
          </PrefsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
