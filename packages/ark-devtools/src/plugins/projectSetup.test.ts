import plugins from './projectSetup';

test('accessor matches', () => {
  expect(plugins.setup.isTypeMatching('package')).toStrictEqual(true);
  expect(plugins.setup.isMatching('name')).toStrictEqual(true);
  expect(plugins.setup.isMatching('name.')).toStrictEqual(false);
  expect(plugins.setup.isMatching('.name')).toStrictEqual(false);
});
