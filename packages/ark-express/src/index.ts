import { Ark } from 'ark-package';
import Express from 'express';
import http from 'http';
import https from 'https';

const { usePackage } = Ark;

export namespace ArkExpress {
    const _ = usePackage();

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
        }
    }

    export function useServer(opts?: http.ServerOptions) {
        const server = _.setData('http', http.createServer(opts, AppContainer.createApp().app));
        server.on('listening', () => console.log(`HTTP Server is listening`));
        return server;
    }

    export function setPort(port: number) {
        return _.setData('port', port);
    }

    export function setHTTPSPort(port: number) {
        return _.setData('port', port);
    }

    export function useSecureServer(opts?: https.ServerOptions) {
        const server = _.setData('https', https.createServer(opts, AppContainer.createApp().app));
        server.on('listening', () => console.log(`HTTPS Server is listening`));
        return server;
    }
}