import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { repo } from '../../data/repo';
import type { Comment } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { displayName, useAuth } from '../../state/auth';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { useBodyScroll } from '../ui/Layout';
import { Button, Hairline } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { CommentItem, ReactionBar, ReportSheet } from './Comments';

const URDU = /[؀-ۿ]/;

/**
 * The whole conversation in place, at the bottom of an article or a live
 * match: reactions, a composer and every comment, newest first. Posting,
 * liking and reporting need an account; you can delete your own comments,
 * and admins can delete anyone's.
 */
export function CommentsThread({ thread: key, title = 'Comments' }: { thread: string; title?: string }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const { user } = useAuth();
  const moderator = !!(user?.isAdmin || user?.isSuperAdmin);
  const scroller = useBodyScroll();
  const { data, error, refresh } = useQuery(`comments:${key}`, () => repo.comments(key));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();
  // Kept locally until the next load includes them, so changes show at once.
  const [posted, setPosted] = useState<Comment[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string>();
  const [reporting, setReporting] = useState<Comment>();
  const [reveal, setReveal] = useState<string>();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const rows = useRef(new Map<string, React.ComponentRef<typeof View>>());

  const { comments, total } = useMemo(() => {
    const loaded = data?.list ?? [];
    const fresh = posted.filter(p => !loaded.some(c => c.id === p.id));
    const gone = loaded.filter(c => removed.has(c.id)).length;
    return {
      comments: [...fresh, ...loaded].filter(c => !removed.has(c.id)).sort((x, y) => +new Date(y.at) - +new Date(x.at)),
      total: Math.max(0, (data?.total ?? 0) + fresh.length - gone),
    };
  }, [data, posted, removed]);

  // Bring the comment you just posted into view once it has been laid out.
  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => {
      scroller?.reveal(rows.current.get(reveal) ?? null);
      setReveal(undefined);
    }, 150);
    return () => clearTimeout(t);
  }, [reveal, comments, scroller]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setFailure(undefined);
    try {
      const mine = await repo.postComment(key, body);
      setPosted(p => [mine, ...p]);
      setText('');
      input.current?.blur();
      setReveal(mine.id);
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const react = async (c: Comment, emoji: string) => (await repo.reactToComment(c.id, emoji)) === 'added';

  const remove = (c: Comment) => {
    const own = c.userId === user?.id;
    Alert.alert(
      'Delete comment?',
      own ? 'This can’t be undone.' : `This removes ${c.author}’s comment for everyone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(c.id);
            try {
              await repo.deleteComment(c.id, !own);
              setRemoved(s => new Set(s).add(c.id));
              setPosted(p => p.filter(x => x.id !== c.id));
              refresh();
            } catch (e) {
              Alert.alert('Couldn’t delete the comment', errorMessage(e));
            } finally {
              setDeleting(undefined);
            }
          },
        },
      ],
    );
  };

  const report = async (reason: string) => {
    if (!reporting) return;
    await repo.reportComment(reporting.id, reason);
    setReported(s => new Set(s).add(reporting.id));
    setReporting(undefined);
  };

  const ready = text.trim().length > 0 && !sending;

  return (
    <View>
      {/* An Urdu title reads from the right, the count on the left. */}
      <View style={[styles.head, URDU.test(title) && { flexDirection: 'row-reverse' }]}>
        <AppText variant="section" style={{ flex: 1 }} accessibilityRole="header">
          {title}
        </AppText>
        {data ? (
          <AppText variant="label" color="textMuted" tabular>
            {total}
          </AppText>
        ) : null}
      </View>

      {data ? <ReactionBar counts={data.reactions ?? {}} thread={key} /> : null}

      {/* Composer */}
      <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        {user ? (
          <>
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
              // Urdu is typed and read from the right.
              style={[styles.input, { color: colors.text, fontFamily: fontFamily['400'] }, URDU.test(text) && { fontFamily: undefined, textAlign: 'right', writingDirection: 'rtl' }]}
              accessibilityLabel="Comment"
            />
            <View style={styles.composerFoot}>
              <AppText variant="caption" color={failure ? 'danger' : 'textMuted'} style={{ flex: 1 }} numberOfLines={2}>
                {failure ?? `Posting as ${displayName(user)}`}
              </AppText>
              <Touch
                onPress={send}
                disabled={!ready}
                style={[styles.send, { backgroundColor: ready ? colors.brand : colors.elevated }]}
                accessibilityLabel="Post comment"
              >
                {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="send" size={18} color={ready ? '#FFFFFF' : colors.textMuted} />}
              </Touch>
            </View>
          </>
        ) : (
          <View style={styles.signedOut}>
            <AppText variant="label" color="textSecondary" style={{ flex: 1, marginRight: space.md }}>
              Sign in to comment and react.
            </AppText>
            <Button label="Sign in" compact onPress={() => nav.navigate('SignIn')} />
          </View>
        )}
      </View>

      {/* Comments */}
      {!data ? (
        error ? (
          <Touch onPress={refresh} style={styles.retry}>
            <AppText variant="label" color="accent" weight="600">
              Couldn’t load comments. Tap to retry.
            </AppText>
          </Touch>
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: space.xl }} />
        )
      ) : !comments.length ? (
        <AppText variant="body" color="textMuted" align="center" style={{ marginVertical: space.xl }}>
          No comments yet. Start the conversation.
        </AppText>
      ) : (
        <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          {comments.map((c, i) => {
            const own = !!user && c.userId === user.id;
            return (
              <View
                key={c.id}
                ref={el => {
                  if (el) rows.current.set(c.id, el);
                  else rows.current.delete(c.id);
                }}
                collapsable={false}
              >
                {i > 0 ? <Hairline inset={space.lg} /> : null}
                <CommentItem
                  comment={c}
                  onReact={user ? react : undefined}
                  // Your own comment and the moderators' tools don't need reporting.
                  onReport={user && !own && !moderator ? setReporting : undefined}
                  onDelete={own || moderator ? remove : undefined}
                  reported={reported.has(c.id)}
                  busy={deleting === c.id}
                />
              </View>
            );
          })}
        </View>
      )}

      <ReportSheet comment={reporting} onClose={() => setReporting(undefined)} onSubmit={report} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.md },
  composer: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.md },
  input: { minHeight: 64, maxHeight: 160, fontSize: 15, textAlignVertical: 'top', padding: 0 },
  composerFoot: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: space.sm },
  signedOut: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  list: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  retry: { alignItems: 'center', paddingVertical: space.xl },
});
