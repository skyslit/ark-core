import initializeNpm from './npm-init';
import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';

const testDir = path.join(__dirname, '../../__test__/test-artifacts/npm-init');

beforeEach(() => {
  if (fs.existsSync(testDir)) {
    rimraf.sync(testDir);
  }

  fs.mkdirSync(testDir, { recursive: true });
});

test('fn should create package json in blank directory', (done) => {
  let hasSkipped: boolean = false;
  initializeNpm(
    {
      cwd: testDir,
      projectName: 'sample-project',
    },
    {
      skip: () => (hasSkipped = true),
    }
  )
    .toPromise()
    .then(() => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(testDir, 'package.json'), 'utf-8')
      );

      expect(hasSkipped).toStrictEqual(false);
      expect(packageJson.name).toStrictEqual('sample-project');

      done();
    })
    .catch(done);
});

test('fn should skip already initialised directory', (done) => {
  // Write a test package.json file
  const packageJsonPath = path.join(testDir, 'package.json');
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({
      name: 'existing-project',
    })
  );

  let hasSkipped: boolean = false;
  initializeNpm(
    {
      cwd: testDir,
      projectName: 'sample-project',
    },
    {
      skip: () => (hasSkipped = true),
    }
  )
    .toPromise()
    .then(() => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(testDir, 'package.json'), 'utf-8')
      );

      expect(hasSkipped).toStrictEqual(true);
      expect(packageJson.name).toStrictEqual('existing-project');

      done();
    })
    .catch(done);
});
