const base = require('../../jest.config.base.js');
const packageJson = require('./package.json');

module.exports = {
  ...base,
  name: packageJson.name,
  displayName: packageJson.name,
  verbose: true,
  modulePathIgnorePatterns: [
    'build',
  ],
  moduleNameMapper: {
    '^react-router-dom$': '<rootDir>/node_modules/react-router-dom',
  },
};
