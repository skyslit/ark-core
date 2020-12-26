/* eslint-disable max-len */
import path from 'path';

export interface IAutomatorInterface {}

type QueueItemMeta = { title: string, description: string };

type QueueItem = {
  id: number
  activator?: (...args: any[]) => Generator,
  service?: any,
  title?: string,
  description?: string,
}

type StepSnapshot = {
  title: string,
  description: string,
  state: 'waiting' | 'in-progress' | 'completed' | 'error'
}

type AutomationSnapshot = {
  title: string,
  description: string,
  steps: StepSnapshot[],
  completedSteps: number,
  totalSteps: number,
}

type JobSnapshot = {
  title: string,
  description: string,
  automations: AutomationSnapshot[],
  completedAutomations: number,
  completedSteps: number,
  totalAutomations: number,
  totalSteps: number,
}

/**
 * In-Memory ID Generator
 * @param {number=} startsWith (Default start with zero)
 */
function* generator(startsWith: number = 0): Generator<number> {
  while (true) {
    yield startsWith++;
  }
}

const id = generator();

const GENERATOR_ACTION = 'GENERATOR';
const PROMPT_ACTION = 'PROMPT';

type ActionType = {
  __type__: string,
  payload: {
    [key: string]: any,
  }
}

/**
 * Creates automation base action
 * @param {string} type
 * @param {object} payload
 * @return {ActionType}
 */
function createAction(type: string, payload: {
  [key: string]: any,
}): ActionType {
  return {
    __type__: type,
    payload,
  };
}

/**
 * Check if the provided value is of BaseActionType
 * @param {any} x
 * @return {boolean}
 */
function isActionType(x: any): x is ActionType {
  if (typeof x === 'object') {
    if (typeof x.__type__ === 'string') {
      return true;
    }
  }
  return false;
}

type Prompt = {
  question: string
  type: string
  options?: []
  answer?: () => void
}

/**
 * Manages automation and prompts
 */
export class Automator {
  private monitor: IAutomatorInterface;
  public steps: Array<QueueItem>
  public isRunning: boolean;
  public currentRunningTaskIndex: number;
  public cwd: string;

  /**
   * Creates new instance of automator
   */
  constructor() {
    this.monitor = null;
    this.steps = [];
    this.isRunning = false;
    this.currentRunningTaskIndex = -1;
  }

  /**
   * Gets fully qualified path from cwd
   * @param {string} _path
   * @return {string}
   */
  getPath(_path: string) {
    return path.join(this.cwd, _path);
  }

  /**
   * Prompt for user input
   * @param {Prompt} opts
   * @return {any}
   */
  prompt(opts: Prompt) {
    return createAction(PROMPT_ACTION, opts);
  }

  /**
   * Use Activity
   * @param {any} activity
   * @param {Partial<QueueItemMeta>=} opts
   */
  run(activity: QueueItem, opts?: Partial<QueueItemMeta>) {
    opts = Object.assign<QueueItemMeta, Partial<QueueItemMeta>>({
      title: undefined,
      description: undefined,
    }, opts || {});
    this.steps.push(Object.assign(activity, {title: '', description: ''}));
  }

  /**
   * Attaches UI to the process
   * @param {IAutomatorInterface} monitor
   */
  attachInterface(monitor: IAutomatorInterface) {
    this.monitor = monitor;
  }

  /**
   * Starts the job
   * @param {Job=} job
   * @return {Promise}
   */
  start(job: Job = new Job()) {
    job.automations.push(this);
    return job.start();
  }
}

/**
 * Manages processes and its lifecycle
 */
export class Job {
  public automations: Array<Automator>
  public isRunning: boolean;
  public cwd: string;

  /**
   * Creates a new instance of job
   * @param {string=} cwd
   */
  constructor(cwd?: string) {
    this.cwd = cwd;
    this.automations = [];
    this.isRunning = false;
  }

  /**
   * Gets JSON snapshot of status
   * @return {JobSnapshot}
   */
  getSnapshot(): JobSnapshot {
    const snapshot: JobSnapshot = {
      title: '',
      description: '',
      automations: [],
      completedAutomations: 0,
      completedSteps: 0,
      totalAutomations: 0,
      totalSteps: 0,
    };

    return snapshot;
  }

  /**
   * Starts the job
   * @return {Promise}
   */
  start() {
    const runGenerator = async (generator: Generator, depth: number = 1) => {
      let result = generator.next();
      while (result.done !== true) {
        try {
          if (result.value instanceof Promise) {
            await result.value;
          } else if (typeof(result.value) === 'function') {
            // Check if generator function
            if (result.value.constructor.name === 'GeneratorFunction') {
              const innerGenerator = result.value();
              await runGenerator(innerGenerator, depth + 1);
            } else {
              await Promise.resolve(result.value());
            }
          } else if (typeof(result.value) === 'object') {
            // Check if generator object
            if (isActionType(result.value)) {
              switch (result.value.__type__) {
                case GENERATOR_ACTION: {
                  await runGenerator(<any>result.value.payload, depth + 1);
                  break;
                }
                case PROMPT_ACTION: {
                  break;
                }
                default: {
                  console.log(result.value.__type__);
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
        result = generator.next();
      }
    };

    return new Promise((resolve, reject) => {
      const runner = this.runNext();
      runGenerator(runner).then(() => resolve(null)).catch(reject);
    });
  }

  private currentRunningTaskIndex: number = -1;
  /**
   * Job Runner function
   * @return {boolean}
   */
  * runNext() {
    const job = this;
    job.isRunning = true;
    while (job.isRunning === true) {
      job.currentRunningTaskIndex++;
      if (job.automations[job.currentRunningTaskIndex]) {
        yield function* () {
          // Step runner
          job.automations[job.currentRunningTaskIndex].isRunning = true;
          while (job.automations[job.currentRunningTaskIndex].isRunning === true) {
            job.automations[job.currentRunningTaskIndex].currentRunningTaskIndex++;
            const step = job.automations[job.currentRunningTaskIndex].steps[job.automations[job.currentRunningTaskIndex].currentRunningTaskIndex];
            if (step) {
              // Call the actual step
              yield createAction(GENERATOR_ACTION, step.activator(step.service));
            } else {
              job.automations[job.currentRunningTaskIndex].isRunning = false;
              break;
            }
          }
          return true;
        };
      } else {
        job.isRunning = false;
        break;
      }
    }
    return true;
  }
}

type ServiceDef<T> = (gn: (services: T) => Generator) => QueueItem;

/**
 * Create new service
 * @param {any} serviceCreator
 * @return {any}
 */
export function createService<T>(serviceCreator: () => T): ServiceDef<T> {
  return (
      gn: (services: T) => Generator
  ) => ({
    id: id.next().value,
    activator: gn,
    service: serviceCreator(),
  });
}

/**
 * Creates new process
 * @param {Function} fn
 * @return {Automator}
 */
export function createProcess(fn: (automator: Automator) => void): Automator {
  const proc = new Automator();
  fn(proc);
  return proc;
}
