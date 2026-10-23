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
import { Card, Glow, Hairline } from '../../components/ui/Primitives';
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
      <Header title={tool.title} />
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
            <AppText variant="overline" color="textMuted">
              {(primary?.label ?? tool.title).toUpperCase()}
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

          <Card
            padded={false}
            style={{ marginHorizontal: space.lg, marginTop: space.lg }}
          >
            {tool.fields.map((f, i) => (
              <View key={f.key}>
                {i > 0 ? <Hairline inset={space.lg} /> : null}
                <View style={styles.field}>
                  <AppText
                    variant="caption"
                    weight="600"
                    color={focused === f.key ? 'accent' : 'textMuted'}
                  >
                    {f.label}
                    {f.kind === 'overs' ? '  (e.g. 16.3)' : ''}
                  </AppText>
                  <TextInput
                    value={text[f.key] ?? ''}
                    onChangeText={v =>
                      setText(s => ({
                        ...s,
                        [f.key]: v.replace(/[^0-9.]/g, ''),
                      }))
                    }
                    onFocus={() => setFocused(f.key)}
                    onBlur={() => setFocused(null)}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    accessibilityLabel={f.label}
                    style={[
                      styles.input,
                      { color: colors.text, fontFamily: fontFamily['600'] },
                    ]}
                  />
                  {f.hint ? (
                    <AppText variant="caption" color="textMuted">
                      {f.hint}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>

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
  field: { paddingHorizontal: space.lg, paddingTop: 12, paddingBottom: 10 },
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
