import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { displayName, useAuth } from '../../state/auth';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { Button, Hairline } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { CommentItem, ReactionBar } from './Comments';

/**
 * The whole conversation in place, at the bottom of an article or a live
 * match: reactions, a composer and every comment, newest first. Posting
 * needs an account (the API ties comments to a user).
 */
export function CommentsThread({ thread, title = 'Comments' }: { thread: string; title?: string }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const { user } = useAuth();
  const { data, error, refresh } = useQuery(`comments:${thread}`, () => repo.comments(thread));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setFailure(undefined);
    try {
      await repo.postComment(thread, body);
      setText('');
      input.current?.blur();
      refresh();
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const ready = text.trim().length > 0 && !sending;

  return (
    <View>
      <View style={styles.head}>
        <AppText variant="title" style={{ flex: 1 }}>
          {title}
        </AppText>
        {data ? (
          <AppText variant="label" color="textMuted" tabular>
            {data.total}
          </AppText>
        ) : null}
      </View>

      {data ? <ReactionBar counts={data.reactions ?? {}} thread={thread} /> : null}

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
              style={[styles.input, { color: colors.text, fontFamily: fontFamily['400'] }]}
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
      ) : !data.list.length ? (
        <AppText variant="body" color="textMuted" align="center" style={{ marginVertical: space.xl }}>
          No comments yet. Start the conversation.
        </AppText>
      ) : (
        <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          {[...data.list]
            .sort((a, b) => +new Date(b.at) - +new Date(a.at))
            .map((c, i) => (
              <View key={c.id}>
                {i > 0 ? <Hairline inset={space.lg} /> : null}
                <CommentItem
                  comment={c}
                  // Flat thread: a reply mentions the author in the composer.
                  onReply={
                    user
                      ? x => {
                          setText(t => (t.startsWith('@') ? t : `@${x.author} ${t}`));
                          input.current?.focus();
                        }
                      : undefined
                  }
                />
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
  input: { minHeight: 64, maxHeight: 160, fontSize: 15, textAlignVertical: 'top', padding: 0 },
  composerFoot: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: space.sm },
  signedOut: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  list: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  retry: { alignItems: 'center', paddingVertical: space.xl },
});
