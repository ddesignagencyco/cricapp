import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { ArticleArt, NewsRow } from '../../components/cricket/NewsCards';
import { CommentsPreview } from '../../components/cricket/Comments';
import { FavouriteButton } from '../../components/ui/FavouriteButton';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Hairline, IconButton, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { author, player, team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago, shortDate, time } from '../../utils/format';

export default function ArticleScreen() {
  const { id } = useParams('Article');
  const nav = useNavigation();
  const { colors } = useTheme();
  const { data } = useQuery(`article:${id}`, () => repo.article(id));
  const comments = useQuery(`comments:article:${id}`, () => repo.comments(`article:${id}`));

  if (!data) {
    return (
      <Screen>
        <Header title="News" />
        <SkeletonList count={3} height={140} />
      </Screen>
    );
  }
  const { article: a, related } = data;
  const ur = a.lang === 'ur';
  const by = author(a.authorId);
  const share = () => Share.share({ message: `${a.title}\nhttps://pakcriczone.com/${ur ? 'ur/' : ''}cricket-news/${a.slug}` });

  return (
    <Screen>
      <Header
        title={a.category}
        right={
          <>
            <FavouriteButton kind="article" id={a.id} label={a.title} />
            <IconButton icon="share2" label="Share" onPress={share} />
          </>
        }
      />
      <Body>
        <View style={{ paddingHorizontal: space.lg }}>
          <View style={[styles.rowC, ur && { flexDirection: 'row-reverse' }]}>
            {a.breaking ? (
              <AppText variant="overline" color="live">
                BREAKING
              </AppText>
            ) : (
              <AppText variant="overline" color="accent" uppercase>
                {a.category}
              </AppText>
            )}
            <AppText variant="caption" color="textMuted" style={{ marginHorizontal: 8 }}>
              · {a.readMinutes} min read
            </AppText>
          </View>
          <AppText variant="display" rtl={ur} style={{ marginTop: space.sm }} accessibilityRole="header">
            {a.title}
          </AppText>
          <AppText variant="body" color="textSecondary" rtl={ur} style={{ marginTop: space.md }}>
            {a.summary}
          </AppText>
          <View style={[styles.byline, ur && { flexDirection: 'row-reverse' }]}>
            <Avatar name={by?.name} size={38} />
            <View style={{ marginHorizontal: 10, flex: 1, alignItems: ur ? 'flex-end' : 'flex-start' }}>
              <AppText variant="label" weight="700">
                {by?.name}
              </AppText>
              <AppText variant="caption" weight="600" color="accent">
                {shortDate(a.publishedAt)} · {time(a.publishedAt)}
                {a.updatedAt ? ` · Updated ${ago(a.updatedAt)}` : ''}
              </AppText>
            </View>
            {by ? <FavouriteButton kind="author" id={by.id} label={by.name} /> : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
          <ArticleArt article={a} height={220} rounded={radius.lg} />
        </View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl, gap: space.lg }}>
          {a.body.map((p, i) => (
            <AppText key={i} variant="body" rtl={ur} style={{ fontSize: 17, lineHeight: ur ? 34 : 27 }}>
              {p}
            </AppText>
          ))}
        </View>

        {a.teamIds.length || a.playerIds.length ? (
          <>
            <SectionHeader title="In this story" style={{ marginTop: space.xxl }} />
            <View style={styles.entities}>
              {a.teamIds.map(t => (
                <Touch
                  key={t}
                  onPress={() => nav.navigate('Team', { id: t })}
                  style={[styles.entity, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
                >
                  <TeamBadge id={t} size={24} />
                  <AppText variant="label" weight="600" style={{ marginLeft: 8 }}>
                    {team(t).name}
                  </AppText>
                </Touch>
              ))}
              {a.playerIds.map(p => (
                <Touch
                  key={p}
                  onPress={() => nav.navigate('Player', { id: p })}
                  style={[styles.entity, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
                >
                  <Avatar playerId={p} size={24} />
                  <AppText variant="label" weight="600" style={{ marginLeft: 8 }}>
                    {player(p)?.name}
                  </AppText>
                </Touch>
              ))}
              {a.matchId ? (
                <Touch
                  onPress={() => nav.navigate('Match', { id: a.matchId! })}
                  style={[styles.entity, { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }]}
                >
                  <AppText variant="label" weight="700" color="accent">
                    Open match centre
                  </AppText>
                </Touch>
              ) : null}
            </View>
          </>
        ) : null}

        <View style={[styles.policy, { borderColor: colors.hairline }]}>
          <AppText variant="caption" color="textMuted">
            Spotted an error? Read our editorial and corrections policy, or tell us at corrections@pakcriczone.com.
          </AppText>
        </View>

        {comments.data ? (
          <View style={{ marginTop: space.xxl }}>
            <CommentsPreview thread={`article:${a.id}`} title={a.title} list={comments.data.list} total={comments.data.total} />
          </View>
        ) : null}

        {related.length ? (
          <>
            <SectionHeader title="Related" style={{ marginTop: space.xl }} />
            {related.map((r, i) => (
              <View key={r.id}>
                {i > 0 ? <Hairline inset={space.lg} /> : null}
                <NewsRow article={r} />
              </View>
            ))}
          </>
        ) : null}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  byline: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  entities: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg },
  entity: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  policy: { marginHorizontal: space.lg, marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
