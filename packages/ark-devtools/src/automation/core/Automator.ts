/* eslint-disable max-len */
import path from 'path';
import execa from 'execa';

export type PromptAnswerActivator = (answer?: any) => void
export interface IAutomatorInterface {
  onNewPrompt: (prompt: Prompt, answer: PromptAnswerActivator) => void,
}

/**
 * TestMonitor can be used to define preset inputs for integration testing
 */
export class TestMonitor implements IAutomatorInterface {
  testInput: {
    [key: string]: any,
  }

  /**
   * TestMonitor Constructor
   * @param {object} testInput
   */
  constructor(testInput: {
    [key: string]: any,
  } = {}) {
    this.testInput = testInput;
  }

  /**
   * onNewPrompt Fn
   * @param {Prompt} prompt
   * @param {Function} answer
   */
  onNewPrompt(prompt: Prompt, answer: PromptAnswerActivator) {
    if (this.testInput[prompt.key]) {
      const answerObj = this.testInput[prompt.key];
      answer(answerObj);
    } else {
      throw new Error(`Test input has not been implemented for ${prompt.key}`);
    }
  }
}

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

export type Prompt = {
  key: string
  question: string
  type: 'text-input'
  options?: []
  answer?: () => void
}

/**
 * Manages automation and prompts
 */
export class Automator {
  public steps: Array<QueueItem>
  public isRunning: boolean;
  public currentRunningTaskIndex: number;
  public cwd: string;

  /**
   * Creates new instance of automator
   */
  constructor() {
    this.steps = [];
    this.isRunning = false;
    this.currentRunningTaskIndex = -1;
  }

  /**
   * Runs on cli
   * @param {string} file File to execute
   * @param {string[]=} args Command argument
   * @param {execa.Options<string>=} options (Optional)
   * @return {execa.ExecaChildProcess<string>}
   */
  runOnCli(file: string, args?: readonly string[], options?: execa.Options<string>): execa.ExecaChildProcess<string> {
    return execa(file, args, Object.assign<execa.Options<string>, execa.Options<string>>({
      cwd: this.cwd,
    }, options));
  }

  /**
   * Gets fully qualified path from cwd
   * @param {string} _path
   * @return {string}
   */
  resolvePath(_path: string) {
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
   * @param {Function} runner
   * @param {Partial<QueueItemMeta>=} opts
   */
  run(runner: () => Generator<any, any, any>) {
    this.steps.push({
      id: id.next().value,
      activator: runner,
      description: '',
      service: '',
      title: '',
    });
  }

  /**
   * Starts the job
   * @param {Job=} job
   * @param {string=} cwd
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
  private monitor: IAutomatorInterface;
  private currentRunningTaskIndex: number = -1;
  public automations: Array<Automator>
  public isRunning: boolean;
  public cwd: string;

  /**
   * Creates a new instance of job
   * @param {IAutomatorInterface=} monitor
   * @param {string=} cwd
   */
  constructor(monitor?: IAutomatorInterface, cwd?: string) {
    this.monitor = monitor;
    this.cwd = cwd;
    this.automations = [];
    this.isRunning = false;
  }

  /**
   * Attaches UI to the process
   * @param {IAutomatorInterface} monitor
   */
  attachInterface(monitor: IAutomatorInterface) {
    this.monitor = monitor;
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
   * Gets user input
   * @param {Prompt} prompt
   * @return {Promise}
   */
  getPromptResponse(prompt: Prompt) {
    if (!this.monitor) {
      throw new Error('Prompts cannot be handled because no monitor is attached to the Job');
    }
    return new Promise((resolve, reject) => {
      this.monitor.onNewPrompt(prompt, (answer = null) => resolve(answer));
    });
  }

  /**
   * Starts the job
   * @return {Promise}
   */
  start() {
    const runGenerator = async (generator: Generator, depth: number = 1) => {
      let result = generator.next();
      while (result.done !== true) {
        let answer: any = undefined;
        try {
          if (result.value instanceof Promise) {
            answer = await result.value;
          } else if (typeof(result.value) === 'function') {
            const fnResult = await Promise.resolve(result.value());
            // Check if generator function
            if (typeof fnResult.next === 'function') {
              const innerGenerator = result.value();
              await runGenerator(innerGenerator, depth + 1);
            } else {
              answer = fnResult;
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
                  answer = await this.getPromptResponse(<any>result.value.payload);
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
        result = generator.next(answer);
      }
    };

    return new Promise((resolve, reject) => {
      const runner = this.runNext();
      runGenerator(runner).then(() => resolve(null)).catch(reject);
    });
  }

  /**
   * Job Runner function
   * @return {boolean}
   */
  private* runNext() {
    const job = this;
    job.isRunning = true;
    while (job.isRunning === true) {
      job.currentRunningTaskIndex++;
      if (job.automations[job.currentRunningTaskIndex]) {
        job.automations[job.currentRunningTaskIndex].cwd = this.cwd;
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
