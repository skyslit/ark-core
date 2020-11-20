import { usePackage } from 'ark-package';
import Express from 'express';
import http from 'http';
import https from 'https';
import mongoose from 'mongoose';
import { Schema, SchemaDefinition, Connection, ConnectionOptions } from 'mongoose';

declare global {
    namespace Ark {
        // These open interfaces may be extended in an application-specific manner via declaration merging.
        namespace MERN {
            type DatabaseConnection = {
                opts?: ConnectionOptions,
                connection?: Connection
            }
            interface Databases {}
            type PackageDatabases = {
                default: MERN.DatabaseConnection
            } & MERN.Databases
        }
        interface Package {
            databases: MERN.PackageDatabases
        }
        interface Modules {}
        interface DefaultModule {}
    }
}

const _ = usePackage();

const DEFAULT_PORT = 3000;

type RequestType = 'get' | 'post' | 'patch' | 'put' | 'delete';
type SchemaCreator = SchemaDefinition | (() => Schema);

class AppContainer {
    static instance: AppContainer;
    static createApp() {
        if (!AppContainer.instance) {
            AppContainer.instance = new AppContainer();
        }
        return AppContainer.instance;
    }

    public app: Express.Application;

    constructor() {
        this.app = Express();
        _.setActuator('express-server-activator', () => {
            const server = _.getData<http.Server>('http');
            const port = _.getData<number>('port', DEFAULT_PORT);
            
            // Bootstrap Databases
            if (_.databases && typeof _.databases === 'object') {
                
            }

            server.listen(port);
        }, 'last');
    }

    private connectToDatabase = () => {
        new Promise((resolve, reject) => {

        });
    }
}

const _container = AppContainer.createApp();

export function useServer(opts?: http.ServerOptions) {
    const server = _.setData('http', http.createServer(opts, AppContainer.createApp().app));
    server.on('listening', () => console.log(`HTTP Server is listening`));
    return server;
}

export function createSchema(schemaCreator: SchemaCreator) {
    if (typeof schemaCreator === 'function') {
        return schemaCreator();
    }
    return new Schema(schemaCreator);
}

export function createRoute(handler: Express.RequestHandler | Array<Express.RequestHandler>) {
    return handler;
}

export function useRoute(type: RequestType, path: string, handler: Express.RequestHandler | Array<Express.RequestHandler>) {
    _container.app[type](path, handler);
}

export function useModel(name: string, schema: Schema) {
    mongoose.model(name, schema)
}

export function setPort(port: number) {
    return _.setData('port', port);
}

export function setHTTPSPort(port: number) {
    return _.setData('securePort', port);
}

export function useSecureServer(opts?: https.ServerOptions) {
    const server = _.setData('https', https.createServer(opts, AppContainer.createApp().app));
    server.on('listening', () => console.log(`HTTPS Server is listening`));
    return server;
}

// Database

export function useDatabase(name: keyof Ark.MERN.PackageDatabases, opts: ConnectionOptions) {
    if (!_.databases) {
        _.databases = {
            'default': {}
        }
    }
    _.databases[name] = {
        opts,
        connection: null
    }
}