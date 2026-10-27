import React, { forwardRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space, control } from '../../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Touch } from './Touch';

type FieldProps = TextInputProps & {
  label: string;
  icon: IconName;
  error?: string;
  /** Adds a show / hide toggle. */
  secure?: boolean;
};

/** Labelled text field with icon, focus ring, error line and optional show/hide. */
export const Field = forwardRef<React.ComponentRef<typeof TextInput>, FieldProps>(function Field(
  { label, icon, error, secure, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const border = error ? colors.danger : focused ? colors.brand : colors.border;
  return (
    <View style={{ marginBottom: space.md }}>
      <AppText variant="label" weight="600" color={error ? 'danger' : focused ? 'accent' : 'textSecondary'} style={{ marginBottom: 6 }}>
        {label}
      </AppText>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: border, borderWidth: focused || error ? 1.5 : 1 }]}>
        <Icon name={icon} size={18} color={focused ? colors.accent : colors.textMuted} />
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={secure && hidden}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          style={[styles.input, { color: colors.text, fontFamily: fontFamily['500'] }, style]}
          {...rest}
        />
        {secure ? (
          <Touch borderless onPress={() => setHidden(h => !h)} style={styles.eye} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={18} color={colors.textMuted} />
          </Touch>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" style={{ marginTop: 6 }} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

/** Four-segment password strength meter. */
export function Strength({ score }: { score: number }) {
  const { colors } = useTheme();
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const tones = [colors.danger, colors.danger, colors.warning, colors.success, colors.success];
  return (
    <View style={{ marginTop: -4, marginBottom: space.md }}>
      <View style={styles.meter}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.seg, { backgroundColor: i < score ? tones[score] : colors.elevated }]} />
        ))}
      </View>
      <AppText variant="caption" weight="600" color={tones[score]} style={{ marginTop: 6 }}>
        {labels[score]} · use 8+ characters with a number and a symbol
      </AppText>
    </View>
  );
}

/** Six-box one-time-code input backed by a single hidden field (paste and autofill work). */
export function CodeInput({ value, onChange, length = 6, error }: { value: string; onChange: (v: string) => void; length?: number; error?: boolean }) {
  const { colors } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Verification code" style={styles.code}>
      {Array.from({ length }, (_, i) => {
        const active = focused && i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.danger : active ? colors.brand : value[i] ? colors.textMuted : colors.border,
                borderWidth: active || error ? 1.5 : 1,
              },
            ]}
          >
            <AppText variant="title" tabular>
              {value[i] ?? ''}
            </AppText>
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
        autoFocus
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', height: control.lg, borderRadius: radius.md, paddingLeft: 14 },
  input: { flex: 1, fontSize: 15, marginLeft: 10, paddingVertical: 0, height: '100%' },
  eye: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  meter: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  code: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { width: 48, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
