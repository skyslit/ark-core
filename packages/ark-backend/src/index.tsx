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

/**
 * Defines business rule, logic
 * @param {string} serviceId
 * @param {expressApp.RequestHandler} handler
 * @return {ServiceDef}
 */
export function defineService(
  serviceId: string,
  handler: expressApp.RequestHandler
): ServiceDef {
  return {
    serviceId,
    handler,
  };
}
