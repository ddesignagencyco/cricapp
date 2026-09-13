module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // ts-jest overrides `module` to CommonJS for Jest, which warns about the
    // nodenext setting the API builds with. Enabling isolatedModules instead
    // emits ESM that Jest's CommonJS loader cannot parse.
    '^.+\\.(t|j)s$': [
      'ts-jest',
      { useESM: true, diagnostics: { ignoreCodes: [151002] } },
    ],
  },
  transformIgnorePatterns: [
    'node_modules[/\\\\](?!@cricapp)',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  maxWorkers: 1,
  testTimeout: 30000,
};