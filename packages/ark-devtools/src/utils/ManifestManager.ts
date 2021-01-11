import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import traverse from 'traverse';
import { Automator } from '../automation/core/Automator';

export type ManifestType = 'package' | 'module' | 'auto';

/**
 * Used to throw when manifest is not matching the schema
 */
export class InvalidManifestError {
  public message: string;
  /**
   * Constructor
   * @param {string} message
   */
  constructor(message: string) {
    this.message = message;
  }
}

export type Role = {
  /**
   * e.g. admin | system_user | support_user
   */
  Name: string;
  Label?: string;
};

export type WebApp = {
  title: string;
  description?: string;
};

export type ServiceEndpoint = {
  title: string;
  description?: string;
};

export type RNApp = {
  title: string;
  description?: string;
};

export interface Manifest {
  Roles?: Array<Role>;
  ServiceEndpoints?: Array<ServiceEndpoint>;
  WebApps?: Array<WebApp>;
  RNApps?: Array<RNApp>;
}

export interface IManifestAutomationControllerPlugin {
  check: () => void;
  apply: () => void;
}

type PluginLog = {
  content: any;
  level: 'log' | 'warn' | 'error';
};

type PluginEvaluator = (opts: {
  task: {
    push: (id: string, args?: any) => void;
  };
  log: (content: any, level?: 'log' | 'warn' | 'error') => void;
  data: any;
}) => Generator;

type PluginExecutor = (opts: {
  log: (content: any, level?: 'log' | 'warn' | 'error') => void;
  data: any;
  args: any;
}) => Generator;

type PluginAction = {
  id: string;
  args: any;
};

/**
 * Manifest Plugin
 */
export class ManifestPlugin {
  test: RegExp[];
  manifestType: ManifestType;
  registeredActions: {
    [key: string]: PluginExecutor;
  };
  messages: Array<PluginLog>;
  actions: Array<PluginAction>;
  evaluator: PluginEvaluator;

  /**
   * Creates new instance of plugin
   */
  constructor() {
    this.test = [];
    this.actions = [];
    this.messages = [];
    this.manifestType = 'auto';
    this.registeredActions = {};
  }

  /**
   * Test whether at least one test is matching the path
   * @param {string} path
   * @return {boolean}
   */
  isMatching(path: string) {
    return this.test.some((t) => t.test(path) === true);
  }

  /**
   * Test whether the
   * @param {ManifestType} inputType
   * @return {boolean}
   */
  isTypeMatching(inputType: ManifestType) {
    return this.manifestType === 'auto' || this.manifestType === inputType;
  }

  /**
   * Reset plugin state
   */
  reset() {
    // Reset actions
    this.actions = [];
    // Reset messages
    this.messages = [];
  }

  /**
   * Run plugin
   * @param {Automator} automator
   * @param {any} data
   */
  *run(automator: Automator, data: any) {
    if (!this.evaluator) {
      throw new Error('Evaluator has not been implemented');
    }

    this.reset();

    yield () =>
      this.evaluator({
        task: {
          push: (id, args) => {
            this.actions.push({
              id,
              args,
            });
          },
        },
        log: (content, level = 'log') => {
          this.messages.push({
            content,
            level,
          });
        },
        data,
      });

    let i: number;
    for (i = 0; i < this.actions.length; i++) {
      yield () =>
        this.registeredActions[this.actions[i].id]({
          log: (content, level = 'log') => {
            this.messages.push({
              content,
              level,
            });
          },
          data,
          args: this.actions[i].args,
        });
    }
  }
}

/**
 * ManifestController class provides options for the hooks and plugins
 */
export class ManifestController {
  static instance: ManifestController;
  /**
   * Creates singleton instance
   * @return {ManifestController}
   */
  static getInstance() {
    if (!ManifestController.instance) {
      ManifestController.instance = new ManifestController();
    }
    return ManifestController.instance;
  }

  public plugins: Array<ManifestPlugin>;

  /**
   * Creates new instance of Manifest Controller
   */
  constructor() {
    this.plugins = [];
  }

  /**
   * Find plugins that match with address
   * @param {string} inputAddress
   * @param {ManifestType=} manifestType
   * @return {ManifestPlugin[]}
   */
  matchPlugins(
    inputAddress: string,
    manifestType: ManifestType = 'auto'
  ): Array<ManifestPlugin> {
    return this.plugins
      .filter((p) => p.isTypeMatching(manifestType) === true)
      .filter((p) => p.isMatching(inputAddress) === true);
  }
}

export const useManifestController = () => ManifestController.getInstance();

/**
 * Creates a plugin
 * @param {ManifestType} manifestType
 * @param {string} test
 * @param {function} initializer
 * @param {boolean} preventRegistration
 * @return {ManifestPlugin}
 */
export function createPlugin(
  manifestType: ManifestType,
  test: RegExp | RegExp[],
  initializer: (opts: {
    registerAction: (id: string, func: PluginExecutor) => void;
    evaluate: (func: PluginEvaluator) => void;
  }) => void,
  preventRegistration: boolean = false
) {
  const plugin = new ManifestPlugin();
  plugin.manifestType = manifestType;
  plugin.test = Array.isArray(test) ? test : [test];
  initializer &&
    initializer({
      evaluate: (func) => {
        plugin.evaluator = func;
      },
      registerAction: (id, func) => {
        plugin.registeredActions[id] = func;
      },
    });

  if (preventRegistration === false) {
    const controller = useManifestController();
    controller.plugins.push(plugin);
  }

  return plugin;
}

/**
 * Provides utility function to manage Ark project configuration file
 */
export class ManifestManager {
  public manifestType: ManifestType;
  public cwd: string;
  public configuration: Manifest;
  public isLoaded: boolean;
  /**
   * Constructor
   * @param {string=} cwd
   * @param {Manifest=} manifest (Optional)
   * @param {ManifestType=} manifestType (Optional)
   */
  constructor(cwd?: string, manifest?: Manifest, manifestType?: ManifestType) {
    this.cwd = cwd || process.cwd();
    if (manifest) {
      this.configuration = manifest;
      this.isLoaded = true;
    } else {
      this.configuration = null;
      this.isLoaded = false;
    }
  }

  /**
   * Get absolute path within cwd
   * @param {string} p Path
   * @return {string} Absolute path
   */
  getPath(p: string) {
    return path.join(this.cwd, p);
  }

  /**
   * Get manifest path
   * @param {ManifestType} manifestType
   * @return {string}
   */
  getManifestPath(manifestType: ManifestType = 'package') {
    return this.getPath(`${manifestType}.manifest.yml`);
  }

  /**
   * Load manifest file and build up services
   * @param {ManifestType=} manifestType
   * @param {boolean=} suppressError
   * @return {boolean} TRUE if success, otherwise FALSE
   */
  load(manifestType?: ManifestType, suppressError: boolean = false) {
    const throwError = (message: string) => {
      if (suppressError === true) {
        return false;
      }
      throw new Error(message);
    };

    const manifestPreferrence: 'auto' | ManifestType = manifestType || 'auto';
    let configPath: string = null;

    if (manifestPreferrence === 'auto') {
      configPath = this.getManifestPath('module');
      if (!fs.existsSync(configPath)) {
        configPath = this.getManifestPath('package');
        if (!fs.existsSync(configPath)) {
          return throwError('No package / module manifest found');
        } else {
          this.manifestType = 'package';
        }
      } else {
        this.manifestType = 'module';
      }
    } else {
      this.manifestType = manifestPreferrence;
      configPath = this.getManifestPath(manifestPreferrence);
      if (!fs.existsSync(configPath)) {
        return throwError(`No ${manifestPreferrence} manifest found`);
      }
    }

    let data: string | Manifest = fs.readFileSync(configPath, 'utf-8');
    if (typeof data === 'string') {
      try {
        data = yaml.parse(data);
        // TODO: Json Validation
      } catch (e) {
        throw new InvalidManifestError('Invalid JSON provided in file');
      }
    }
    if (typeof data === 'object') {
      this.configuration = data;
      this.isLoaded = true;
      return true;
    }

    return false;
  }

  /**
   * Write manifest file to disk
   * @param {ManifestType} manifestType
   */
  write(manifestType: ManifestType = 'package') {
    const configPath = this.getManifestPath(manifestType);
    fs.writeFileSync(configPath, yaml.stringify(this.configuration));
  }

  /**
   * Sync
   * @param {Automator} automator
   * @param {ManifestController=} controller
   * @return {Generator}
   */
  *sync(automator: Automator, controller?: ManifestController): Generator {
    const manifestType = this.manifestType;
    controller = controller || useManifestController();
    const traverseResult = traverse(this.configuration);
    const paths = traverseResult.paths().filter((p) => p.length > 0);

    let i = 0;
    for (i = 0; i < paths.length; i++) {
      const address = paths[i].join('.');
      const plugins = controller.matchPlugins(address, manifestType);
      let j = 0;
      for (j = 0; j < plugins.length; j++) {
        yield () => plugins[j].run(automator, traverseResult.get(paths[i]));
      }
    }

    return true;
  }
}

export const ManifestUtils = {
  createManifest: (
    opts: Partial<Manifest>,
    defaultOpts?: Partial<Manifest>
  ) => {
    return Object.assign<Manifest, Partial<Manifest>, Partial<Manifest>>(
      {
        Roles: [],
        ServiceEndpoints: [],
      },
      defaultOpts || {},
      opts
    );
  },
};
