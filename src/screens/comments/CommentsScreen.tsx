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
import { useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space } from '../../theme/tokens';

type Sort = 'top' | 'new';

export default function CommentsScreen() {
  const { thread, title } = useParams('Comments');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, refresh } = useQuery(`comments:${thread}`, () => repo.comments(thread));
  const [sort, setSort] = useState<Sort>('top');
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
    if (!body) return;
    setText('');
    await repo.postComment(thread, body, replyTo?.id);
    setReplyTo(null);
    refresh();
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
                {data.reactions ? (
                  <View style={{ marginBottom: space.lg }}>
                    <ReactionBar counts={data.reactions} />
                  </View>
                ) : null}
                <View style={styles.sortRow}>
                  <AppText variant="label" weight="700" style={{ flex: 1 }}>
                    {data.total} comments
                  </AppText>
                  {(['top', 'new'] as Sort[]).map(s => (
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
                  setReplyTo(c);
                  input.current?.focus();
                }}
              />
            )}
            contentContainerStyle={{ paddingBottom: space.xl }}
          />
        )}
        <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm, backgroundColor: colors.background, borderTopColor: colors.hairline }]}>
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
              disabled={!text.trim()}
              style={[styles.send, { backgroundColor: text.trim() ? colors.brand : colors.elevated }]}
              accessibilityLabel="Post comment"
            >
              <Icon name="send" size={18} color={text.trim() ? colors.onBrand : colors.textMuted} />
            </Touch>
          </View>
          <AppText variant="micro" color="textDisabled" style={{ marginTop: 6 }}>
            POSTING AS GUEST · SIGN IN TO USE YOUR NAME
          </AppText>
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
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden' },
});
