import path from 'path';
import fs from 'fs';
import {
  ApplicationContext,
  ContextScope,
  createPointer,
  extractRef,
  ServiceResponse,
} from '@skyslit/ark-core';
import expressApp, { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import {
  SchemaDefinition,
  Model,
  Document,
  Schema,
  ConnectionOptions,
  createConnection,
  Connection,
} from 'mongoose';
import http from 'http';
import {
  makeApp,
  renderToString,
  reduxServiceStateSnapshot,
} from '@skyslit/ark-frontend';
import * as HTMLParser from 'node-html-parser';
import * as pathToRegexp from 'path-to-regexp';
import jwt from 'jsonwebtoken';

type HttpVerbs =
  | 'all'
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'options'
  | 'head';

type ServerOpts = {
  port: number;
  hostname: string;
  backlog?: number;
  listeningListener?: () => void;
};

type ServiceAlias = 'service' | 'rest';

type ServiceConsumerOptions = {
  alias: ServiceAlias;
  path: string;
  method: HttpVerbs;
  controller: ServiceController;
  skipServiceRegistration: boolean;
  skipBearerTokenCheck: boolean;
  policyExtractorRefs: string[];
};

type WebAppRenderer = {
  render: (initialState?: any) => expressApp.RequestHandler;
};

type UseServicePointer = (
  def: ServiceDefinitionMeta,
  opts?: Partial<ServiceConsumerOptions>
) => void;

type AuthOptions = {
  jwtSecretKey: jwt.Secret;
  jwtSignOptions?: jwt.SignOptions;
  jwtVerifyOptions?: jwt.VerifyOptions;
  jwtDecodeOptions?: jwt.DecodeOptions;
};

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace Express {
    // eslint-disable-next-line no-unused-vars
    interface Request {
      isAuthenticated: boolean;
      user: ArkUser;
      policies: Array<string>;
      input: { [key: string]: any };
    }
  }
  // eslint-disable-next-line no-unused-vars
  namespace Ark {
    // eslint-disable-next-line no-unused-vars
    interface Security {}
    // eslint-disable-next-line no-unused-vars
    interface Backend {
      useServer: (opts?: ServerOpts) => void;
      useApp: () => expressApp.Application;
      useRoute: (
        method: HttpVerbs,
        path: string,
        handlers: expressApp.RequestHandler | Array<expressApp.RequestHandler>
      ) => expressApp.Application;
      useService: UseServicePointer;
      useWebApp: (
        appId: string,
        ctx?: ContextScope<any>,
        htmlFileName?: string
      ) => WebAppRenderer;
    }
    // eslint-disable-next-line no-unused-vars
    interface Data {
      useDatabase: (
        name: keyof Ark.PackageDatabases,
        connectionString: string,
        opts?: ConnectionOptions
      ) => void;
      useModel: <T>(
        name: string,
        schema?: SchemaDefinition | (() => Schema),
        dbName?: keyof Ark.PackageDatabases
      ) => Model<T & Document>;
    }
    // eslint-disable-next-line no-unused-vars
    interface Databases {}
    // eslint-disable-next-line no-unused-vars
    type PackageDatabases = {
      default: Connection;
    } & Databases;
  }
}

/**
 * Reads static HTML file from resource
 * @param {string} htmlFilePath e.g. index.html | admin.html
 * @return {string} HTML static content
 */
function readHtmlFile(htmlFilePath: string): string {
  if (fs.existsSync(htmlFilePath)) {
    return fs.readFileSync(htmlFilePath, 'utf8');
  } else {
    // Try loading from
    return fs.readFileSync(path.join(__dirname, '../', htmlFilePath), 'utf8');
  }
}

type ServiceReq = [string, (string | object)?, object?];

/**
 * Create request payload
 * @param {ServiceReq} item
 * @return {any}
 */
export function createReq(item: ServiceReq) {
  let serviceRefId: string = '';
  let localAliasId: string = undefined;
  let input: any = {};

  if (item.length < 1 || item.length > 3) {
    throw new Error('Request definition expects 1-3 items');
  }

  serviceRefId = item[0];
  if (typeof item[1] === 'string') {
    localAliasId = item[1];
    if (item[2]) {
      input = item[2];
    }
  } else {
    input = item[1];
  }

  return {
    serviceRefId,
    localAliasId,
    input,
  };
}

/**
 * Creates Web App Server-Side Render
 * @param {ContextScope<any>} scope
 * @param {string} htmlFileName
 * @param {string} moduleId
 * @return {WebAppRenderer}
 */
function createWebAppRenderer(
  scope: ContextScope<any>,
  htmlFileName: string,
  moduleId: string
): WebAppRenderer {
  return {
    render: (
      initialState,
      reqs: Array<ServiceReq> = [['default/___context']]
    ) => {
      return async (req, res, next) => {
        const webAppContext = new ApplicationContext();
        let serviceState: any = {};

        try {
          const parsedReqs = reqs.map(createReq);

          await parsedReqs.reduce((acc, item) => {
            return acc.then(() => {
              return new Promise((resolve, reject) => {
                const ref = extractRef(item.serviceRefId, moduleId);
                const registryItem = ServiceController.getInstance().find(
                  ref.refId,
                  'service',
                  ref.moduleName
                );
                if (!registryItem) {
                  return reject(
                    new Error(
                      `'${ref.refId}' cannot be retrived under module '${ref.moduleName}'. Please make sure you are using the right moduleId/resId combination.`
                    )
                  );
                }
                runService(registryItem.def, {
                  input: Object.assign(req.input, item.input),
                  isAuthenticated: req.isAuthenticated,
                  user: req.user,
                  policies: req.policies,
                  body: req.body,
                  params: req.params,
                  query: req.query,
                  req,
                  res,
                })
                  .then((val) => {
                    serviceState = {
                      ...serviceState,
                      ...reduxServiceStateSnapshot(ref.refId, moduleId, val),
                    };
                    resolve(true);
                  })
                  .catch((err) => {
                    reject(err);
                  });
              });
            });
          }, (() => Promise.resolve(true))());
        } catch (e) {
          return next(e);
        }

        makeApp('ssr', scope, webAppContext, {
          url: req.url,
          initialState: Object.assign(
            {},
            initialState || {},
            serviceState || {}
          ),
        })
          .then((App) => {
            const store: any = webAppContext.getData('default', 'store');
            const htmlContent = readHtmlFile(htmlFileName);
            const htmlContentNode = HTMLParser.parse(htmlContent);

            const appStr = renderToString(App);
            const scriptNode = HTMLParser.parse(
              `<script>const ___hydrated_redux___=${JSON.stringify(
                store.getState()
              )};</script>`
            );
            htmlContentNode.querySelector('head').appendChild(scriptNode);
            htmlContentNode.querySelector('#root').set_content(appStr);
            res.send(htmlContentNode.toString());
          })
          .catch(next);
      };
    },
  };
}

/**
 * Normalise model name
 * @param {string} modId Module ID
 * @param {string} name Model Name
 * @return {string}
 */
function getModelName(modId: string, name: string): string {
  return `${modId}_${name}`;
}

export const Data = createPointer<Partial<Ark.Data>>(
  (moduleId, controller, context) => ({
    useDatabase: (
      name: keyof Ark.PackageDatabases,
      connectionString: string,
      opts?: ConnectionOptions
    ) => {
      controller.ensureInitializing(
        'useDatabase() should be called on context root'
      );
      controller.run(
        () =>
          new Promise((resolve, reject) => {
            const dbId: string = `db/${name}`;
            const databaseConnectionExist = context.existData(moduleId, dbId);
            if (databaseConnectionExist) {
              reject(
                new Error(`Db connection with same id ${dbId} already exists`)
              );
              return;
            }

            const connection = createConnection(
              connectionString,
              Object.assign<ConnectionOptions, ConnectionOptions>(
                {
                  useNewUrlParser: true,
                  useUnifiedTopology: true,
                },
                opts
              )
            );

            // Define rollback actions
            context.pushRollbackAction(async () => {
              await connection.close();
            });

            context.setData(moduleId, dbId, connection);

            connection.on('open', () => {
              resolve(null);
            });

            connection.on('error', (err) => {
              console.error(err);
              reject(err);
            });
          })
      );
    },
    useModel: <T extends unknown>(
      name: string,
      schema?: SchemaDefinition | (() => Schema),
      dbName: keyof Ark.PackageDatabases = 'default'
    ) => {
      const modelName = getModelName(moduleId, name);
      let registeredModel: Model<T & Document> = null;

      const modelRegistrationKey: string = `models/${moduleId}`;
      const modelExist = context.existData(moduleId, modelRegistrationKey);
      const mongooseConnection: Connection = context.getData(
        'default',
        `db/${dbName}`,
        null
      );

      if (schema) {
        // TODO: Check if already registered
        if (modelExist === true) {
          throw new Error(
            `Model '${name}' already exist on module '${moduleId}'`
          );
        }
        if (typeof schema === 'function') {
          registeredModel = mongooseConnection.model<T & Document>(
            modelName,
            schema()
          );
        } else {
          registeredModel = mongooseConnection.model<T & Document>(
            modelName,
            new Schema(schema)
          );
        }

        context.setData(moduleId, modelRegistrationKey, registeredModel);
      } else {
        if (modelExist === false) {
          throw new Error(
            `Model '${name}' not registered in module '${moduleId}'`
          );
        } else {
          registeredModel = context.getData(moduleId, modelRegistrationKey);
        }
      }
      return registeredModel;
    },
  })
);

const createAuthMiddleware = (authOpts: AuthOptions) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!authOpts) {
    return next();
  }

  let token = req.headers['authorization'];
  if (token) {
    if (token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }

    let identityPayload = null;
    try {
      identityPayload = jwt.verify(token, authOpts.jwtSecretKey);
    } catch (e) {
      /** Do nothing */
    }
    req.user = identityPayload as any;
    req.isAuthenticated = identityPayload ? true : false;
    try {
      if (req.isAuthenticated === true) {
        if (Array.isArray(req.user.policies)) {
          req.policies = req.user.policies;
        }
      }
    } catch (e) {
      /** Do nothing */
    }
  }

  next();
};

export const useServiceCreator: (
  moduleId: string,
  context: ApplicationContext
) => UseServicePointer = (moduleId: string, context: ApplicationContext) => (
  service: ServiceDefinitionMeta,
  _opts: Partial<ServiceConsumerOptions> = null
) => {
  const opts = Object.assign<
    ServiceConsumerOptions,
    Partial<ServiceConsumerOptions>
  >(
    {
      alias: 'service',
      path: `/___service/${moduleId}/${service.name}`,
      method: 'post',
      controller: ServiceController.getInstance(),
      skipServiceRegistration: false,
      skipBearerTokenCheck: false,
      policyExtractorRefs: [],
    },
    _opts
  );

  if (opts.skipServiceRegistration === false) {
    // Register
    opts.controller.register({
      def: service,
      path: opts.path,
      moduleId,
      alias: opts.alias,
      method: opts.method,
    });
  }

  context.getData<expressApp.Application>('default', 'express')[opts.method](
    opts.path,
    ([
      async (req: Request, res: Response, next: NextFunction) => {
        let stat: RunnerStat;

        try {
          stat = await runService(
            service,
            {
              req: req,
              res: res,
              body: req.body,
              params: req.params,
              query: req.query,
              isAuthenticated: req.isAuthenticated,
              user: req.user,
              policies: req.policies,
              input: req.input,
            },
            {
              disablePre: false,
              disableRule: false,
              disableLogic: false,
              disableValidation: false,
              disableCapabilities: false,
              controller: opts.controller,
              aliasMode: opts.alias,
              context: context,
              policyExtractors: opts.policyExtractorRefs.reduce<
                PolicyExtractor[]
              >((acc, item) => {
                acc.push(
                  context.take<PolicyExtractor>(
                    moduleId,
                    item,
                    'policy_extractor'
                  )
                );
                return acc;
              }, []),
            }
          );
        } catch (e) {
          stat = e;
        }

        if (stat) {
          res.status(stat.responseCode).json(stat.response);
        } else {
          // Pass thru if response is falsy
          next();
        }
      },
    ] as any[]).filter(Boolean)
  );
};

export const Backend = createPointer<Partial<Ark.Backend>>(
  (moduleId, controller, context) => ({
    init: () => {
      if (!context.existData('default', 'express')) {
        const instance = context.setData('default', 'express', expressApp());
        instance.use(
          '/_browser',
          expressApp.static(path.join(__dirname, '../_browser'))
        );
        instance.use((req, res, next) => {
          req.user = null;
          req.isAuthenticated = false;
          req.policies = [];
          req.input = {
            ...req.body,
            ...req.params,
            ...req.query,
          };
          next();
        });
      }
    },
    useServer: (opts) => {
      opts = opts
        ? opts
        : {
            port: 3000,
            hostname: undefined,
            backlog: undefined,
            listeningListener: undefined,
          };
      if (!context.existData(moduleId, 'http')) {
        const httpServer = context.setData(
          moduleId,
          'http',
          http.createServer(
            context.getData<expressApp.Application>('default', 'express')
          )
        );
        controller.run(() => {
          httpServer.listen(
            opts.port,
            opts.hostname,
            opts.backlog,
            opts.listeningListener
          );
        });
        context.pushRollbackAction(() => {
          httpServer.close();
        });
      }
    },
    useApp: () => context.getData('default', 'express'),
    useRoute: (method, path, handlers) => {
      return context
        .getData<expressApp.Application>('default', 'express')
        [method](path, handlers);
    },
    useService: useServiceCreator(moduleId, context),
    useWebApp: (appId, ctx, htmlFileName) => {
      if (!htmlFileName) {
        htmlFileName = `${appId}.html`;
      }

      if (!htmlFileName.toLowerCase().endsWith('.html')) {
        htmlFileName = `${htmlFileName}.html`;
      }

      let hasContextInitialized: boolean = context.getData<boolean>(
        'default',
        'hasContextApiCreated',
        false
      );

      if (!hasContextInitialized) {
        const useService = useServiceCreator(moduleId, context);
        hasContextInitialized = context.setData<boolean>(
          'default',
          'hasContextApiCreated',
          true
        );
        useService(
          defineService('___context', (opts) => {
            opts.defineLogic((opts) => {
              return opts.success({ message: 'Hello' });
            });
          })
        );
      }

      // const jsPath = `${path.basename(htmlFileName)}.js`;

      return context.useDataFromContext(
        moduleId,
        appId,
        ctx ? createWebAppRenderer(ctx, htmlFileName, moduleId) : undefined,
        false,
        'pwa'
      );
    },
  })
);

// ------------------ SERVICE BEGIN ------------------

type ControllerRegistryItem = {
  def: ServiceDefinitionMeta;
  moduleId?: string;
  alias: 'service' | 'rest';
  method: HttpVerbs;
  path: string;
};

/**
 * Provides service discovery
 */
export class ServiceController {
  static instance: ServiceController;
  /**
   * Creates a singleton instance of the class
   * @return {ServiceController}
   */
  static getInstance(): ServiceController {
    if (!ServiceController.instance) {
      ServiceController.instance = new ServiceController();
    }
    return ServiceController.instance;
  }

  private regisry: Array<ControllerRegistryItem> = [];

  /**
   * Registers a new service
   * @param {ControllerRegistryItem} item
   */
  register(item: ControllerRegistryItem) {
    this.regisry.push(Object.assign({ moduleId: 'default' }, item));
  }

  /**
   * Finds service def by key
   * @param {string} key
   * @param {string} alias
   * @param {string} moduleId
   * @return {ControllerRegistryItem}
   */
  find(
    key: string,
    alias: ServiceAlias,
    moduleId: string = 'default'
  ): ControllerRegistryItem {
    const ref = extractRef(key, moduleId);
    return this.regisry.find(
      (r) =>
        r.alias === alias &&
        r.def.name === ref.refId &&
        r.moduleId === ref.moduleName
    );
  }
}

export type ArkUser = {
  _id: string;
  name: string;
  emailAddress: string;
  policies?: string[];
};

export type ServiceInput = {
  isAuthenticated: boolean;
  policies: Array<string>;
  user: ArkUser;
  params: any;
  query: any;
  input: any;
  body: any;
  req: Request;
  res: Response;
};

export type RuleDefinitionOptions = {
  args: ServiceInput;
  allowPolicy: (policyName: string) => boolean;
  denyPolicy: (policyName: string) => boolean;
  allow: () => void;
  deny: (msg?: string) => void;
};

export type RuleDefinition = (options: RuleDefinitionOptions) => any;

export type LogicDefinitionOptions = {
  args: ServiceInput;
  success: (meta: any, data?: any | Array<any>) => ServiceResponse<any, any>;
  error: (err: Error | any, httpCode?: number) => ServiceResponse<any, any>;
  security: SecurityPointers;
};

export type LogicDefinition = (
  options: LogicDefinitionOptions
) => ServiceResponse<any, any> | Promise<ServiceResponse<any, any>>;

export type CapabilityMeta = {
  serviceName: string;
  rel: string;
  opts?: HypermediaLinkCreationOption;
};

export type HypermediaLink = {
  href: string;
  rel: string;
  method: HttpVerbs;
  input?: any;
};

export type HypermediaLinkCreationOption = {
  path?: string;
  method?: HttpVerbs;
  input?: {
    [key: string]: any;
  };
};

export type CapabilitiesDefinitionOptions = {
  result: ServiceResponse<any, any>;
  args: ServiceInput;
  attachLinks: (
    item: object | Array<object>,
    metaCreator: CapabilityMeta[] | ((item: object) => CapabilityMeta[])
  ) => void;
  createLink: (
    rel: string,
    serviceId: string,
    opts?: HypermediaLinkCreationOption
  ) => CapabilityMeta;
};

export type CapabilitiesDefinition = (
  options: CapabilitiesDefinitionOptions
) => void;

export type ServiceDefinitionOptions = {
  defineValidator: (schema: Joi.Schema) => void;
  definePre: (key: string, callback: (args: ServiceInput) => any) => void;
  defineRule: (def: RuleDefinition) => void;
  defineLogic: (def: LogicDefinition) => void;
  defineCapabilities: (def: CapabilitiesDefinition) => void;
};

export type ServiceDefinition = (options: ServiceDefinitionOptions) => void;
export type ServiceDefinitionMeta = {
  def: ServiceDefinition;
  name: string;
};

/**
 * Defines new business service
 * @param {string} name
 * @param {ServiceDefinition} def
 * @return {ServiceDefinition}
 */
export function defineService(
  name: string,
  def: ServiceDefinition
): ServiceDefinitionMeta {
  return {
    name,
    def,
  };
}

export type ServiceRunnerOptions = {
  disableValidation: boolean;
  disablePolicyExtraction: boolean;
  disablePre: boolean;
  disableRule: boolean;
  disableLogic: boolean;
  disableCapabilities: boolean;
  disableResponseFromatter: boolean;
  controller: ServiceController;
  aliasMode: ServiceAlias;
  context: ApplicationContext;
  policyExtractors: Array<PolicyExtractor>;
  moduleId: string;
};

type RunnerContext = {
  validationRunner: () => any | Promise<any>;
  preRunner: () => any | Promise<any>;
  policyExtractionAggregator: () => any | Promise<any>;
  ruleRunner: () => any | Promise<any>;
  logicRunner: () => any | Promise<any>;
  capRunner: () => any | Promise<any>;
  responseFromatter: () => void;
};

type RunnerStat = {
  result: ServiceResponse<any, any>;
  allowed: boolean;
  denied: boolean;
  denials: string[];
  isValid: boolean;
  validationErrors: Array<{ key: string; message: string }>;
  args: ServiceInput;
  response: any;
  responseCode: number;
};

/**
 * Checks required policy with received policy and returns
 * true if matches, otherwise false
 * @param {string} policyName
 * @param {Array<string>} policies
 * @return {boolean}
 */
export function shouldAllow(
  policyName: string,
  policies: Array<string>
): boolean {
  if (Array.isArray(policies)) {
    if (policies.length > 0) {
      return policies.indexOf(policyName) > -1;
    }
  }

  return false;
}

/**
 * Checks required policy with received policy and returns
 * false if matches, otherwise true
 * @param {string} policyName
 * @param {Array<string>} policies
 * @return {boolean}
 */
export function shouldDeny(
  policyName: string,
  policies: Array<string>
): boolean {
  if (Array.isArray(policies)) {
    if (policies.length > 0) {
      return policies.indexOf(policyName) > -1;
    }
  }

  return false;
}

/**
 * Resolves and attaches link to object
 * @param {object} item
 * @param {CapabilityMeta[]|function} metaCreator
 * @param {ServiceInput} args
 * @param {ServiceRunnerOptions} opts
 * @return {Promise<boolean>}
 */
export async function resolveLink(
  item: object,
  metaCreator: CapabilityMeta[] | ((item: object) => CapabilityMeta[]),
  args: ServiceInput,
  opts: ServiceRunnerOptions
): Promise<boolean> {
  const generatedLinks: Array<HypermediaLink> = [];
  let linkMetas: CapabilityMeta[] = [];
  if (typeof metaCreator === 'function') {
    linkMetas = metaCreator(item);
  } else if (Array.isArray(metaCreator)) {
    linkMetas = metaCreator;
  }
  let i = 0;
  for (i = 0; i < linkMetas.length; i++) {
    const targetDef = opts.controller.find(
      linkMetas[i].serviceName,
      opts.aliasMode,
      opts.moduleId
    );

    let vInput: any = {};
    try {
      vInput = linkMetas[i].opts.input;
    } catch (e) {
      // Do nothing
    }

    const output = await runService(
      targetDef.def,
      {
        input: vInput,
        isAuthenticated: args.isAuthenticated,
        policies: args.policies,
        user: args.user,
      },
      Object.assign<ServiceRunnerOptions, Partial<ServiceRunnerOptions>>(opts, {
        disableLogic: true,
        disableCapabilities: true,
      })
    );
    if (output.allowed === true) {
      const item: HypermediaLink = {
        rel: linkMetas[i].rel,
        href: targetDef.path,
        method: targetDef.method,
      };

      // Override
      if (linkMetas[i].opts) {
        // Override path
        if (linkMetas[i].opts.path && linkMetas[i].opts.path !== '') {
          item.href = linkMetas[i].opts.path;
        }
        // custom method
        if (linkMetas[i].opts.method) {
          item.method = linkMetas[i].opts.method;
        }
      }

      try {
        if (linkMetas[i].opts && linkMetas[i].opts.input) {
          item.href = pathToRegexp.compile(targetDef.path, {
            encode: encodeURIComponent,
          })(linkMetas[i].opts.input);
        }
      } catch (e) {
        // Do nothing
      }

      if (opts.aliasMode === 'service') {
        try {
          item.input = linkMetas[i].opts.input;
        } catch (e) {
          // Do nothing
        }
      }
      generatedLinks.push(item);
    }
  }

  // Attach the links
  (item as any).links = generatedLinks;

  return true;
}

const getServiceErrorCode = (code: number, stat?: RunnerStat) => {
  let _code = code;
  try {
    if (stat) {
      _code =
        typeof stat.result.errCode === 'number' ? stat.result.errCode : _code;
    }
  } catch (e) {
    /** Do nothing */
  }
  return _code;
};

const getServiceErrorMessage = (message: string, stat?: RunnerStat) => {
  let _message = message;
  try {
    if (stat) {
      if (typeof stat.result.err === 'object') {
        if (typeof stat.result.err.message === 'string') {
          _message = stat.result.err.message;
        }
      } else if (typeof stat.result.err === 'string') {
        _message = stat.result.err;
      }
    }
  } catch (e) {
    /** Do nothing */
  }
  return _message;
};

/**
 * Run business service
 * @param {ServiceDefinitionMeta} service
 * @param {ServiceInput} args_
 * @param {ServiceRunnerOptions} opts_
 * @return {Promise<Result>}
 */
export function runService(
  service: ServiceDefinitionMeta,
  args_?: Partial<ServiceInput>,
  opts_?: Partial<ServiceRunnerOptions>
): Promise<RunnerStat> {
  const args = Object.assign<ServiceInput, Partial<ServiceInput>>(
    {
      isAuthenticated: false,
      policies: [],
      params: {},
      user: null,
      query: {},
      input: {},
      body: {},
      req: null,
      res: null,
    },
    args_ || {}
  );

  const opts = Object.assign<
    ServiceRunnerOptions,
    Partial<ServiceRunnerOptions>
  >(
    {
      disableValidation: false,
      disablePolicyExtraction: false,
      disablePre: false,
      disableRule: false,
      disableLogic: false,
      disableCapabilities: false,
      disableResponseFromatter: false,
      controller: ServiceController.getInstance(),
      aliasMode: 'rest',
      context: ApplicationContext.getInstance(),
      policyExtractors: [],
      moduleId: 'default',
    },
    opts_ || {}
  );

  return new Promise<RunnerStat>((resolve, reject) => {
    const ctx: RunnerContext = {
      validationRunner: null,
      policyExtractionAggregator: async () => {
        let extractedPolicies: string[] = [];
        let i: number = 0;
        for (i = 0; i < opts.policyExtractors.length; i++) {
          extractedPolicies = await Promise.resolve(
            opts.policyExtractors[i](args)
          );
          if (
            Array.isArray(extractedPolicies) &&
            extractedPolicies.length > 0
          ) {
            args.policies.push(...extractedPolicies);
          }
        }
      },
      preRunner: null,
      ruleRunner: null,
      logicRunner: null,
      capRunner: null,
      responseFromatter: () => {
        if (stat) {
          if (stat.isValid === true) {
            if (stat.allowed === true) {
              if (stat.result && stat.result.type === 'success') {
                stat.responseCode = getServiceErrorCode(200, stat);
                stat.response = stat.result;
              } else {
                // Error
                let message: string = 'Unknown error';
                try {
                  if (stat.result.err.message) {
                    message = stat.result.err.message;
                  }
                } catch (e) {
                  /** Do nothing */
                }
                stat.responseCode = getServiceErrorCode(500, stat);
                stat.response = {
                  message: getServiceErrorMessage(message, stat),
                };
              }
            } else {
              // Not allowed
              if (stat.args.isAuthenticated === true) {
                // Forbidden
                stat.responseCode = getServiceErrorCode(403, stat);
                stat.response = {
                  message: getServiceErrorMessage('Access forbidden', stat),
                };
              } else {
                // Unauthorized
                stat.responseCode = getServiceErrorCode(401, stat);
                stat.response = {
                  message: getServiceErrorMessage(
                    'Your request is unauthorized',
                    stat
                  ),
                };
              }
            }
          } else {
            // Invalid
            let message: string = 'Your request is not valid';
            try {
              message = stat.validationErrors[0].message;
            } catch (e) {
              /** Do nothing */
            }
            stat.responseCode = getServiceErrorCode(400, stat);
            stat.response = {
              message: getServiceErrorMessage(message),
              validationErrors: stat.validationErrors,
            };
          }
        } else {
          // Pass thru if response is falsy
        }
      },
    };

    const stat: RunnerStat = {
      result: null,
      allowed: true,
      denied: false,
      denials: [],
      isValid: true,
      validationErrors: [],
      args: args as any,
      response: null,
      responseCode: 200,
    };

    const allow = () => (stat.allowed = true);
    const deny = (msg?: string) => {
      stat.denied = true;
      if (msg) {
        stat.denials.push(msg);
      }
    };

    const isRuleSatisfied = () =>
      stat.allowed === true && stat.denied === false;

    const _init = () =>
      Promise.resolve(
        service.def({
          defineValidator: (schema) =>
            (ctx.validationRunner = () => {
              stat.isValid = false;
              try {
                Joi.assert(args.input, schema, {
                  abortEarly: false,
                });
                stat.isValid = true;
              } catch (e) {
                try {
                  stat.validationErrors = e.details.map((d: any) => ({
                    key: d.path[0],
                    message: d.message,
                  }));
                } catch (e) {
                  // Do nothing
                }
              }
            }),
          definePre: (key: string, callback: (args: ServiceInput) => any) =>
            (ctx.preRunner = async () => {
              if (!args.input) {
                args.input = {};
              }

              if (!args.input[key]) {
                try {
                  args.input[key] = await Promise.resolve(
                    callback(args as any)
                  );
                } catch (e) {
                  throw e;
                }
              }
            }),
          defineRule: (def) =>
            (ctx.ruleRunner = () => {
              stat.allowed = false;
              if (stat.isValid === true) {
                return def({
                  args: args as ServiceInput,
                  allowPolicy: (policyName: string) => {
                    if (shouldAllow(policyName, args.policies)) {
                      allow();
                      return true;
                    } else {
                      // deny(`Missing required policy to execute this action. Required policy: '${policyName}'`);
                    }
                    return false;
                  },
                  denyPolicy: (policyName: string) => {
                    if (shouldDeny(policyName, args.policies)) {
                      deny(
                        `This action is forbidden due to policy '${policyName}'`
                      );
                      return true;
                    }
                    return false;
                  },
                  allow,
                  deny,
                });
              } else {
                return Promise.resolve(false);
              }
            }),
          defineLogic: (def) =>
            (ctx.logicRunner = () => {
              if (stat.isValid === false) {
                stat.result = {
                  type: 'error',
                  err: 'Validation error',
                  errCode: 400,
                };
                return Promise.resolve(stat.result);
              }

              if (isRuleSatisfied() === true) {
                return Promise.resolve(
                  def({
                    args: args as any,
                    success: (meta, data) => ({
                      type: 'success',
                      meta,
                      data,
                    }),
                    error: (err, errCode = 500) => ({
                      type: 'error',
                      errCode,
                      err,
                    }),
                    // eslint-disable-next-line new-cap
                    security: Security('default', null, opts.context),
                  })
                ).then((response) => {
                  stat.result = response;
                  return stat.result;
                });
              } else {
                if (args.isAuthenticated === true) {
                  stat.result = {
                    type: 'error',
                    err: 'Access forbidden',
                    errCode: 403,
                  };
                } else {
                  stat.result = {
                    type: 'error',
                    err: 'Permission denied',
                    errCode: 401,
                  };
                }
                return Promise.resolve(stat.result);
              }
            }),
          defineCapabilities: (def) =>
            (ctx.capRunner = async () => {
              if (stat.result) {
                if (stat.result.type !== 'success') {
                  return false;
                }
              }

              const attachmentRegistry: Array<{
                item: object | Array<object>;
                metaCreator:
                  | CapabilityMeta[]
                  | ((item: object) => CapabilityMeta[]);
              }> = [];

              await Promise.resolve(
                def({
                  args: args as any,
                  result: stat.result,
                  createLink: (rel, serviceId, opts) => ({
                    rel,
                    serviceName: serviceId,
                    opts,
                  }),
                  attachLinks: (item, metaCreator) => {
                    attachmentRegistry.push({
                      item,
                      metaCreator,
                    });
                  },
                })
              );

              let i: number = 0;
              for (i = 0; i < attachmentRegistry.length; i++) {
                const item = attachmentRegistry[i].item;
                const metaCreator = attachmentRegistry[i].metaCreator;
                let success = false;
                if (Array.isArray(item)) {
                  let j = 0;
                  for (j = 0; j < item.length; j++) {
                    success = await resolveLink(
                      item[j],
                      metaCreator,
                      args as any,
                      opts
                    );
                    if (success === false)
                      throw new Error('Hypermedia link resolution failed');
                  }
                } else {
                  success = await resolveLink(
                    item,
                    metaCreator,
                    args as any,
                    opts
                  );
                }
                if (success === false)
                  throw new Error('Hypermedia link resolution failed');
              }
            }),
        })
      );

    [
      ['disableValidation', 'validationRunner'],
      ['disablePre', 'preRunner'],
      ['disablePolicyExtraction', 'policyExtractionAggregator'],
      ['disableRule', 'ruleRunner'],
      ['disableLogic', 'logicRunner'],
      ['disableCapabilities', 'capRunner'],
      ['disableResponseFromatter', 'responseFromatter'],
    ]
      .reduce(
        (actor, config) => {
          return actor.then((v: any) => {
            if (config.length > 2 || config.length < 1)
              throw new Error('System failure, code: INVALID_RUNNER_CONF');
            let shouldRun: boolean = config.length === 1;
            if (config.length === 2) {
              // @ts-ignore
              shouldRun = !opts[config[0]];
            }

            if (shouldRun === true) {
              // @ts-ignore
              const action = ctx[config.length === 2 ? config[1] : config[0]];
              if (action) {
                return Promise.resolve(action());
              }
            }
            return Promise.resolve(v || false);
          });
        },
        _init().then((v) => {
          if (!ctx.logicRunner) {
            return reject(
              new Error(
                `You likely forgot to define logic for service ${service.name}`
              )
            );
          }

          return v;
        })
      )
      .then(() => {
        resolve(stat);
      })
      .catch((err) => {
        stat.result = {
          type: 'error',
          errCode: 500,
          err,
        };
        if (!opts.disableResponseFromatter) {
          ctx.responseFromatter();
        }
        resolve(stat);
      });
  });
}

type JwtService = {
  sign: (
    payload: string | object | Buffer,
    secret?: jwt.Secret,
    opts?: jwt.SignOptions
  ) => string;
  verify: (
    token: string,
    secret?: jwt.Secret,
    opts?: jwt.VerifyOptions
  ) => string | object | Buffer;
  decode: (
    token: string,
    opts?: jwt.DecodeOptions
  ) => string | { [key: string]: any };
};

type PolicyExtractor = (
  args: ServiceInput
) => Array<string> | Promise<Array<string>>;

type SecurityPointers = {
  jwt: JwtService;
  enableAuth: (opts: AuthOptions) => void;
  definePolicyExtractor: (refId: string, extractor: PolicyExtractor) => void;
};

export const Security = createPointer<SecurityPointers>(
  (moduleId, controller, context) => ({
    definePolicyExtractor: (refId, extractor) => {
      context.put(moduleId, refId, extractor, false, 'policy_extractor');
    },
    enableAuth: (opts) => {
      context.setData('default', 'authOpts', opts);
      // Attach middleware
      const app = context.getData<expressApp.Application>('default', 'express');
      if (!app) {
        throw new Error(
          'Backend has not been initialized, use(Backend) before use(Security)'
        );
      }
      app.use(createAuthMiddleware(opts));
    },
    jwt: {
      decode: (token, opts?) => {
        const authOpts = context.getData<AuthOptions>('default', 'authOpts');
        let decodeOptions = opts;

        try {
          if (authOpts) {
            decodeOptions = Object.assign(
              authOpts.jwtDecodeOptions || {},
              opts || {}
            );
          }
        } catch (e) {
          /** Do nothing */
        }

        return jwt.decode(token, decodeOptions);
      },
      verify: (token, secret?, opts?) => {
        const authOpts = context.getData<AuthOptions>('default', 'authOpts');
        let key = secret;
        let verifyOptions = opts;

        try {
          if (authOpts) {
            verifyOptions = Object.assign(
              authOpts.jwtVerifyOptions || {},
              opts || {}
            );
            if (!secret) {
              key = authOpts.jwtSecretKey;
            }
          }
        } catch (e) {
          /** Do nothing */
        }

        if (!key) {
          throw new Error(
            'secret key must be provided or can be configured globally using enableAuth'
          );
        }

        return jwt.verify(token, key, verifyOptions);
      },
      sign: (payload, secret?, _signOpts?: jwt.SignOptions) => {
        const authOpts = context.getData<AuthOptions>('default', 'authOpts');
        let key = secret;
        let signOptions = _signOpts;

        try {
          if (authOpts) {
            signOptions = Object.assign(
              authOpts.jwtSignOptions || {},
              _signOpts || {}
            );
            if (!secret) {
              key = authOpts.jwtSecretKey;
            }
          }
        } catch (e) {
          /** Do nothing */
        }

        if (!key) {
          throw new Error(
            'secret key must be provided or can be configured globally using enableAuth'
          );
        }

        return jwt.sign(payload, key, signOptions);
      },
    },
  })
);
