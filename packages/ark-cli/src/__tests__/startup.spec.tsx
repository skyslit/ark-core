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

const delay = (ms: number) => new Promise((r) => setTimeout(() => r(true), ms));

describe('startup', () => {
  test(
    'empty directory',
    async () => {
      const { lastFrame, stdin, unmount, cleanup } = render(
        <App cwd={testDirectory} mode="normal" isManagedRuntime={true} />
      );

      expect(lastFrame()).toContain('CLI Booting up');

      await delay(500);

      expect(lastFrame()).toContain('Project name');

      stdin.write('renamed-project');
      await delay(100);
      stdin.write(ENTER);

      await delay(1000);

      const yamlFileContent = fs.readFileSync(
        path.join(testDirectory, 'package.manifest.yml'),
        'utf-8'
      );
      expect(yamlFileContent).toContain('name: renamed-project');

      unmount();
      cleanup();
    },
    10 * 1000
  );
});
