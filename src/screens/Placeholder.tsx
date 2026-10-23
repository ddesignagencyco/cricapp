import React from 'react';
import { EmptyState } from '../components/ui/Primitives';
import { Header, Screen } from '../components/ui/Layout';

export function placeholder(title: string) {
  return function Placeholder() {
    return (
      <Screen>
        <Header title={title} />
        <EmptyState icon="info" title={title} body="This screen is being built." />
      </Screen>
    );
  };
}
