declare global {
    namespace Ark {
        // These open interfaces may be extended in an application-specific manner via declaration merging.
        interface Package {}
        interface DefaultModule {}
        interface Modules {
            default: DefaultModule
        }
        interface GlobalServices {}
        interface GlobalServiceProps {
            moduleId: string
        }
        interface ControllerProps<I, O> {
            getInput: <T extends I, K extends keyof T>(id: K, defaultVal?: T[K]) => T[K],
            setOutput: <T extends O, K extends keyof T>(id: K, val: T[K]) => void,
            app: Ark.Package
            useGlobalService: <T extends Ark.GlobalServices, K extends keyof T>(id: K) => T[K]
        }
    }
}

interface BaseModules {
    [key: string]: any
}

export type PackageOpts = {
    app: PackageContext
};

type ActivatorFunc = (opts?: PackageOpts) => void | Promise<any>;

const DEFAULT_CURSOR: 'default' = 'default';

type SequelStarterOpt<T> = {
    resolver: (q: T) => any
    before?: () => any
    beforeEach?: (q: T) => any
    afterEach?: (q: T) => any
    after?: () => any
}

export class Sequel<Q = {
    name?: string
    activator: () => any | Promise<any>
}> {
    static DefaultResolver = (item: any) => item.activator();

    private _q: Array<Q> = [];
    public push(t: Q): Q {
        this._q.push(t);
        return t;
    }

    public start(opts?: Partial<SequelStarterOpt<Q>>) {
        opts = Object.assign<SequelStarterOpt<Q>, Partial<SequelStarterOpt<Q>>>({
            resolver: Sequel.DefaultResolver
        }, opts);

        if (!this._q || !Array.isArray(this._q)) {
            return Promise.resolve();
        }

        return (() => {
            const outerP = this._q.reduce((p, q) => {
                return p.then(() => {
                    if (opts.beforeEach && typeof opts.beforeEach === 'function') {
                        return p.then(() => opts.beforeEach(q));
                    }

                    return p;
                })
                .then(() => opts.resolver(q))
                .then(() => {
                    if (opts.afterEach && typeof opts.afterEach === 'function') {
                        return p.then(() => opts.afterEach(q));
                    }

                    return p;
                });
            }, (() => {
                const p = Promise.resolve();
                if (opts.before && typeof opts.before === 'function') {
                    p.then(() => opts.before());
                }
    
                return p;
            })());

            if (opts.after && typeof opts.after === 'function') {
                outerP.then(() => opts.after());
            }

            return outerP;
        })();
    }
}

export class PackageContext implements Ark.Package {
    static instance: PackageContext;

    static getInstance(): PackageContext & Ark.Package {
        if (!PackageContext.instance) {
            PackageContext.instance = new PackageContext();
        }
        return PackageContext.instance;
    }

    private _sequel: Sequel = new Sequel();
    private _cursor: string = DEFAULT_CURSOR;
    private _data: BaseModules & Partial<Ark.Modules> = {
        [DEFAULT_CURSOR]: {}
    };
    private _globalServices: any = {};
    public _hasPackageInitialized: boolean = false;
    public _isInitializing: boolean = false;

    getCursor = () => this._cursor;
    getData = <T = any>(key: string, defaultVal?: T): T => {
        let result: any = null;
        if (this._data[this._cursor][key]) {
            result = this._data[this._cursor][key];
        } else {
            this._data[this._cursor][key] = defaultVal;
        }
        return this._data[this._cursor][key];
    }
    
    getModule = <T extends Ark.Modules, K extends keyof T>(id?: K): T[K] => {
        id = (id ? id : DEFAULT_CURSOR) as any;
        return this._data[(id as any)];
    }

    setCursor = (c: string) => {
        this._cursor = c ? c : DEFAULT_CURSOR;
        if (!this._data[this._cursor]) {
            this._data[this._cursor] = {};
        }
    };
    setData = <T>(key: string, val: T): T => {
        if (!this._data[this._cursor]) {
            throw new Error('Invalid cursor position');
        }
        this._data[this._cursor][key] = val ? val : DEFAULT_CURSOR;
        return val;
    }

    registerRunner = (name: string, activator: () => any | Promise<any>) => {
        const exe = {
            name,
            activator
        }
        this._sequel.push(exe);
        return exe;
    }

    run = (activator: () => any | Promise<any>) => {
        this.registerRunner(this.getCursor(), activator);
    }

    // Global Services Start

    private getGlobalServiceProps = (moduleId: string): Ark.GlobalServiceProps => ({
        moduleId
    });
    
    registerGlobalService = <T extends Ark.GlobalServices, K extends keyof T>(id: K, svc: (props: Ark.GlobalServiceProps) => T[K]): T[K] => {
        if (this._globalServices[(id as any)]) {
            throw new Error(`Service with same id already exists, id: ${id}`);
        }

        this._globalServices[(id as any)] = svc;
        return this._globalServices[(id as any)];
    }

    extendGlobalService = <T extends Ark.GlobalServices, K extends keyof T>(id: K, svcExtender: (svc: Partial<T[K]>) => (props: Ark.GlobalServiceProps) => T[K]): T[K] => {
        if (!this._globalServices[(id as any)]) {
            throw new Error(`No service registered with the ID, id: ${id}`);
        }

        this._globalServices[(id as any)] = svcExtender(this._globalServices[(id as any)](this.getGlobalServiceProps(_.getCursor())));
        return this._globalServices[(id as any)];
    }

    useGlobalService = <T extends Ark.GlobalServices, K extends keyof T>(id: K, moduleId?: string): T[K] => {
        if (!this._globalServices[(id as any)]) {
            throw new Error(`No service registered with the ID, id: ${id}`);
        }

        return this._globalServices[(id as any)](this.getGlobalServiceProps(moduleId || _.getCursor()));
    }

    // Global Services End
    __getQ = () => this._sequel;
}

export function usePackage(): PackageContext & Ark.Package {
    return PackageContext.getInstance();
}

function getActivatorOptions(): PackageOpts {
    return {
        app: _
    }
}

export const _ = usePackage();

export async function createPackage(func: ActivatorFunc, skipActivation?: boolean) {
    skipActivation = skipActivation ? skipActivation : false;
    if (_._hasPackageInitialized === true) {
        throw new Error('createPackage(...) can only be used once across a project');
    }

    _._isInitializing = true;
    await Promise.resolve(func.call(_, getActivatorOptions()));
    _._isInitializing = false;

    await _.__getQ().start({
        beforeEach: (exe) => {
            _.setCursor(exe.name);
        },
        afterEach: () => {
            _.setCursor(null);
        }
    })

    _._hasPackageInitialized = true;
}

export function createModule(func: ActivatorFunc) {
    return func;
}

export function useModule(id: string, func: ActivatorFunc) {
    if (_._isInitializing === false) {
        throw new Error(`useModule(...) can only be used within a package activator`);
    }

    if (_.getModule(id as any) !== undefined) {
        throw new Error(`Duplicate registration of module ID: '${id}'`);
    }

    _.setCursor(id);
    func && func(getActivatorOptions());
    _.setCursor(null);
}

export function run(activator: ActivatorFunc) {
    _.run(() => activator(getActivatorOptions()));
}

export function init(activator: ActivatorFunc) {
    return run(activator);
}

export function main(activator: ActivatorFunc) {
    return run(activator);
}

// Service

type ControllerActivatorFunc<I, O> = (props: Ark.ControllerProps<I, O>) => void;
type ControllerIOBase = {
    [key: string]: any
} 

class ControllerContext<I extends ControllerIOBase, O extends ControllerIOBase> {
    activator: ControllerActivatorFunc<I, O>;
    input: Partial<I> = {};
    output: Partial<O> = {};

    constructor(fn: ControllerActivatorFunc<I, O>, args?: Partial<I>) {
        this.activator = fn;
        this.input = args || {};
    }

    getInput = <T extends I, K extends keyof T>(id: K, defaultVal?: T[K]): T[K] => {
        // @ts-ignore
        return this.input[id] || defaultVal;
    }

    setOuput = <T extends O, K extends keyof T>(id: K, val: T[K]) => {
        // @ts-ignore
        this.input[id] = val;
    }

    getOutput = <T extends O, K extends keyof T>(id: K, defaultVal?: T[K]): T[K] => {
        // @ts-ignore
        return this.input[id] || defaultVal;
    }

    setInput = <T extends I, K extends keyof T>(id: K, val: T[K]) => {
        // @ts-ignore
        this.input[id] = val;
    }

    getControllerProps = (moduleId: string): Ark.ControllerProps<I, O> => {
        return {
            getInput: this.getInput,
            setOutput: this.setOuput,
            app: _,
            useGlobalService: (id) => _.useGlobalService(id, moduleId)
        };
    }
}


export function createController<I, O>(controllerFn: ControllerActivatorFunc<I, O>): ControllerActivatorFunc<I, O> {
    return controllerFn;
}

export function useController() {
    // TODO: Throw error when used after initialisation
    const moduleId = _.getCursor();

    const invoke = <I, O>(fn: ControllerActivatorFunc<I, O>, args?: Partial<I>) => {
        const context = new ControllerContext<I, O>(fn, args);
        return Promise.resolve(context.activator(context.getControllerProps(moduleId))).then(() => Promise.resolve(context));
    }

    return {
        invoke
    }
}
