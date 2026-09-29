import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { TextDecoder, TextEncoder } from 'node:util';
import { randomUUID, webcrypto } from 'node:crypto';

// jsdom ships no TextEncoder/TextDecoder, so anything that measures utf-8 byte
// length throws under Jest even though it works in every real browser.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// jsdom also has no crypto.randomUUID, which the assistant session id needs.
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: randomUUID,
    configurable: true,
    writable: true,
  });
}

// jsdom performs no layout, so offsetWidth/offsetHeight are always 0. Any
// "is this element visible" check (e.g. the focus trap's focusable filter)
// then rejects every node. Report a non-zero size so those checks work.
if (typeof window !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 100,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 20,
  });
}

// jsdom has no scrollIntoView, so any component that scrolls a node into view
// (deep-link highlighting, back-to-top) throws. No-op it.
if (typeof window !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    /* no layout in jsdom */
  };
}

// Shared Next.js stubs. Registered once here so component suites do not each
// re-declare next/navigation, next/image and next/link. Individual suites can
// still override any of them with their own jest.mock.
jest.mock('next/navigation', () => require('./nextMocks').createNextNavigationMock());
jest.mock('next/image', () => require('./nextMocks').MockImage);
jest.mock('next/link', () => require('./nextMocks').MockLink);

// React Testing Library does not auto-clean under Jest. Guarded because some
// suites (the route handlers) run under @jest-environment node, which has no DOM.
afterEach(() => {
  if (typeof document !== 'undefined') cleanup();
});
