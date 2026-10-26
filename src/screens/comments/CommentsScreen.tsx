import React, { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommentItem, ReactionBar } from '../../components/cricket/Comments';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Header, Screen } from '../../components/ui/Layout';
import { Hairline } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { repo } from '../../data/repo';
import type { Comment } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { errorMessage } from '../../api/client';
import { Button } from '../../components/ui/Primitives';
import { displayName, useAuth } from '../../state/auth';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space } from '../../theme/tokens';

type Sort = 'top' | 'new';

export default function CommentsScreen() {
  const { thread, title } = useParams('Comments');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, refresh } = useQuery(`comments:${thread}`, () => repo.comments(thread));
  const nav = useNavigation();
  const { user } = useAuth();
  const [sort, setSort] = useState<Sort>('new');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  const list = useMemo(() => {
    const l = [...(data?.list ?? [])];
    const pinned = l.filter(c => c.pinned);
    const rest = l.filter(c => !c.pinned).sort((a, b) => (sort === 'top' ? b.likes - a.likes : +new Date(b.at) - +new Date(a.at)));
    return [...pinned, ...rest];
  }, [data, sort]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(undefined);
    try {
      await repo.postComment(thread, body, replyTo?.id);
      setText('');
      setReplyTo(null);
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <Header title="Comments" subtitle={title} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {!data ? (
          <SkeletonList count={5} height={80} />
        ) : (
          <FlatList
            data={list}
            keyExtractor={c => c.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={{ paddingBottom: space.sm }}>
                <View style={{ marginBottom: space.lg, marginTop: space.md }}>
                  <ReactionBar counts={data.reactions ?? {}} thread={thread} />
                </View>
                <View style={styles.sortRow}>
                  <AppText variant="label" weight="700" style={{ flex: 1 }}>
                    {data.total} comments
                  </AppText>
                  {(['new'] as Sort[]).map(s => (
                    <Touch key={s} onPress={() => setSort(s)} accessibilityState={{ selected: sort === s }} style={styles.sortBtn}>
                      <AppText variant="label" weight={sort === s ? '700' : '500'} color={sort === s ? 'text' : 'textMuted'}>
                        {s === 'top' ? 'Top' : 'Newest'}
                      </AppText>
                    </Touch>
                  ))}
                </View>
              </View>
            }
            ItemSeparatorComponent={() => <Hairline inset={space.lg} />}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                onReply={c => {
                  // Comments are flat in the API: a reply is a comment that mentions the author.
                  setReplyTo(c);
                  setText(t => (t.startsWith('@') ? t : `@${c.author} ${t}`));
                  input.current?.focus();
                }}
              />
            )}
            ListEmptyComponent={
              <AppText variant="bodySm" color="textMuted" align="center" style={{ padding: space.xl }}>
                No comments yet. Start the conversation.
              </AppText>
            }
            contentContainerStyle={{ paddingBottom: space.xl }}
          />
        )}
        <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm, backgroundColor: colors.background, borderTopColor: colors.hairline }]}>
          {!user ? (
            <View style={styles.signedOut}>
              <AppText variant="caption" color="textSecondary" style={{ flex: 1, marginRight: space.md }}>
                Sign in to join the conversation.
              </AppText>
              <Button label="Sign in" compact onPress={() => nav.navigate('SignIn')} />
            </View>
          ) : (
            <>
            {replyTo ? (
              <View style={styles.replying}>
                <AppText variant="caption" color="textMuted" style={{ flex: 1 }}>
                  Replying to <AppText variant="caption" weight="700">{replyTo.author}</AppText>
                </AppText>
                <Touch onPress={() => setReplyTo(null)} style={styles.cancel} accessibilityLabel="Cancel reply">
                  <Icon name="x" size={16} color={colors.textMuted} />
                </Touch>
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <TextInput
                ref={input}
                value={text}
                onChangeText={setText}
                placeholder="Add a comment…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
                style={[styles.input, { color: colors.text, backgroundColor: colors.elevated, borderColor: colors.border, fontFamily: fontFamily['400'] }]}
                accessibilityLabel="Comment"
              />
              <Touch
                onPress={send}
                disabled={!text.trim() || sending}
                style={[styles.send, { backgroundColor: text.trim() ? colors.brand : colors.elevated }]}
                accessibilityLabel="Post comment"
              >
                <Icon name="send" size={18} color={text.trim() ? colors.onBrand : colors.textMuted} />
              </Touch>
            </View>
            {error ? (
              <AppText variant="caption" color="danger" style={{ marginTop: 6 }}>
                {error}
              </AppText>
            ) : (
              <AppText variant="micro" color="textDisabled" style={{ marginTop: 6 }}>
                POSTING AS {displayName(user).toUpperCase()}
              </AppText>
            )}
              </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  sortBtn: { paddingHorizontal: 10, minHeight: 40, justifyContent: 'center', borderRadius: radius.sm },
  composer: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: space.lg, paddingTop: space.sm },
  replying: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cancel: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  signedOut: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden' },
});
