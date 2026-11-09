/** Provider has no budget left (our own counter, or the provider answered 429). */
export class QuotaExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/** Provider cannot serve this call (endpoint not implemented, or key rejected). */
export class ProviderUnsupportedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderUnsupportedError';
  }
}

export class ProviderAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderAuthError';
  }
}
