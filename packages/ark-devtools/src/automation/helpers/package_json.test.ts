import { depExtractor } from './package_json';
import { CoreProperties } from '@schemastore/package';

const config: CoreProperties = {
  dependencies: {
    react: '16.0.0',
  },
  devDependencies: {
    typescript: '7.8.0',
  },
  peerDependencies: {
    moment: '4.2.1',
  },
};

test('dependencies mode', () => {
  const react = depExtractor(config, 'react');
  const reactInDependencies = depExtractor(config, 'react', 'dependencies');
  const reactInDevpendencies = depExtractor(config, 'react', 'devDependencies');
  const reactInPeerpendencies = depExtractor(
    config,
    'react',
    'peerDependencies'
  );

  expect(react).toHaveLength(1);
  expect(reactInDependencies).toHaveLength(1);
  expect(reactInDevpendencies).toHaveLength(0);
  expect(reactInPeerpendencies).toHaveLength(0);

  expect(react[0].name).toStrictEqual('react');
  expect(react[0].version).toStrictEqual('16.0.0');
  expect(react[0].type).toStrictEqual('dependencies');
});

test('devDependencies mode', () => {
  const typescript = depExtractor(config, 'typescript');
  const typescriptInDependencies = depExtractor(
    config,
    'typescript',
    'dependencies'
  );
  const typescriptInDevpendencies = depExtractor(
    config,
    'typescript',
    'devDependencies'
  );
  const typescriptInPeerpendencies = depExtractor(
    config,
    'typescript',
    'peerDependencies'
  );

  expect(typescript).toHaveLength(1);
  expect(typescriptInDependencies).toHaveLength(0);
  expect(typescriptInDevpendencies).toHaveLength(1);
  expect(typescriptInPeerpendencies).toHaveLength(0);

  expect(typescript[0].name).toStrictEqual('typescript');
  expect(typescript[0].version).toStrictEqual('7.8.0');
  expect(typescript[0].type).toStrictEqual('devDependencies');
});

test('peerDependencies mode', () => {
  const moment = depExtractor(config, 'moment');
  const momentInDependencies = depExtractor(config, 'moment', 'dependencies');
  const momentInDevpendencies = depExtractor(
    config,
    'moment',
    'devDependencies'
  );
  const momentInPeerpendencies = depExtractor(
    config,
    'moment',
    'peerDependencies'
  );

  expect(moment).toHaveLength(1);
  expect(momentInDependencies).toHaveLength(0);
  expect(momentInDevpendencies).toHaveLength(0);
  expect(momentInPeerpendencies).toHaveLength(1);

  expect(moment[0].name).toStrictEqual('moment');
  expect(moment[0].version).toStrictEqual('4.2.1');
  expect(moment[0].type).toStrictEqual('peerDependencies');
});
