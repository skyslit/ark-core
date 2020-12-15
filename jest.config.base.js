module.exports = {
  roots: [
    '<rootDir>/src',
  ],
  testRegex: '(/tests/.*.(test|spec)).(jsx?|tsx?|.ts?)$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  collectCoverage: false,
  coveragePathIgnorePatterns: [
    '(tests/.*.mock).(jsx?|tsx?)$',
  ],
  verbose: true,
};
