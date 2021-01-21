import React from 'react';
import ReactDOMServer from 'react-dom/server';
import path from 'path';
import fs from 'fs';
import {
  ApplicationContext,
  ContextScope,
  createPointer,
} from '@skyslit/ark-core';
import expressApp from 'express';
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
import { initReactRouterApp } from '@skyslit/ark-frontend';
import { Route, StaticRouter, Switch } from 'react-router-dom';
import * as HTMLParser from 'node-html-parser';

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

type ServiceDef = {
  serviceId: string;
  handler: expressApp.RequestHandler;
};

type WebAppRenderer = {
  render: (initialState?: any) => expressApp.RequestHandler;
};

declare global {
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
      useService: (def: ServiceDef) => void;
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

/**
 * Creates Web App Server-Side Render
 * @param {ContextScope<any>} scope
 * @param {string} htmlFileName
 * @return {WebAppRenderer}
 */
function createWebAppRenderer(
  scope: ContextScope<any>,
  htmlFileName: string
): WebAppRenderer {
  return {
    render: (initialState) => {
      return (req, res, next) => {
        const webAppContext = new ApplicationContext();
        initReactRouterApp(scope, webAppContext)
          .then((PureAppConfig) => {
            const htmlContent = readHtmlFile(htmlFileName);
            const htmlContentNode = HTMLParser.parse(htmlContent);

            const appStr = ReactDOMServer.renderToString(
              <StaticRouter>
                <Switch>
                  {PureAppConfig.map((route) => (
                    <Route key={route.path} {...route} />
                  ))}
                </Switch>
              </StaticRouter>
            );

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

export const Backend = createPointer<Partial<Ark.Backend>>(
  (moduleId, controller, context) => ({
    init: () => {
      if (!context.existData('default', 'express')) {
        const instance = context.setData('default', 'express', expressApp());
        instance.use(
          '/_browser',
          expressApp.static(path.join(__dirname, '../_browser'))
        );
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
    useService: (def: ServiceDef) => {
      context
        .getData<expressApp.Application>('default', 'express')
        .post(`/___service/${moduleId}/${def.serviceId}`, def.handler);
    },
    useWebApp: (appId, ctx, htmlFileName) => {
      if (!htmlFileName) {
        htmlFileName = `${appId}.html`;
      }

      if (!htmlFileName.toLowerCase().endsWith('.html')) {
        htmlFileName = `${htmlFileName}.html`;
      }

      // const jsPath = `${path.basename(htmlFileName)}.js`;

      return context.useDataFromContext(
        moduleId,
        appId,
        ctx ? createWebAppRenderer(ctx, htmlFileName) : undefined,
        false,
        'pwa'
      );
    },
  })
);

// ------------------ SERVICE BEGIN ------------------

export type ArkUser = {
  _id: string;
  name: string;
  emailAddress: string;
};

export type ServiceInput = {
  isAuthenticated: boolean;
  policies: Array<string>;
  user: ArkUser;
  params: any;
  query: any;
  input: any;
  body: any;
};

export type Capabilities = {
  serviceId: string;
  params?: any;
};

export type ServiceResponseData<T = {}> = T & {
  capabilities: Array<Capabilities>;
};

export type ServiceResponse<M, D> = {
  type: 'success' | 'error';
  meta?: M;
  data?: Array<D>;
  capabilities?: Array<Capabilities>;
  errCode?: number;
  err?: Error | any;
  [key: string]: any;
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
};

export type LogicDefinition = (
  options: LogicDefinitionOptions
) => ServiceResponse<any, any> | Promise<ServiceResponse<any, any>>;

export type ServiceDefinitionOptions = {
  defineValidator: (schema: Joi.Schema) => void;
  definePre: (key: string, callback: (args: ServiceInput) => any) => void;
  defineRule: (def: RuleDefinition) => void;
  defineLogic: (def: LogicDefinition) => void;
  defineCapabilities: () => void;
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
  disablePre: boolean;
  disableRule: boolean;
  disableLogic: boolean;
  disableCapabilities: boolean;
};

type RunnerContext = {
  validationRunner: () => any | Promise<any>;
  preRunner: () => any | Promise<any>;
  ruleRunner: () => any | Promise<any>;
  logicRunner: () => any | Promise<any>;
  capRunner: () => any | Promise<any>;
};

type RunnerStat = {
  result: ServiceResponse<any, any>;
  allowed: boolean;
  denied: boolean;
  denials: string[];
  isValid: boolean;
  validationErrors: Array<{ key: string; message: string }>;
  args: ServiceInput;
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
 * Run business service
 * @param {ServiceDefinitionMeta} service
 * @param {ServiceInput} args
 * @param {ServiceRunnerOptions} opts
 * @return {Promise<Result>}
 */
export function runService(
  service: ServiceDefinitionMeta,
  args?: Partial<ServiceInput>,
  opts?: Partial<ServiceRunnerOptions>
): Promise<RunnerStat> {
  args = Object.assign<ServiceInput, Partial<ServiceInput>>(
    {
      isAuthenticated: false,
      policies: [],
      params: {},
      user: null,
      query: {},
      input: {},
      body: {},
    },
    args || {}
  );

  opts = Object.assign<ServiceRunnerOptions, Partial<ServiceRunnerOptions>>(
    {
      disableValidation: false,
      disablePre: false,
      disableRule: false,
      disableLogic: false,
      disableCapabilities: false,
    },
    opts || {}
  );

  return new Promise<RunnerStat>((resolve, reject) => {
    const ctx: RunnerContext = {
      validationRunner: null,
      preRunner: null,
      ruleRunner: null,
      logicRunner: null,
      capRunner: null,
    };

    const stat: RunnerStat = {
      result: null,
      allowed: true,
      denied: false,
      denials: [],
      isValid: true,
      validationErrors: [],
      args: args as any,
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
                  })
                ).then((response) => {
                  stat.result = response;
                  return stat.result;
                });
              } else {
                stat.result = {
                  type: 'error',
                  err: 'Permission denied',
                  errCode: 401,
                };
                return Promise.resolve(stat.result);
              }
            }),
          defineCapabilities: () => {},
        })
      );

    [
      ['disableValidation', 'validationRunner'],
      ['disablePre', 'preRunner'],
      ['disableRule', 'ruleRunner'],
      ['disableLogic', 'logicRunner'],
      ['disableCapabilities', 'capRunner'],
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
        resolve(stat);
      });
  });
}
