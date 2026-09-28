import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// React Testing Library does not auto-clean under Jest.
afterEach(() => {
  cleanup();
});
