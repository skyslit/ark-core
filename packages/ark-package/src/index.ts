export namespace Ark {
    interface PackageContextType {
        [key: string]: any
    }

    type PackageOpts = {
        app: PackageContext
    };

    type PackageFunc = (this: PackageContext, opts?: PackageOpts) => void | Promise<any>;
    type ModuleFunc = (this: PackageContext, opts?: PackageOpts) => void | Promise<any>;

    type Actuator = {
        class: string,
        activator: () => void
    }

    const defaultCursor = 'default';

    class PackageContext {
        static instance: PackageContext;
    
        static getInstance() {
            if (!PackageContext.instance) {
                PackageContext.instance = new PackageContext();
            }
            return PackageContext.instance;
        }

        private _cursor: string = defaultCursor;
        private _data: PackageContextType = {};
        private _actuators: Actuator[] = [];
        public _hasPackageInitialized: boolean = false;
        public _isInitializing: boolean = false;

        getCursor = () => this._cursor;
        getData = (key: string, defaultVal: any) => {
            let result: any = defaultVal;
            if (this._data[this._cursor][key]) {
                result = this._data[this._cursor][key];
            }
            return result;
        }
        getModule = (id?: string) => {
            id = id ? id : defaultCursor;
            return this._data[id];
        }

        setCursor = (c: string) => {
            this._cursor = c ? c : defaultCursor;
            if (!this._data[this._cursor]) {
                this._data[this._cursor] = {};
            }
        };
        setData = (key: string, val: any) => {
            if (!this._data[this._cursor]) {
                throw new Error('Invalid cursor position');
            }
            this._data[this._cursor][key] = val ? val : defaultCursor;
        }
    }

    export function usePackage() {
        return PackageContext.getInstance();
    }
    
    export const _ = usePackage();

    export async function createPackage(func: PackageFunc) {
        if (_._hasPackageInitialized === true) {
            throw new Error('createPackage(...) can only be used once across a project');
        }

        _._isInitializing = true;
        await Promise.resolve(func.call(_, { app: _ }));
        _._isInitializing = false;
        _._hasPackageInitialized = true;
    }

    export function createModule(func: ModuleFunc) {
        return func;
    }

    export async function useModule(id: string, func: ModuleFunc) {
        if (_._isInitializing === false) {
            throw new Error(`useModule(...) can only be used within a package activator`);
        }

        if (_.getModule(id) !== undefined) {
            throw new Error(`Duplicate registration of module ID: '${id}'`);
        }

        _.setCursor(id);
        await Promise.resolve(func.call(_, { app: _ }));
        _.setCursor(null);
    }
}