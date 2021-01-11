jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs.fs;
});

import * as fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import {
  ManifestManager,
  createPlugin,
  ManifestController,
} from './ManifestManager';
import { createProcess } from '../automation/core/Automator';

const cwd: string = '/test-dir';

afterEach(() => {
  if (fs.existsSync(cwd)) {
    rimraf.sync(cwd);
  }
  fs.mkdirSync(cwd);
});

describe('manifest loading', () => {
  describe('loader (in auto mode)', () => {
    test('should throw error', () => {
      // Arrange
      const manager = new ManifestManager(cwd);

      // Act
      const t = () => manager.load();

      // Assert
      expect(t).toThrowError('No package / module manifest found');
    });

    test('should load packages', () => {
      // Arrange
      fs.writeFileSync(path.join(cwd, 'package.manifest.yml'), '{}');
      const manager = new ManifestManager(cwd);

      // Act
      manager.load();

      // Assert
      expect(manager.manifestType).toBe('package');
    });

    test('should load modules', () => {
      // Arrange
      fs.writeFileSync(path.join(cwd, 'module.manifest.yml'), '{}');
      const manager = new ManifestManager(cwd);

      // Act
      manager.load();

      // Assert
      expect(manager.manifestType).toBe('module');
    });
  });

  describe('loader (in module mode)', () => {
    test('should throw error', () => {
      // Arrange
      fs.writeFileSync(path.join(cwd, 'package.manifest.yml'), '{}');
      const manager = new ManifestManager(cwd);

      // Act
      const t = () => manager.load('module');

      // Assert
      expect(t).toThrowError('No module manifest found');
    });
    test('should load', () => {
      // Arrange
      fs.writeFileSync(path.join(cwd, 'module.manifest.yml'), '{}');
      const manager = new ManifestManager(cwd);

      // Act
      manager.load('module');

      // Assert
      expect(manager.manifestType).toBe('module');
    });
  });

  describe('loader (in package mode)', () => {
    test('should throw error', () => {
      // Arrange
      fs.writeFileSync(path.join(cwd, 'module.manifest.yml'), '{}');
      const manager = new ManifestManager(cwd);

      // Act
      const t = () => manager.load('package');

      // Assert
      expect(t).toThrowError('No package manifest found');
    });
    test('should load', () => {
      // Arrange
      fs.writeFileSync(path.join(cwd, 'package.manifest.yml'), '{}');
      const manager = new ManifestManager(cwd);

      // Act
      manager.load('package');

      // Assert
      expect(manager.manifestType).toBe('package');
    });
  });
});

describe('plugins', () => {
  test('createPlugin fn()', () => {
    const plugin = createPlugin(
      'auto',
      /.*/,
      ({ evaluate, registerAction }) => {
        registerAction('TEST_RUNNER', function* () {});
        evaluate(function* () {});
      },
      true
    );
    expect(plugin.test[0]).toEqual(/.*/);
    expect(plugin.registeredActions.TEST_RUNNER).toBeTruthy();
  });

  test('match plugin', () => {
    const controller = new ManifestController();
    const pluginMatchAll = createPlugin('auto', /.*/, () => {}, true);
    const pluginMatchOnlyRoles = createPlugin('auto', /roles/, () => {}, true);
    const pluginMatchMultiple = createPlugin(
      'auto',
      [/match-1/, /match-2/],
      () => {},
      true
    );
    controller.plugins.push(pluginMatchAll);
    controller.plugins.push(pluginMatchOnlyRoles);
    controller.plugins.push(pluginMatchMultiple);

    const randomMatch = controller.matchPlugins('random_file');
    const rolesMatch = controller.matchPlugins('roles');
    const multipleMatch1 = controller.matchPlugins('match-1');
    const multipleMatch2 = controller.matchPlugins('match-2');
    const multipleMatch3 = controller.matchPlugins('match-3');

    expect(randomMatch).toHaveLength(1);
    expect(rolesMatch).toHaveLength(2);
    expect(multipleMatch1).toHaveLength(2);
    expect(multipleMatch2).toHaveLength(2);
    expect(multipleMatch3).toHaveLength(1);
  });

  test('match plugin (multiple addresses)', () => {
    const controller = new ManifestController();
    const pluginMatchMultiple = createPlugin(
      'auto',
      [/match-1/, /match-2/],
      () => {},
      true
    );
    controller.plugins.push(pluginMatchMultiple);

    const multipleMatch1 = controller.matchPlugins('match-1');
    const multipleMatch2 = controller.matchPlugins('match-2');
    const multipleMatch3 = controller.matchPlugins('match-3');

    expect(multipleMatch1).toHaveLength(1);
    expect(multipleMatch2).toHaveLength(1);
    expect(multipleMatch3).toHaveLength(0);
  });

  test('match plugin (wildcard)', () => {
    const controller = new ManifestController();
    const pluginMatchMultiple = createPlugin(
      'package',
      [/match-*/],
      () => {},
      true
    );
    controller.plugins.push(pluginMatchMultiple);

    const multipleMatch1 = controller.matchPlugins('match-1', 'package');
    const multipleMatch2 = controller.matchPlugins('match-2', 'package');
    const multipleMatch3 = controller.matchPlugins('match-3', 'package');

    expect(multipleMatch1).toHaveLength(1);
    expect(multipleMatch2).toHaveLength(1);
    expect(multipleMatch3).toHaveLength(1);
  });

  test('match plugin (by manifest type)', () => {
    const controller = new ManifestController();
    const pluginMatchMultiple = createPlugin(
      'package',
      [/match-1/, /match-2/],
      () => {},
      true
    );
    const pluginMatch3 = createPlugin('module', /match-3/, () => {}, true);
    controller.plugins.push(pluginMatchMultiple);
    controller.plugins.push(pluginMatch3);

    const multipleMatch1 = controller.matchPlugins('match-1', 'package');
    const multipleMatch2 = controller.matchPlugins('match-2');
    const multipleMatch3 = controller.matchPlugins('match-3', 'module');

    expect(multipleMatch1).toHaveLength(1);
    expect(multipleMatch2).toHaveLength(0);
    expect(multipleMatch3).toHaveLength(1);
  });
});

describe('manifest syncing', () => {
  const output: string[] = [];

  const createSampleFilePlugin = createPlugin(
    'auto',
    /ServiceEndpoints.+[0-9]$/,
    (opts) => {
      opts.registerAction('CREATE_APP_TSX', function* (opts) {
        output.push(opts.args.customMessage);
      });

      opts.evaluate(function* (opts) {
        opts.task.push('CREATE_APP_TSX', {
          customMessage: opts.data.title,
        });
      });
    },
    true
  );

  test('path and compatibility match', () => {
    expect(createSampleFilePlugin.isTypeMatching('package')).toBe(true);
    expect(createSampleFilePlugin.isTypeMatching('module')).toBe(true);
    expect(createSampleFilePlugin.isMatching('ServiceEndpoints.0')).toBe(true);
    expect(createSampleFilePlugin.isMatching('ServiceEndpoints.21')).toBe(true);

    expect(createSampleFilePlugin.isMatching('ServiceEndpoints.0.test')).toBe(
      false
    );
    expect(createSampleFilePlugin.isMatching('ServiceEndpoints.')).toBe(false);
    expect(createSampleFilePlugin.isMatching('ServiceEndpoints')).toBe(false);
    expect(createSampleFilePlugin.isMatching('')).toBe(false);
  });

  test('sync (order of execution)', async () => {
    // Arrange
    const controller = new ManifestController();
    const manager = new ManifestManager(cwd, {
      ServiceEndpoints: [
        {
          title: 'MS 1',
          description: 'Sample description for MS 1',
        },
        {
          title: 'MS 2',
          description: 'Sample description for MS 2',
        },
      ],
    });

    controller.plugins.push(createSampleFilePlugin);

    const automation = createProcess((automator) => {
      automator.step(function* () {
        yield () => manager.sync(automator, controller);
        automator
          .getData('MAN_PLUGIN:AUTOMATOR_QUEUE', [])
          .forEach((innerAutomator) => {
            automator.job.queueAutomator(innerAutomator);
          });
      });
    });

    await automation.start();

    expect(output[0]).toBe('MS 1');
    expect(output[1]).toBe('MS 2');
  });
});
