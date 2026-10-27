import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Glow } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space } from '../../theme/tokens';
import { TOOLS, parseOvers } from '../../tools/catalog';

export default function ToolScreen() {
  const { id } = useParams('Tool');
  const { colors } = useTheme();
  const tool = TOOLS.find(t => t.id === id)!;
  const [text, setText] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<string | null>(null);

  const values = useMemo(() => {
    const v: Record<string, number> = {};
    tool.fields.forEach(f => {
      const raw = text[f.key] ?? '';
      v[f.key] =
        raw === '' ? NaN : f.kind === 'overs' ? parseOvers(raw) : Number(raw);
    });
    return v;
  }, [text, tool]);
  const results = tool.compute(values);
  const primary = results?.find(r => r.primary);

  return (
    <Screen>
      <Header
        title={tool.title}
        right={
          Object.values(text).some(Boolean) ? (
            <Touch onPress={() => setText({})} style={styles.reset} accessibilityLabel="Clear all fields">
              <AppText variant="label" weight="600" color="accent">
                Clear
              </AppText>
            </Touch>
          ) : undefined
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Body keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View
            style={[
              styles.result,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
            ]}
          >
            <Glow
              color={colors.brand}
              size={280}
              opacity={results ? 0.28 : 0.12}
              style={{ right: -130, top: -140 }}
            />
            <AppText variant="label" weight="600" color="textSecondary">
              {primary?.label ?? 'Result'}
            </AppText>
            <AppText
              variant="scoreXl"
              tabular
              color={
                primary?.tone === 'good'
                  ? 'success'
                  : primary?.tone === 'bad'
                  ? 'danger'
                  : results
                  ? 'text'
                  : 'textDisabled'
              }
              style={{ marginTop: 6 }}
              accessibilityLiveRegion="polite"
            >
              {primary?.value ?? '—'}
            </AppText>
            {results && results.length > 1 ? (
              <View style={{ marginTop: space.md }}>
                {results
                  .filter(r => !r.primary)
                  .map(r => (
                    <View key={r.label} style={styles.row}>
                      <AppText
                        variant="label"
                        color="textSecondary"
                        style={{ flex: 1 }}
                      >
                        {r.label}
                      </AppText>
                      <AppText variant="label" weight="700" tabular>
                        {r.value}
                      </AppText>
                    </View>
                  ))}
              </View>
            ) : !results ? (
              <AppText
                variant="caption"
                color="textMuted"
                style={{ marginTop: 4 }}
              >
                Fill in the fields below — the result updates as you type.
              </AppText>
            ) : null}
          </View>

          <View style={styles.grid}>
            {tool.fields.map(f => {
              const on = focused === f.key;
              return (
                <View
                  key={f.key}
                  style={[
                    styles.field,
                    tool.fields.length > 1 && styles.half,
                    { backgroundColor: colors.surface, borderColor: on ? colors.brand : colors.hairline },
                  ]}
                >
                  <AppText variant="caption" weight="600" color={on ? 'accent' : 'textMuted'} numberOfLines={2}>
                    {f.label}
                  </AppText>
                  <TextInput
                    value={text[f.key] ?? ''}
                    onChangeText={v => setText(st => ({ ...st, [f.key]: v.replace(/[^0-9.]/g, '') }))}
                    onFocus={() => setFocused(f.key)}
                    onBlur={() => setFocused(null)}
                    // 'e.g.' so a hint never reads as an entered value.
                    placeholder={f.placeholder ? `e.g. ${f.placeholder}` : f.kind === 'overs' ? 'e.g. 16.3' : undefined}
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    accessibilityLabel={f.label}
                    style={[styles.input, { color: colors.text, fontFamily: fontFamily['600'] }]}
                  />
                  {f.hint ? (
                    <AppText variant="micro" color="textMuted" numberOfLines={2}>
                      {f.hint}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={[styles.explain, { backgroundColor: colors.elevated }]}>
            <Icon name="info" size={16} color={colors.textSecondary} />
            <AppText
              variant="caption"
              color="textSecondary"
              style={{ flex: 1, marginLeft: 10 }}
            >
              {tool.explain}
            </AppText>
          </View>
        </Body>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  result: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.lg,
    overflow: 'hidden',
    minHeight: 140,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginHorizontal: space.lg, marginTop: space.lg },
  field: { flexBasis: '100%', flexGrow: 1, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm, borderRadius: radius.md, borderWidth: 1.5 },
  half: { flexBasis: '45%' },
  reset: { minHeight: 44, minWidth: 44, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  input: {
    fontSize: 22,
    paddingVertical: 6,
    paddingHorizontal: 0,
    minHeight: 44,
  },
  explain: {
    flexDirection: 'row',
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.md,
  },
});
