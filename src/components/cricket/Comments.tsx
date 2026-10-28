import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REACTIONS, repo } from '../../data/repo';
import type { Comment } from '../../data/types';
import { useAuth } from '../../state/auth';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { control, radius, space } from '../../theme/tokens';
import { ago } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { Tag } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { Avatar, TeamBadge } from './Badges';

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

/** What you can do to a comment, decided by the thread from who you are. */
export interface CommentActions {
  /** Toggle a reaction; resolves to whether it is now on. */
  onReact?: (c: Comment, emoji: string) => Promise<boolean>;
  onReport?: (c: Comment) => void;
  onDelete?: (c: Comment) => void;
  reported?: boolean;
  /** Delete in progress. */
  busy?: boolean;
}

export function CommentItem({ comment, onReact, onReport, onDelete, reported, busy }: { comment: Comment } & CommentActions) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const [counts, setCounts] = useState(comment.reactions);
  const [mine, setMine] = useState(() => new Set(comment.mine));

  const toggle = async (emoji: string) => {
    if (!onReact) return nav.navigate('SignIn');
    // Optimistic, then settle on what the API says it did.
    const flip = (on: boolean) => {
      setMine(m => {
        const next = new Set(m);
        if (on) next.add(emoji);
        else next.delete(emoji);
        return next;
      });
      setCounts(c => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (on ? 1 : -1)) }));
    };
    const was = mine.has(emoji);
    flip(!was);
    try {
      const now = await onReact(comment, emoji);
      if (now === was) flip(now);
    } catch {
      flip(was);
    }
  };

  return (
    <View style={[styles.item, busy && { opacity: 0.5 }]}>
      <Avatar name={comment.author} size={38} />
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
          <AppText variant="caption" color="textMuted" style={{ marginLeft: 8 }}>
            {ago(comment.at)}
          </AppText>
        </View>
        <AppText variant="bodySm" style={{ marginTop: 4 }}>
          {comment.body}
        </AppText>
        <View style={styles.chips}>
          {REACTIONS.map(emoji => {
            const n = counts[emoji] ?? 0;
            const on = mine.has(emoji);
            return (
              <Touch
                key={emoji}
                onPress={() => toggle(emoji)}
                style={[styles.chip, { backgroundColor: on ? colors.brandSoft : colors.background, borderColor: on ? colors.brand : colors.hairline }]}
                accessibilityLabel={`${emoji} ${n}`}
                accessibilityState={{ selected: on }}
              >
                <AppText style={styles.chipEmoji}>{emoji}</AppText>
                {n ? (
                  <AppText variant="caption" weight="700" tabular color={on ? 'accent' : 'textSecondary'} style={{ marginLeft: 4 }}>
                    {compact(n)}
                  </AppText>
                ) : null}
              </Touch>
            );
          })}
        </View>
        <View style={styles.actions}>
          {onReport ? (
            <Touch onPress={() => onReport(comment)} disabled={reported} style={styles.action} accessibilityLabel={reported ? 'Reported' : 'Report comment'}>
              <Icon name="flag" size={15} color={colors.textMuted} />
              <AppText variant="caption" weight="600" color="textMuted" style={{ marginLeft: 5 }}>
                {reported ? 'Reported' : 'Report'}
              </AppText>
            </Touch>
          ) : null}
          {onDelete ? (
            <Touch onPress={() => onDelete(comment)} disabled={busy} style={styles.action} accessibilityLabel="Delete comment">
              {busy ? <ActivityIndicator size="small" color={colors.danger} /> : (
                <AppText variant="caption" weight="600" color="danger">
                  Delete
                </AppText>
              )}
            </Touch>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Same reasons the website offers, so moderators see one list. */
const REASONS = [
  { id: 'spam', label: 'Spam', hint: 'Promotional or repeated junk.' },
  { id: 'harassment', label: 'Harassment', hint: 'Personal attacks or bullying.' },
  { id: 'hate', label: 'Hate speech', hint: 'Hateful or discriminatory language.' },
  { id: 'misinformation', label: 'Misinformation', hint: 'False or misleading claims.' },
  { id: 'other', label: 'Something else', hint: 'Moderators will take a look.' },
];

/** Bottom sheet to pick why a comment is being reported. */
export function ReportSheet({ comment, onClose, onSubmit }: { comment?: Comment; onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const pick = async (reason: string) => {
    setSending(reason);
    setFailure(undefined);
    try {
      await onSubmit(reason);
    } catch {
      setFailure('Couldn’t send the report. Try again.');
    } finally {
      setSending(undefined);
    }
  };
  return (
    <Modal visible={!!comment} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.grip, { backgroundColor: colors.border }]} />
        <AppText variant="section">Report comment</AppText>
        <AppText variant="bodySm" color="textSecondary" numberOfLines={2} style={{ marginTop: 4, marginBottom: space.md }}>
          {comment?.body}
        </AppText>
        {REASONS.map(r => (
          <Touch key={r.id} onPress={() => pick(r.id)} disabled={!!sending} style={[styles.reason, { borderColor: colors.hairline }]} accessibilityLabel={r.label}>
            <View style={{ flex: 1 }}>
              <AppText variant="label" weight="600">
                {r.label}
              </AppText>
              <AppText variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                {r.hint}
              </AppText>
            </View>
            {sending === r.id ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="chevronRight" size={16} color={colors.textMuted} />}
          </Touch>
        ))}
        {failure ? (
          <AppText variant="caption" color="danger" style={{ marginTop: space.sm }}>
            {failure}
          </AppText>
        ) : null}
      </View>
    </Modal>
  );
}

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

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', paddingHorizontal: space.lg, paddingTop: 14, paddingBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', height: control.pill, minWidth: 44, justifyContent: 'center', paddingHorizontal: 9, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  chipEmoji: { fontSize: 15, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  action: { flexDirection: 'row', alignItems: 'center', minHeight: control.md, minWidth: 32 },
  reaction: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space.lg, paddingTop: space.sm },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: space.md },
  reason: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderTopWidth: StyleSheet.hairlineWidth },
});
