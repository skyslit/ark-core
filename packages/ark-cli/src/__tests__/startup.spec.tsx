import React from 'react';
import path from 'path';
import { render } from 'ink-testing-library';
import fs from 'fs';
import rimraf from 'rimraf';
import App from '../app';

const testDirectory: string = path.join(
  __dirname,
  'test-artifacts',
  'statup-test'
);
const ENTER = '\r';

beforeEach(() => {
  if (fs.existsSync(testDirectory)) {
    rimraf.sync(testDirectory);
  }
  fs.mkdirSync(testDirectory, { recursive: true });
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('startup', () => {
  test('empty directory', async () => {
    const { lastFrame, stdin } = render(
      <App cwd={testDirectory} mode="normal" />
    );

    expect(lastFrame()).toContain('CLI Booting up');

    await delay(500);

    expect(lastFrame()).toContain('Project name');

    stdin.write('renamed-project');
    await delay(100);
    stdin.write(ENTER);

    await delay(1000);

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(testDirectory, 'package.json'), 'utf-8')
    );
    expect(packageJson.name).toBe('renamed-project');
  });
});
