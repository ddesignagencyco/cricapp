import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { NewsRow } from '../../components/cricket/NewsCards';
import { AppText } from '../../components/ui/AppText';
import { Icon } from '../../components/ui/Icon';
import { Body, Screen } from '../../components/ui/Layout';
import {
  Card,
  Chip,
  EmptyState,
  Hairline,
  IconButton,
  SectionHeader,
} from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space } from '../../theme/tokens';

/** Starting points, not a popularity claim. */
const SUGGESTIONS = ['Pakistan', 'PSL', 'Babar Azam', 'Shaheen', 'Lahore Qalandars', 'India'];

export default function SearchScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  // Search once typing pauses, not on every keystroke.
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error } = useQuery(`search:${term}`, () => repo.search(term));
  const searching = !!q.trim() && (term !== q.trim() || (!data && !error));
  const total = data
    ? data.teams.length +
      data.players.length +
      data.series.length +
      data.articles.length
    : 0;

  return (
    <Screen>
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <IconButton icon="arrowLeft" label="Back" onPress={nav.goBack} />
        <View
          style={[
            styles.field,
            { backgroundColor: colors.elevated, borderColor: colors.border },
          ]}
        >
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Players, teams, series, news"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={[
              styles.input,
              { color: colors.text, fontFamily: fontFamily['500'] },
            ]}
            accessibilityLabel="Search"
          />
          {q ? (
            <IconButton
              icon="x"
              label="Clear"
              size={18}
              onPress={() => setQ('')}
            />
          ) : null}
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Body keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {!q ? (
            <>
              <SectionHeader title="Try searching" style={{ marginTop: space.lg }} />
              <View style={styles.chips}>
                {SUGGESTIONS.map(t => (
                  <Chip
                    key={t}
                    label={t}
                    icon="search"
                    onPress={() => setQ(t)}
                  />
                ))}
              </View>
            </>
          ) : searching ? (
            <View style={{ paddingVertical: space.xxl, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : total === 0 ? (
            <EmptyState
              icon="search"
              title={`No results for “${q}”`}
              body="Check the spelling, or try a team or player name."
            />
          ) : (
            <>
              {data!.teams.length ? (
                <>
                  <SectionHeader
                    title="Teams"
                    style={{ marginTop: space.lg }}
                  />
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    {data!.teams.map((t, i) => (
                      <View key={t.id}>
                        {i > 0 ? <Hairline inset={64} /> : null}
                        <Touch
                          onPress={() => nav.navigate('Team', { id: t.id })}
                          style={styles.row}
                        >
                          <TeamBadge id={t.id} size={34} />
                          <AppText
                            variant="label"
                            weight="600"
                            style={{ marginLeft: 14 }}
                          >
                            {t.name}
                          </AppText>
                        </Touch>
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}
              {data!.players.length ? (
                <>
                  <SectionHeader
                    title="Players"
                    style={{ marginTop: space.lg }}
                  />
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    {data!.players.map((p, i) => (
                      <View key={p.id}>
                        {i > 0 ? <Hairline inset={64} /> : null}
                        <Touch
                          onPress={() => nav.navigate('Player', { id: p.id })}
                          style={styles.row}
                        >
                          <Avatar playerId={p.id} size={34} />
                          <View style={{ marginLeft: 14 }}>
                            <AppText variant="label" weight="600">
                              {p.name}
                            </AppText>
                            <AppText variant="caption" color="textMuted">
                              {p.role} · {team(p.teamId).name}
                            </AppText>
                          </View>
                        </Touch>
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}
              {data!.series.length ? (
                <>
                  <SectionHeader
                    title="Series"
                    style={{ marginTop: space.lg }}
                  />
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    {data!.series.map((s, i) => (
                      <View key={s.id}>
                        {i > 0 ? <Hairline inset={space.lg} /> : null}
                        <Touch
                          onPress={() => nav.navigate('Series', { id: s.id })}
                          style={styles.row}
                        >
                          <Icon name="trophy" size={20} color={s.color} />
                          <AppText
                            variant="label"
                            weight="600"
                            style={{ marginLeft: 14, flex: 1 }}
                            numberOfLines={1}
                          >
                            {s.name}
                          </AppText>
                        </Touch>
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}
              {data!.articles.length ? (
                <>
                  <SectionHeader title="News" style={{ marginTop: space.lg }} />
                  {data!.articles.map((a, i) => (
                    <View key={a.id}>
                      {i > 0 ? <Hairline inset={space.lg} /> : null}
                      <NewsRow article={a} />
                    </View>
                  ))}
                </>
              ) : null}
            </>
          )}
        </Body>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    paddingRight: space.lg,
    paddingBottom: space.sm,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingLeft: 14,
  },
  input: { flex: 1, fontSize: 15, marginLeft: 10, paddingVertical: 0 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    minHeight: 58,
  },
});
