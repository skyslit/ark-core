declare global {
    namespace Ark {
        // These open interfaces may be extended in an application-specific manner via declaration merging.
        interface Package {}
        interface DefaultModule {}
        interface Modules {
            default: DefaultModule
        }
    }
}

interface BaseModules {
    [key: string]: any
}

export type PackageOpts = {
    app: PackageContext
};

type PackageFunc = (this: PackageContext, opts?: PackageOpts) => void | Promise<any>;
type ModuleFunc = (this: PackageContext, opts?: PackageOpts) => void | Promise<any>;
type Activator = () => void;
type ActivatorAppendOperator = 'last' | 'first' | 'before' | 'after';

type Actuator = {
    cursor: string,
    activator: Activator
}

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

    private _cursor: string = DEFAULT_CURSOR;
    private _data: BaseModules & Partial<Ark.Modules> = {
        [DEFAULT_CURSOR]: {}
    };
    private _actuators: Actuator[] = [];
    private _hasActivated: boolean = false;
    public _hasPackageInitialized: boolean = false;
    public _isInitializing: boolean = false;

    getCursor = () => this._cursor;
    getData = <T = any>(key: string, defaultVal?: T): T => {
        let result: any = defaultVal;
        if (this._data[this._cursor][key]) {
            result = this._data[this._cursor][key];
        }
        return result;
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

    setActuator = (className: string, func: Activator, op?: ActivatorAppendOperator, opClass?: string) => {
        op = op ? op : 'last';
        opClass = opClass ? opClass : null;
        const _draftActivator: Actuator = {
            activator: func,
            cursor: className
        }

        switch (op) {
            case 'before': {
                const indexOfFirstOccurence = this._actuators.findIndex((a) => a.cursor === opClass);
                if (indexOfFirstOccurence > -1) {
                    this._actuators.splice(indexOfFirstOccurence, 0, _draftActivator);
                    break;
                }
            }
            case 'first': {
                this._actuators.unshift(_draftActivator);
                break;
            }
            case 'after': {
                let indexOfLastOccurence = this._actuators.slice().reverse().findIndex((a) => a.cursor === opClass);
                indexOfLastOccurence = indexOfLastOccurence >= 0 ? this._actuators.length - indexOfLastOccurence : indexOfLastOccurence
                if (indexOfLastOccurence > -1) {
                    this._actuators.splice(indexOfLastOccurence, 0, _draftActivator);
                    break;
                }
                break;
            }
            case 'last': {
                this._actuators.push(_draftActivator);
                break;
            }
        }
    }

    getActuators = () => this._actuators;

    activate = async () => {
        if (this._hasActivated === true) {
            throw new Error('Package already activated');
        }
        return await Promise.all(this._actuators.map((o) => o.activator()));
    }
}

export function usePackage(): PackageContext & Ark.Package {
    return PackageContext.getInstance();
}

export const _ = usePackage();

export async function activate() {
    await _.activate();
}

export async function createPackage(func: PackageFunc, skipActivation?: boolean) {
    skipActivation = skipActivation ? skipActivation : false;
    if (_._hasPackageInitialized === true) {
        throw new Error('createPackage(...) can only be used once across a project');
    }

    _._isInitializing = true;
    await Promise.resolve(func.call(_, { app: _ }));
    _._isInitializing = false;
    _._hasPackageInitialized = true;
    if (skipActivation === false) {
        await _.activate();
    }
}

export function createModule(func: ModuleFunc) {
    return func;
}

export async function useModule(id: string, func: ModuleFunc) {
    if (_._isInitializing === false) {
        throw new Error(`useModule(...) can only be used within a package activator`);
    }

    if (_.getModule(id as any) !== undefined) {
        throw new Error(`Duplicate registration of module ID: '${id}'`);
    }

    _.setCursor(id);
    await Promise.resolve(func.call(_, { app: _ }));
    _.setCursor(null);
}