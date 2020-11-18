import { usePackage } from 'ark-package';
import Express from 'express';
import http from 'http';
import https from 'https';
import { Schema } from 'mongoose';

export module ArkExpress {
    
}

const _ = usePackage();
const DEFAULT_PORT = 3000;

type RequestType = 'get' | 'post' | 'patch' | 'put' | 'delete';
type SchemaCreator = Schema | (() => Schema);

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
            server.listen(port);
        }, 'last');
    }
}

const _container = AppContainer.createApp();

export function useServer(opts?: http.ServerOptions) {
    const server = _.setData('http', http.createServer(opts, AppContainer.createApp().app));
    server.on('listening', () => console.log(`HTTP Server is listening`));
    return server;
}

export function createModel(schemaCreator: SchemaCreator) {
    return schemaCreator;
}

export function createRoute(handler: Express.RequestHandler | Array<Express.RequestHandler>) {
    return handler;
}

export function useRoute(type: RequestType, path: string, handler: Express.RequestHandler | Array<Express.RequestHandler>) {
    _container.app[type](path, handler);
}

export function useModel(name: string, schema: any) {
    
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