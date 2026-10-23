import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { MatchRow } from '../../components/cricket/MatchCards';
import { NewsRow } from '../../components/cricket/NewsCards';
import { AppText } from '../../components/ui/AppText';
import { FavouriteButton } from '../../components/ui/FavouriteButton';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, EmptyState, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { articles } from '../../data/mock/news';
import { matches } from '../../data/mock/matches';
import { author, player, team } from '../../data/refs';
import { useNavigation } from '../../navigation/Stack';
import { usePrefs } from '../../state/prefs';
import { space } from '../../theme/tokens';

function Row({ left, title, sub, onPress, fav }: { left: ReactNode; title: string; sub?: string; onPress?: () => void; fav: ReactNode }) {
  return (
    <View style={styles.row}>
      <Touch onPress={onPress} style={[styles.rowC, { flex: 1, minHeight: 58 }]}>
        {left}
        <View style={{ marginLeft: 14, flex: 1 }}>
          <AppText variant="label" weight="600" numberOfLines={1}>
            {title}
          </AppText>
          {sub ? (
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {sub}
            </AppText>
          ) : null}
        </View>
      </Touch>
      {fav}
    </View>
  );
}

export default function FavouritesScreen() {
  const nav = useNavigation();
  const { favouritesOf, favourites } = usePrefs();
  const teams = favouritesOf('team');
  const players = favouritesOf('player');
  const ms = favouritesOf('match').map(id => matches.find(m => m.id === id)).filter(Boolean);
  const news = favouritesOf('article').map(id => articles.find(a => a.id === id)).filter(Boolean);
  const authors = favouritesOf('author');

  return (
    <Screen>
      <Header title="Favourites" subtitle={favourites.length ? `${favourites.length} saved` : undefined} />
      {!favourites.length ? (
        <EmptyState
          icon="heart"
          title="Nothing saved yet"
          body="Tap the heart on any team, player, match, story or author. They'll appear here, and favourite teams come first across the app."
        />
      ) : (
        <Body>
          {teams.length ? (
            <>
              <SectionHeader title="Teams" style={{ marginTop: space.sm }} />
              <Card padded={false} style={{ marginHorizontal: space.lg }}>
                {teams.map((id, i) => (
                  <View key={id}>
                    {i > 0 ? <Hairline inset={64} /> : null}
                    <Row left={<TeamBadge id={id} size={34} />} title={team(id).name} onPress={() => nav.navigate('Team', { id })} fav={<FavouriteButton kind="team" id={id} label={team(id).name} />} />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          {players.length ? (
            <>
              <SectionHeader title="Players" style={{ marginTop: space.xl }} />
              <Card padded={false} style={{ marginHorizontal: space.lg }}>
                {players.map((id, i) => (
                  <View key={id}>
                    {i > 0 ? <Hairline inset={64} /> : null}
                    <Row
                      left={<Avatar playerId={id} size={34} />}
                      title={player(id)?.name ?? id}
                      sub={player(id) ? `${player(id)!.role} · ${team(player(id)!.teamId).short}` : undefined}
                      onPress={() => nav.navigate('Player', { id })}
                      fav={<FavouriteButton kind="player" id={id} label={player(id)?.name ?? id} />}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          {ms.length ? (
            <>
              <SectionHeader title="Matches" style={{ marginTop: space.xl }} />
              <Card padded={false} style={{ marginHorizontal: space.lg }}>
                {ms.map((m, i) => (
                  <View key={m!.id}>
                    {i > 0 ? <Hairline /> : null}
                    <MatchRow match={m!} />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          {news.length ? (
            <>
              <SectionHeader title="Saved stories" style={{ marginTop: space.xl }} />
              {news.map((a, i) => (
                <View key={a!.id}>
                  {i > 0 ? <Hairline inset={space.lg} /> : null}
                  <NewsRow article={a!} />
                </View>
              ))}
            </>
          ) : null}
          {authors.length ? (
            <>
              <SectionHeader title="Authors" style={{ marginTop: space.xl }} />
              <Card padded={false} style={{ marginHorizontal: space.lg }}>
                {authors.map((id, i) => (
                  <View key={id}>
                    {i > 0 ? <Hairline inset={64} /> : null}
                    <Row
                      left={<Avatar name={author(id)?.name} size={34} />}
                      title={author(id)?.name ?? id}
                      sub={author(id)?.role}
                      fav={<FavouriteButton kind="author" id={id} label={author(id)?.name ?? id} />}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: space.xs },
  rowC: { flexDirection: 'row', alignItems: 'center' },
});
