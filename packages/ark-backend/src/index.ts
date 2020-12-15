import {ContextScope, createPointer} from '@skyslit/ark-core';
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

type HttpVerbs = 'all' | 'get' | 'post' |
    'put' | 'delete' | 'patch' | 'options' | 'head';

type ServerOpts = {
    port: number,
    hostname: string,
    backlog?: number,
    listeningListener?: () => void
}

declare global {
    // eslint-disable-next-line no-unused-vars
    namespace Ark {
      // eslint-disable-next-line no-unused-vars
      interface Backend {
        useServer: (opts?: ServerOpts) => void,
        useApp: () => expressApp.Application,
        useRoute: (method: HttpVerbs, path: string,
          handlers: expressApp.RequestHandler |
            Array<expressApp.RequestHandler>) =>
          expressApp.Application,
        useWebApp: (
          appId: string,
          ctx?: ContextScope<any>,
        ) => {
          render: (initialState?: any) => void,
        },
      }
      // eslint-disable-next-line no-unused-vars
      interface Data {
        useDatabase: (
          name: keyof Ark.PackageDatabases,
          connectionString: string,
          opts?: ConnectionOptions
        ) => void,
        useModel: <T>(
          name: string,
          schema?: SchemaDefinition | (() => Schema),
          dbName?: keyof Ark.PackageDatabases
        ) => Model<T & Document>
      }
      // eslint-disable-next-line no-unused-vars
      interface Databases { }
      // eslint-disable-next-line no-unused-vars
      type PackageDatabases = {
        default: Connection
      } & Databases
    }
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

export const Data = createPointer<Partial<Ark.Data>>((
    moduleId, controller, context
) => ({
  useDatabase: (
      name: keyof Ark.PackageDatabases,
      connectionString: string,
      opts?: ConnectionOptions
  ) => {
    controller.ensureInitializing(
        'useDatabase() should be called on context root'
    );
    controller.run(() => new Promise((resolve, reject) => {
      const dbId: string = `db/${name}`;
      const databaseConnectionExist = context.existData(moduleId, dbId);
      if (databaseConnectionExist) {
        reject(new Error(`Db connection with same id ${dbId} already exists`));
        return;
      }

      const connection = createConnection(
          connectionString, Object.assign<
            ConnectionOptions, ConnectionOptions>({
              useNewUrlParser: true,
              useUnifiedTopology: true,
            }, opts));

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
    }));
  },
  useModel: <T>(name: string,
    schema?: SchemaDefinition | (() => Schema),
    dbName: keyof Ark.PackageDatabases = 'default') => {
    const modelName = getModelName(moduleId, name);
    let registeredModel: Model<T & Document> = null;

    const modelRegistrationKey: string = `models/${moduleId}`;
    const modelExist = context.existData(moduleId, modelRegistrationKey);
    const mongooseConnection: Connection =
        context.getData('default', `db/${dbName}`, null);

    if (schema) {
      // TODO: Check if already registered
      if (modelExist === true) {
        throw new Error(
            `Model '${name}' already exist on module '${moduleId}'`
        );
      }
      if (typeof schema === 'function') {
        registeredModel = mongooseConnection
            .model<T & Document>(modelName, schema());
      } else {
        registeredModel = mongooseConnection
            .model<T & Document>(modelName, new Schema(schema));
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
}));

export const Backend = createPointer<Partial<Ark.Backend>>((
    moduleId, controller, context
) => ({
  init: () => {
    if (!context.existData(moduleId, 'express')) {
      context.setData(moduleId, 'express', expressApp());
    }
  },
  useServer: (opts) => {
    opts = opts ? opts : {
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
              context.getData<expressApp.Application>(moduleId, 'express')
          )
      );
      controller.run(() => {
        httpServer.listen(
            opts.port, opts.hostname, opts.backlog, opts.listeningListener
        );
      });
      context.pushRollbackAction(() => {
        httpServer.close();
      });
    }
  },
  useApp: () => context.getData(moduleId, 'express'),
  useRoute: (method, path, handlers) => {
    return context.getData<expressApp.Application>(
        moduleId, 'express'
    )[method](path, handlers);
  },
}));
