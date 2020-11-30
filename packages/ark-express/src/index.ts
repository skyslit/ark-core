import {createPointer} from '@skyslit/ark-package';
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

type HttpVerbs = 'all' | 'get' | 'post' |
    'put' | 'delete' | 'patch' | 'options' | 'head';

declare global {
    // eslint-disable-next-line no-unused-vars
    namespace Ark {
        // eslint-disable-next-line no-unused-vars
        interface Express {
            useServer: () => void,
            useApp: () => expressApp.Application,
            useRoute: (method: HttpVerbs, path: string,
                handlers: expressApp.RequestHandler |
                    Array<expressApp.RequestHandler>) => expressApp.Application,
        }
        // eslint-disable-next-line no-unused-vars
        interface Data {
            connectDatabase: (
                name: string,
                connectionString: string,
                opts?: ConnectionOptions
            ) => void,
            useModel: <T>(
                name: string,
                schema?: SchemaDefinition | (() => Schema)
            ) => Model<T & Document>
        }
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
  connectDatabase: (
      name: string,
      connectionString: string,
      opts?: ConnectionOptions
  ) => {
    controller.ensureInitializing(
        'connectDatabase() should be called on context root'
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
        console.log('Database connected');
        resolve();
      });

      connection.on('error', (err) => {
        console.error(err);
        reject(err);
      });
    }));
  },
  useModel: <T>(name: string,
    schema?: SchemaDefinition | (() => Schema)) => {
    const modelName = getModelName(moduleId, name);
    let registeredModel: Model<T & Document> = null;

    const modelRegistrationKey: string = `models/${moduleId}`;
    const modelExist = context.existData(moduleId, modelRegistrationKey);
    const mongooseConnection: Connection =
        context.getData('default', `db/default`, null);

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

export const Express = createPointer<Partial<Ark.Express>>((
    moduleId, controller, context
) => ({
  init: () => {
    if (!context.existData(moduleId, 'express')) {
      context.setData(moduleId, 'express', expressApp());
    }
  },
  useServer: () => {
    console.log(moduleId);
  },
  useApp: () => context.getData(moduleId, 'express'),
  useRoute: (method, path, handlers) => {
    return context.getData<expressApp.Application>(
        moduleId, 'express'
    )[method](path, handlers);
  },
}));
