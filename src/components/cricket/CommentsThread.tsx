import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
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
import { CommentItem, ReactionBar } from './Comments';

/*
 * Replies. The API stores comments flat (no parent id), so a reply is posted
 * as "@Name text" and shown under the newest earlier comment by Name. The
 * website sees the same text, so nothing is lost there.
 */

/** Group flat comments into top-level comments with their replies (oldest reply first). */
function thread(list: Comment[]): Comment[] {
  const byTime = [...list].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  // Longest names first so "Umair Shad" wins over "Umair".
  const authors = [...new Set(byTime.map(c => c.author))].sort((a, b) => b.length - a.length);
  const top: Comment[] = [];
  const home = new Map<string, Comment>();
  for (const c of byTime) {
    const name = authors.find(n => c.body.startsWith(`@${n} `) || c.body === `@${n}`);
    const parent = name ? [...top].reverse().find(t => t.author === name || t.replies.some(r => r.author === name)) : undefined;
    const node = { ...c, replies: [] as Comment[] };
    if (parent) {
      home.get(parent.id)!.replies.push({ ...node, body: c.body.slice(name!.length + 1).trim() });
    } else {
      top.push(node);
      home.set(node.id, node);
    }
  }
  return top.reverse();
}

/**
 * The whole conversation in place, at the bottom of an article or a live
 * match: reactions, a composer and every comment, newest first. Posting
 * needs an account (the API ties comments to a user).
 */
export function CommentsThread({ thread: key, title = 'Comments' }: { thread: string; title?: string }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const { user } = useAuth();
  const scroller = useBodyScroll();
  const { data, error, refresh } = useQuery(`comments:${key}`, () => repo.comments(key));
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment>();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();
  // After posting: the text we sent, so we can find and show it once it's back from the API.
  const [justSent, setJustSent] = useState<string>();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const rows = useRef(new Map<string, React.ComponentRef<typeof View>>());

  const comments = useMemo(() => thread(data?.list ?? []), [data]);

  // Bring the new comment into view: top-level ones land at the top, replies under their parent.
  useEffect(() => {
    if (!justSent || !data) return;
    const mine = [...data.list].sort((a, b) => +new Date(b.at) - +new Date(a.at)).find(c => c.body === justSent);
    if (!mine) return;
    const holder = comments.find(c => c.id === mine.id || c.replies.some(r => r.id === mine.id));
    setJustSent(undefined);
    if (holder) setTimeout(() => scroller?.reveal(rows.current.get(holder.id) ?? null), 120);
  }, [justSent, data, comments, scroller]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    const full = replyTo ? `@${replyTo.author} ${body}` : body;
    setSending(true);
    setFailure(undefined);
    try {
      await repo.postComment(key, full);
      setText('');
      setReplyTo(undefined);
      input.current?.blur();
      setJustSent(full);
      refresh();
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const startReply = (c: Comment) => {
    setReplyTo(c);
    input.current?.focus();
  };

  const ready = text.trim().length > 0 && !sending;

  return (
    <View>
      {/* An Urdu title reads from the right, the count on the left. */}
      <View style={[styles.head, /[\u0600-\u06FF]/.test(title) && { flexDirection: 'row-reverse' }]}>
        <AppText variant="section" style={{ flex: 1 }} accessibilityRole="header">
          {title}
        </AppText>
        {data ? (
          <AppText variant="label" color="textMuted" tabular>
            {data.total}
          </AppText>
        ) : null}
      </View>

      {data ? <ReactionBar counts={data.reactions ?? {}} thread={key} /> : null}

      {/* Composer */}
      <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: replyTo ? colors.brand : colors.hairline }]}>
        {user ? (
          <>
            {replyTo ? (
              <View style={[styles.replying, { backgroundColor: colors.brandSoft }]}>
                <Icon name="messageCircle" size={14} color={colors.accent} />
                <AppText variant="caption" weight="600" color="accent" numberOfLines={1} style={{ flex: 1, marginLeft: 6 }}>
                  Replying to {replyTo.author}
                </AppText>
                <Touch onPress={() => setReplyTo(undefined)} style={styles.cancelReply} accessibilityLabel="Cancel reply">
                  <Icon name="x" size={16} color={colors.accent} />
                </Touch>
              </View>
            ) : null}
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              placeholder={replyTo ? `Reply to ${replyTo.author}…` : 'Add a comment…'}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
              style={[styles.input, { color: colors.text, fontFamily: fontFamily['400'] }]}
              accessibilityLabel={replyTo ? `Reply to ${replyTo.author}` : 'Comment'}
            />
            <View style={styles.composerFoot}>
              <AppText variant="caption" color={failure ? 'danger' : 'textMuted'} style={{ flex: 1 }} numberOfLines={2}>
                {failure ?? `Posting as ${displayName(user)}`}
              </AppText>
              <Touch
                onPress={send}
                disabled={!ready}
                style={[styles.send, { backgroundColor: ready ? colors.brand : colors.elevated }]}
                accessibilityLabel={replyTo ? 'Post reply' : 'Post comment'}
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
          {comments.map((c, i) => (
            <View
              key={c.id}
              ref={el => {
                if (el) rows.current.set(c.id, el);
                else rows.current.delete(c.id);
              }}
              collapsable={false}
            >
              {i > 0 ? <Hairline inset={space.lg} /> : null}
              <CommentItem comment={c} onReply={user ? startReply : undefined} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.md },
  composer: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.md },
  replying: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm, paddingLeft: space.sm, marginBottom: space.sm, minHeight: 32 },
  cancelReply: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 64, maxHeight: 160, fontSize: 15, textAlignVertical: 'top', padding: 0 },
  composerFoot: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: space.sm },
  signedOut: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  list: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  retry: { alignItems: 'center', paddingVertical: space.xl },
});
