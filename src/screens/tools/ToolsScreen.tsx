import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { SectionHeader, Tag } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { TOOLS, UPCOMING_TOOLS } from '../../tools/catalog';

function Tile({ title, short, icon, onPress, soon, width }: { title: string; short?: string; icon: IconName; onPress?: () => void; soon?: boolean; width: number }) {
  const { colors } = useTheme();
  return (
    <Touch
      scale={!soon}
      disabled={soon}
      onPress={onPress}
      style={[styles.tile, { width, backgroundColor: colors.surface, borderColor: colors.hairline, opacity: soon ? 0.6 : 1 }]}
    >
      <View style={styles.tileTop}>
        <View style={[styles.icon, { backgroundColor: soon ? colors.elevated : colors.brandSoft }]}>
          <Icon name={icon} size={18} color={soon ? colors.textMuted : colors.accent} />
        </View>
        {soon ? <Tag label="SOON" /> : short ? <AppText variant="micro" color="textMuted">{short}</AppText> : null}
      </View>
      <AppText variant="label" weight="700" style={{ marginTop: 14 }} numberOfLines={2}>
        {title}
      </AppText>
    </Touch>
  );
}

export default function ToolsScreen() {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const w = (width - space.lg * 2 - space.md) / 2;
  const groups = [...new Set(TOOLS.map(t => t.group))];
  return (
    <Screen>
      <Header title="Cricket tools" subtitle="Calculators, comparisons and simulators" />
      <Body>
        <SectionHeader title="Compare" style={{ marginTop: space.sm }} />
        <View style={styles.grid}>
          <Tile title="Player comparison" icon="gitCompare" width={w} onPress={() => nav.navigate('Compare', { kind: 'players' })} />
          <Tile title="Head-to-head" icon="swords" width={w} onPress={() => nav.navigate('Compare', { kind: 'teams' })} />
          <Tile title="AI win predictor" icon="sparkles" width={w} onPress={() => nav.navigate('Tabs', { tab: 'predict' })} />
          <Tile title="Model accuracy" icon="chartLine" width={w} onPress={() => nav.navigate('ModelPerformance')} />
        </View>
        {groups.map(g => (
          <View key={g}>
            <SectionHeader title={g} style={{ marginTop: space.xxl }} />
            <View style={styles.grid}>
              {TOOLS.filter(t => t.group === g).map(t => (
                <Tile key={t.id} title={t.title} short={t.short} icon={t.icon} width={w} onPress={() => nav.navigate('Tool', { id: t.id })} />
              ))}
            </View>
          </View>
        ))}
        <SectionHeader title="Coming soon" style={{ marginTop: space.xxl }} />
        <View style={styles.grid}>
          {UPCOMING_TOOLS.map(t => (
            <Tile key={t.title} title={t.title} icon={t.icon} width={w} soon />
          ))}
        </View>
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },
  tile: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.lg, minHeight: 118, overflow: 'hidden' },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
