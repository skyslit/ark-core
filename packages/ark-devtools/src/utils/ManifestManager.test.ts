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
    const plugin = createPlugin('auto', '*', ({ evaluate, registerAction }) => {
      registerAction('TEST_RUNNER', function* () {});
      evaluate(function* () {});
    });
    expect(plugin.test[0]).toBe('*');
    expect(plugin.registeredActions.TEST_RUNNER).toBeTruthy();
  });

  test('match plugin', () => {
    const controller = new ManifestController();
    const pluginMatchAll = createPlugin('auto', '*', () => {});
    const pluginMatchOnlyRoles = createPlugin('auto', 'roles', () => {});
    const pluginMatchMultiple = createPlugin(
      'auto',
      ['match-1', 'match-2'],
      () => {}
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
      ['match-1', 'match-2'],
      () => {}
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
    const pluginMatchMultiple = createPlugin('package', ['match-*'], () => {});
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
      ['match-1', 'match-2'],
      () => {}
    );
    const pluginMatch3 = createPlugin('module', 'match-3', () => {});
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

describe('manifest traversal', () => {
  test('traverse test', () => {
    // Arrange
    const manager = new ManifestManager(cwd, {
      RNApps: [
        {
          title: 'Hello',
        },
      ],
    });

    manager.traverse();
  });
});
