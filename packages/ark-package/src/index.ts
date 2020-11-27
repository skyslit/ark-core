export type ContextScope<T> = (props: Partial<Ark.Pointers>) => T | Promise<T>;
export type ControllerProps = {
  getInput: <T>(id: string, defaultVal: T) => T,
  setOutput: <T>(id: string, val: T) => T
}
export type ControllerScope<T> =
  (props: Partial<Ark.Pointers & ControllerProps>) => T | Promise<T>;
export type PointerCreator<T> = (id: string) => T;

interface BasePointers {
    use: <T extends (...args: any) => any>
        (creators: T) => ReturnType<T>
    invoke: <T>(fn: ControllerScope<T>,
        inputMap: object, outputMap: T) => Promise<T>
}

declare global {
    // eslint-disable-next-line no-unused-vars
    namespace Ark {
        // eslint-disable-next-line no-unused-vars
        interface Pointers extends BasePointers {}
    }
}

type SequelStarterOpt<T> = {
  resolver: (q: T) => any
  before?: () => any
  beforeEach?: (q: T) => any
  afterEach?: (q: T) => any
  after?: () => any
}

/**
 * Sequel enables sequential execution of business logic
 * @override
 */
export class Sequel<Q = {
  name?: string
  activator: () => any | Promise<any>
}> {
  static DefaultResolver = (item: any) => item.activator();

  private _q: Array<Q> = [];

  /**
   * Push new task / step to the queue
   * @param {Q} t Task / step to add
   * @return {Q} Task / step added
   */
  public push(t: Q): Q {
    this._q.push(t);
    return t;
  }

  /**
   * (Async) Run the added task / step in sequential manner
   * @param {Partial<SequelStarterOpt<Q>>} opts Runner Options
   * @return {Promise} Promise
   */
  public start(opts?: Partial<SequelStarterOpt<Q>>): Promise<any> {
    opts = Object.assign<SequelStarterOpt<Q>, Partial<SequelStarterOpt<Q>>>({
      resolver: Sequel.DefaultResolver,
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

/**
 * Isolated scope where controllers live and run
 */
class ControllerContext<T> {
  private inputData: any;
  private outputData: any;
  /**
   * Creates new instance of controller context
   * @param {string} moduleId Module ID
   * @param {ControllerScope<T>} fn Controller Function
   * @param {Partial<Ark.Pointers>} pointers Context Pointer
   */
  constructor(
      moduleId: string,
      fn: ControllerScope<T>,
      pointers: Partial<Ark.Pointers>) {
    this.inputData = {};
    this.outputData = {};
    const controllerPointerCreator:PointerCreator<ControllerProps> =
      (moduleId) => ({
        getInput: (id, def) => {
          let result: any = def;
          if (this.inputData[id]) {
            result = this.inputData[id];
          }
          return result;
        },
        setOutput: (id, v) => {
          this.outputData[id] = v;
          return v;
        },
      });
    fn(Object.assign(pointers, controllerPointerCreator(moduleId)));
  }
}

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
    private pointers: Array<PointerCreator<any>>;
    private queue: Sequel;

    /**
     * Creates a new instance of Application Context
     */
    constructor() {
      this.data = {};
      this.pointers = [];
      this.queue = new Sequel();

      this.registerPointer<BasePointers>((moduleId) => ({
        use: <T extends (...args: any) => any>(creators: T): ReturnType<T> => {
          return creators(moduleId);
        },
        invoke: <T>(fn: ContextScope<T>,
          inputMap: object, outputMap: T): Promise<T> => {
          return new Promise(() => {
            // eslint-disable-next-line no-unused-vars
            const controller = new ControllerContext<T>(
                moduleId, fn, this.generatePointer(moduleId));
          });
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
     * @param {PointerCreator} creator Func that creates module pointers
     */
    registerPointer<T>(creator: PointerCreator<T>) {
      this.pointers.push(creator);
    }

    /**
     * runOn generate activator function with pointer to the appropriate data
     * @param {string} id Module ID
     * @param {ContextScope} fn
     */
    runOn(id: string, fn: ContextScope<void>) {
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
 * @param {PointerCreator<T>} activatorFn Creator function
 * @return {PointerCreator<T>} Returns creator
 */
export function createPointer<T>(
    activatorFn: PointerCreator<T>
): PointerCreator<T> {
  return activatorFn;
}

/**
 * Run code in it's own module isolation
 * @param {string} id Module ID
 * @param {ContextScope} fn Runner function
 */
export function runOn(id: string, fn: ContextScope<void>) {
  ApplicationContext.getInstance().runOn(id, fn);
}

/**
 * Creates new logic context that can be used
 * @param {ContextScope} fn Logic Scope
 * @return {ContextScope}
 */
export function createContext<T = any>(fn: ContextScope<T>): ContextScope<T> {
  return fn;
}
