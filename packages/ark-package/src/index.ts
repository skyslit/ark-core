
interface BasePointers {
    use: <T extends (...args: any) => any>
        (creators: T) => ReturnType<T>
}

declare global {
    // eslint-disable-next-line no-unused-vars
    namespace Ark {
        // eslint-disable-next-line no-unused-vars
        interface Pointers extends BasePointers {}
    }
}

type ModuleScope = (props: Partial<Ark.Pointers>) => any;
type PointerCreators<T> = (id: string) => T;

/**
 * This class enables the transaction of Application State
 */
export class ApplicationContext {
    static instance: ApplicationContext;
    /**
     * @return {ApplicationContext} Singleton Instance of current
     * Application Context
     */
    static getInstance(): ApplicationContext {
      if (!ApplicationContext.instance) {
        ApplicationContext.instance = new ApplicationContext();
      }
      return ApplicationContext.instance;
    }

    private data: { [key: string]: any };
    private pointers: Array<PointerCreators<any>>;

    /**
     * Creates a new instance of Application Context
     */
    constructor() {
      this.data = {};
      this.pointers = [];

      this.registerPointer<BasePointers>((id) => ({
        use: <T extends (...args: any) => any>(creators: T): ReturnType<T> => {
          return creators(id);
        },
      }));
    }

    /**
     * Set state data to Application Context
     * @param {string} id Module ID
     * @param {string} _key Assignment Key
     * @param {T} value Value to set
     * @return {T} Whatever being set
     */
    setData<T>(id: string, _key: string, value: T): T {
      if (!this.data[id]) {
        this.data[id] = {};
      }

      if (!this.data[id][_key]) {
        this.data[id][_key] = value;
      }

      return value;
    }

    /**
     * Get state data from Application Context
     * @param {string} id Module ID
     * @param {string} _key Key to get value from
     * @param {T=} defaultVal - Default value to return if nothing found
     * @return {T} Value stored in module ID by the provided key / default
     * value if none matches
     */
    getData<T>(id: string, _key: string, defaultVal?: T): T {
      const result:T = defaultVal || null;

      if (this.data[id]) {
        if (this.data[id][_key]) {
          return this.data[id][_key];
        }
      }

      return result;
    }

    /**
     * Registers / extends module pointer
     * @param {PointerCreators} creator Func that creates module pointers
     */
    registerPointer<T>(creator: PointerCreators<T>) {
      this.pointers.push(creator);
    }

    /**
     * runOn generate activator function with pointer to the appropriate data
     * @param {string} id Module ID
     * @param {ModuleScope} fn
     */
    runOn(id: string, fn: ModuleScope) {
      fn && fn(this.generatePointer(id));
    }

    /**
     * This function generates pointer to the specified module
     * @param {string} id Module ID
     * @return {Ark.Pointers} Module Pointers
     */
    private generatePointer(id: string): Partial<Ark.Pointers> {
      return this.pointers.reduce((acc, p) => ({...acc, ...p(id)}), {});
    }
}

/**
 * Creates a new pointer service, which can be used to register in the context
 * @param {PointerCreators<T>} activatorFn Creator function
 * @return {PointerCreators<T>} Returns creator
 */
export function createPointer<T>(
    activatorFn: PointerCreators<T>
): PointerCreators<T> {
  return activatorFn;
}
