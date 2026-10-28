import React from 'react';
import { KeyboardAvoidingView } from 'react-native';
import { CommentsThread } from '../../components/cricket/CommentsThread';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { useParams } from '../../navigation/Stack';
import { space } from '../../theme/tokens';

/** A thread on its own page (deep links); articles and matches show the same thread inline. */
export default function CommentsScreen() {
  const { thread, title } = useParams('Comments');
  return (
    <Screen>
      <Header title="Comments" subtitle={title} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Body bottomInset keyboardShouldPersistTaps="handled" contentStyle={{ paddingTop: space.lg }}>
          <CommentsThread thread={thread} />
        </Body>
      </KeyboardAvoidingView>
    </Screen>
  );
}
