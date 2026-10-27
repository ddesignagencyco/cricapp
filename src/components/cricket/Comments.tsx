import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { repo } from '../../data/repo';
import type { Comment } from '../../data/types';
import { useAuth } from '../../state/auth';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { Hairline, Tag } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { Avatar, TeamBadge } from './Badges';

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export function CommentItem({
  comment,
  onReply,
  depth = 0,
}: {
  comment: Comment;
  onReply?: (c: Comment) => void;
  depth?: number;
}) {
  const { colors } = useTheme();
  // Short threads stay open so a new reply is visible straight away.
  const [open, setOpen] = useState(comment.replies.length <= 3);
  return (
    <View>
      <View style={[styles.item, depth > 0 && { paddingLeft: space.lg + 44 }]}>
        <Avatar name={comment.author} size={depth ? 30 : 38} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.rowC}>
            <AppText variant="label" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
              {comment.author}
            </AppText>
            {comment.staff ? (
              <View style={{ marginLeft: 6 }}>
                <Tag label="STAFF" tone="brand" />
              </View>
            ) : null}
            {comment.teamId ? <TeamBadge id={comment.teamId} size={18} style={{ marginLeft: 6 }} /> : null}
            <AppText variant="caption" weight="600" color="accent" style={{ marginLeft: 8 }}>
              {ago(comment.at)}
            </AppText>
            {comment.pinned ? <Icon name="mapPin" size={13} color={colors.textMuted} style={{ marginLeft: 6 }} /> : null}
          </View>
          <AppText variant="bodySm" style={{ marginTop: 4 }}>
            {comment.body}
          </AppText>
          <View style={[styles.rowC, { marginTop: 8, gap: 18 }]}>
            {onReply ? (
              <Touch onPress={() => onReply(comment)} style={styles.action}>
                <Icon name="messageCircle" size={16} color={colors.textMuted} />
                <AppText variant="caption" weight="600" color="textMuted" style={{ marginLeft: 5 }}>
                  Reply
                </AppText>
              </Touch>
            ) : null}
          </View>
        </View>
      </View>
      {comment.replies.length ? (
        open ? (
          comment.replies.map(r => <CommentItem key={r.id} comment={r} depth={1} onReply={onReply} />)
        ) : (
          <Touch onPress={() => setOpen(true)} style={[styles.more, { paddingLeft: space.lg + 50 }]}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <AppText variant="caption" weight="700" color="accent">
              View {comment.replies.length} replies
            </AppText>
          </Touch>
        )
      ) : null}
    </View>
  );
}

/** Fake input that opens the full comments screen. */
export function Composer({ onPress, placeholder = 'Add a comment…' }: { onPress: () => void; placeholder?: string }) {
  const { colors } = useTheme();
  return (
    <Touch onPress={onPress} style={styles.composerRow} accessibilityLabel={placeholder}>
      <View style={[styles.me, { backgroundColor: colors.elevated }]}>
        <Icon name="user" size={18} color={colors.textMuted} />
      </View>
      <View style={[styles.fakeInput, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <AppText variant="bodySm" color="textMuted">
          {placeholder}
        </AppText>
      </View>
    </Touch>
  );
}

const REACTIONS = ['🔥', '👏', '😮', '😢', '🏏'];

/** Reaction counts with tap-to-react. Reacting needs an account (the API ties reactions to a user). */
export function ReactionBar({ counts, thread }: { counts: Record<string, number>; thread: string }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const { user } = useAuth();
  const [mine, setMine] = useState<string | null>(null);
  const list = [...new Set([...REACTIONS, ...Object.keys(counts)])];
  const react = async (emoji: string) => {
    if (!user) return nav.navigate('SignIn');
    const prev = mine;
    // Optimistic: one reaction at a time, like the website.
    setMine(prev === emoji ? null : emoji);
    try {
      if (prev && prev !== emoji) await repo.react(thread, prev);
      await repo.react(thread, emoji);
    } catch {
      setMine(prev);
    }
  };
  return (
    <View style={[styles.rowC, { gap: space.sm, paddingHorizontal: space.lg, flexWrap: 'wrap' }]}>
      {list.map(emoji => {
        const n = counts[emoji] ?? 0;
        const on = mine === emoji;
        return (
          <Touch
            key={emoji}
            onPress={() => react(emoji)}
            accessibilityState={{ selected: on }}
            style={[styles.reaction, { backgroundColor: on ? colors.brandSoft : colors.surface, borderColor: on ? colors.brand : colors.hairline }]}
          >
            <AppText style={{ fontSize: 18, lineHeight: 22 }}>{emoji}</AppText>
            <AppText variant="caption" weight="700" tabular color={on ? 'accent' : 'textSecondary'} style={{ marginLeft: 6 }}>
              {compact(n + (on ? 1 : 0))}
            </AppText>
          </Touch>
        );
      })}
    </View>
  );
}

/** Preview block: top comments + composer + "view all". */
export function CommentsPreview({ thread, title, list, total }: { thread: string; title: string; list: Comment[]; total: number }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const open = () => nav.navigate('Comments', { thread, title });
  return (
    <View>
      <View style={[styles.rowC, { paddingHorizontal: space.lg, marginBottom: space.sm }]}>
        <AppText variant="section" style={{ flex: 1 }}>
          Comments{' '}
          <AppText variant="section" color="textMuted" tabular>
            {total}
          </AppText>
        </AppText>
      </View>
      <Composer onPress={open} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        {list.slice(0, 3).map((c, i) => (
          <View key={c.id}>
            {i > 0 ? <Hairline inset={space.lg} /> : null}
            <CommentItem comment={c} onReply={open} />
          </View>
        ))}
        <Hairline />
        <Touch onPress={open} style={styles.viewAll}>
          <AppText variant="label" weight="700" color="accent">
            {total ? `View all ${total} comments` : 'Be the first to comment'}
          </AppText>
          <Icon name="chevronRight" size={16} color={colors.accent} />
        </Touch>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', paddingHorizontal: space.lg, paddingVertical: 14 },
  action: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingRight: 4 },
  more: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, minHeight: 44 },
  line: { width: 24, height: 1, marginRight: 8 },
  composerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.md },
  me: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  fakeInput: { flex: 1, marginLeft: 12, height: 44, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth * 2, justifyContent: 'center', paddingHorizontal: 16 },
  reaction: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  card: { marginHorizontal: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  viewAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 50 },
});
