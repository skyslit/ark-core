export type Activator = () => any | Promise<any>;
export type ContextScope<T> = (props: Partial<Ark.Pointers>) => T | Promise<T>;
export type PointerCreator<T> = (
  id: string, controller: ControllerContext<any>) => T;

interface BasePointers {
    use: <T extends (...args: any) => any>
        (creators: T) => ReturnType<T>
    useModule: (id: string, fn: ContextScope<void>) => void
    invoke: <T>(fn: ContextScope<T>,
        inputMap?: object, outputMap?: (v: T) => any) => Promise<T | any>,
    getInput: <T>(id: string, defaultVal?: T) => T,
    setOutput: <T>(id: string, val: T) => T,
    getData: <T>(id: string, defaultVal?: T) => T,
    setData: <T>(id: string, val: T) => T,
    run: (fn: Activator) => void,
    runOn: (moduleId: string, fn: ContextScope<void>) => void
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
  activator: Activator
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
  private queue: Sequel;
  /**
   * Creates new instance of controller context
   * @param {any=} inputData Input Data
   * @param {any=} defaultData Default Data
   */
  constructor(inputData: any = {}) {
    this.inputData = inputData;
    this.outputData = {};
    this.queue = new Sequel();
  }

  /**
   * Run business logic in self container
   * @param {Activator} activator Function Activator
   * @return {{}}
   */
  run(activator: Activator) {
    return this.queue.push({activator});
  }

  /**
   * Execute controller
   * @param {string} moduleId
   * @param {ControllerScope<T>} fn
   * @param {Partial<Ark.Pointers>} pointers
   * @return {Promise<T>}
   */
  execute(
      moduleId: string,
      fn: ContextScope<T>,
      pointers: Partial<Ark.Pointers>
  ): Promise<T> {
    const controllerPointerCreator:PointerCreator<Partial<BasePointers>> =
      () => ({
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
        run: this.run.bind(this),
        runOn: (moduleId, activator) => {
          this.queue.push({
            activator: () => {
              Promise.resolve(
                  activator(
                      Object.assign(pointers,
                          controllerPointerCreator(moduleId, this))));
            },
          });
        },
      });
    return Promise.resolve(
        fn(Object.assign(pointers, controllerPointerCreator(moduleId, this)))
    ).then(
        () => this.queue.start()
    ).then(
        () => Promise.resolve(this.outputData)
    );
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

    /**
     * Creates a new instance of Application Context
     */
    constructor() {
      this.data = {};
      this.pointers = [];

      this.registerPointer<Partial<BasePointers>>((moduleId, controller) => ({
        use: <T extends (...args: any) => any>(creators: T): ReturnType<T> => {
          return creators(moduleId);
        },
        useModule: (id: string, fn: ContextScope<void>) => {
          controller.run(() => this.activate(fn, id));
        },
        invoke: <T>(fn: ContextScope<T>,
          inputMap: object,
          outputMap: (v: T) => any = (v) => v): Promise<T> => this.invoke(
            moduleId,
            fn,
            inputMap,
            outputMap
        ),
        getData: (id, def) => {
          let result: any = def;
          if (this.data[id]) {
            result = this.data[id];
          }
          return result;
        },
        setData: (id, v) => {
          this.data[id] = v;
          return v;
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
     * Start running the application
     * @param {ContextScope<void>} fn
     * @param {string=} moduleId Module ID to point
     * @return {Promise<void>}
     */
    activate(
        fn: ContextScope<void>, moduleId: string = 'default'): Promise<void> {
      return this.invoke(moduleId, fn, undefined);
    }

    /**
     * This function generates pointer to the specified module
     * @param {string} id Module ID
     * @param {ControllerContext<any>} controller
     * @return {Ark.Pointers} Module Pointers
     */
    private generatePointer(
        id: string, controller: ControllerContext<any>
    ): Partial<Ark.Pointers> {
      return this.pointers.reduce((acc, p) =>
        ({...acc, ...p(id, controller)}), {});
    }

    /**
     * Invokes / Activates a context / controller function
     * @param {string} modId
     * @param {ContextScope<T>} fn
     * @param {object} inputMap
     * @param {object | function} outputMap
     * @return {Promise<T>}
     */
    private invoke<T>(modId: string, fn: ContextScope<T>,
        inputMap: object,
        outputMap: (v: T) => any = (v) => v): Promise<T> {
      const controller = new ControllerContext<T>(inputMap);
      return controller.execute(
          modId, fn, this.generatePointer(modId, controller)
      ).then((v) => Promise.resolve(outputMap(v)));
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
 * Creates new logic context that can be used
 * @param {ContextScope} fn Logic Scope
 * @return {ContextScope}
 */
export function createContext<T = any>(fn: ContextScope<T>): ContextScope<T> {
  return fn;
}

/**
 * Creates an isolated scope for new business logic
 * @param {ControllerScope<T>} fn Controller Function
 * @return {ControllerScope<T>}
 */
export function createController<T = any>(
    fn: ContextScope<T>
): ContextScope<T> {
  return fn;
}
