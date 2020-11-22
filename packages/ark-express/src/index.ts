import { run, usePackage } from 'ark-package';
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
            interface IQueryBuilder {
                where: () => IQueryBuilder,
                sort: () => IQueryBuilder,
                limit: (number: number) => IQueryBuilder,
                skip: (number: number) => IQueryBuilder,

                get: () => Promise<any>,
                insert: () => Promise<any>,
                update: () => Promise<any>,
                delete: () => Promise<any>,
            }
        }
        interface Package {
            app: Express.Application
            databases: MERN.PackageDatabases
        }
        interface DefaultModule {
            port: number
        }
    }
}

const _ = usePackage();

export class MongoAdaptor implements Ark.MERN.IQueryBuilder {
    where: () => Ark.MERN.IQueryBuilder;
    sort: () => Ark.MERN.IQueryBuilder;
    limit: (number: number) => Ark.MERN.IQueryBuilder;
    skip: (number: number) => Ark.MERN.IQueryBuilder;
    get: () => Promise<any>;
    insert: () => Promise<any>;
    update: () => Promise<any>;
    delete: () => Promise<any>;
}

// Initialize
_.app = Express();

const DEFAULT_PORT = 3000;

type RequestType = 'get' | 'post' | 'patch' | 'put' | 'delete';
type SchemaCreator = SchemaDefinition | (() => Schema);

type ServerOpts = {
    port: number,
    hostname: string,
    backlog?: number,
    listeningListener?: () => void
}

// Database

export function useDatabase(name: keyof Ark.MERN.PackageDatabases, connectionString: string, opts?: ConnectionOptions) {
    run(() => new Promise((resolve, reject) => {
        if (!_.databases) {
            _.databases = {
                'default': {}
            }
        }

        const connection = mongoose.createConnection(connectionString, Object.assign<ConnectionOptions, ConnectionOptions>({
            useNewUrlParser: true,
            useUnifiedTopology: true
        }, opts));

        _.databases[name] = {
            opts,
            connection
        }

        connection.on('open', () => {
            console.log('Database connected');
            resolve();
        });

        connection.on('error', (err) => {
            console.error(err);
            reject(err)
        });
    }));
}

// Schema

export function createSchema(schemaCreator: SchemaCreator) {
    if (typeof schemaCreator === 'function') {
        return schemaCreator();
    }
    return new Schema(schemaCreator);
}

export function useModel(name: string, schema: Schema) {
    return _.setData(`model__${name}`, mongoose.model(name, schema));
}

// Route

export function createRoute(handlers: Express.RequestHandler | Array<Express.RequestHandler>) {
    return handlers;
}

export function useRoute(type: RequestType, path: string, handlers: Express.RequestHandler | Array<Express.RequestHandler>) {
    _.app[type](path, handlers);
}

// // Service
// type ServiceOptions = {
//     useModel: <T>(name: string) => mongoose.Model<mongoose.Document & T>
// }
// type ServiceActivator<A, R> = (opts: ServiceOptions & A) => R | Promise<R>
// export function createService<A, R>(fn: ServiceActivator<A, R>) {
//     return (props: A) => fn;
// }

// Server

export function useServer({ port, hostname, backlog, listeningListener }: Partial<ServerOpts>) {
    run(() => {
        const server = http.createServer(_.app);
        server.on('listening', () => console.log(`HTTP Server is listening`));
        server.listen(port || DEFAULT_PORT, hostname, backlog, listeningListener);
    })
}