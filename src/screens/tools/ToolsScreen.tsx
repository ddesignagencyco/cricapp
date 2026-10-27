import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { TOOLS, type Tool } from '../../tools/catalog';

/** Calculators fans use while following a match; odds maths stays out of the general list. */
const GROUPS: Tool['group'][] = ['Run rates', 'Batting & bowling', 'Match situations'];

function Row({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Touch onPress={onPress} style={styles.row} accessibilityLabel={title}>
      <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}>
        <Icon name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1, marginHorizontal: space.md }}>
        <AppText variant="label" weight="700">
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
          {body}
        </AppText>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Touch>
  );
}

export default function ToolsScreen() {
  const nav = useNavigation();
  return (
    <Screen>
      <Header title="Cricket tools" />
      <Body>
        <SectionHeader title="Compare" />
        <Card padded={false} style={styles.card}>
          <Row icon="swords" title="Head-to-head" body="How two teams have fared against each other" onPress={() => nav.navigate('Compare', { kind: 'teams' })} />
          <Hairline inset={space.lg + 40 + space.md} />
          <Row icon="users" title="Compare players" body="Two players side by side" onPress={() => nav.navigate('Compare', { kind: 'players' })} />
        </Card>
        {GROUPS.map(g => (
          <View key={g} style={{ marginTop: space.xl }}>
            <SectionHeader title={g} />
            <Card padded={false} style={styles.card}>
              {TOOLS.filter(t => t.group === g).map((t, i) => (
                <View key={t.id}>
                  {i > 0 ? <Hairline inset={space.lg + 40 + space.md} /> : null}
                  <Row icon={t.icon} title={t.title} body={t.explain} onPress={() => nav.navigate('Tool', { id: t.id })} />
                </View>
              ))}
            </Card>
          </View>
        ))}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 64 },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
