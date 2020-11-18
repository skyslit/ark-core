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
    class: string,
    activator: Activator
}

const DEFAULT_CURSOR: 'default' = 'default';

export class PackageContext implements Ark.Package {
    static instance: PackageContext;

    static getInstance() {
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
            class: className
        }

        switch (op) {
            case 'before': {
                const indexOfFirstOccurence = this._actuators.findIndex((a) => a.class === opClass);
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
                let indexOfLastOccurence = this._actuators.slice().reverse().findIndex((a) => a.class === opClass);
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

export function usePackage() {
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