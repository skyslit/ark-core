/* eslint-disable max-len */
import path from 'path';
import execa from 'execa';

export type JobEvents = 'init' | 'started' | 'progress-update' | 'ended';

export type PromptAnswerActivator = (answer?: any) => void;
export interface IAutomatorInterface {
  onNewPrompt: (prompt: Prompt, answer: PromptAnswerActivator) => void;
  onSnapshot?: (
    events: JobEvents,
    snapshot: JobSnapshot,
    frameIndex: number
  ) => void;
}

/**
 * TestMonitor can be used to define preset inputs for integration testing
 */
export class TestMonitor implements IAutomatorInterface {
  testInput: {
    [key: string]: any;
  };

  /**
   * TestMonitor Constructor
   * @param {object} testInput
   */
  constructor(
    testInput: {
      [key: string]: any;
    } = {}
  ) {
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

type ItemMeta = {
  service?: any;
  title?: string;
  description?: string;
};

type WorkerStatus =
  | 'waiting'
  | 'in-progress'
  | 'completed'
  | 'error'
  | 'skipped';

type QueueItem = {
  id: number;
  activator?: (...args: any[]) => Generator;
  service?: any;
  title?: string;
  description?: string;
  status: WorkerStatus;
  errors: Error[];
};

type StepSnapshot = {
  title: string;
  description: string;
  status: WorkerStatus;
};

type AutomationSnapshot = {
  title: string;
  description: string;
  steps: StepSnapshot[];
  totalSteps: number;
  status: WorkerStatus;

  pendingSteps: number;
  successfulSteps: number;
  failedSteps: number;
  skippedSteps: number;
};

type JobSnapshot = {
  automations: AutomationSnapshot[];

  pendingAutomations: number;
  successfulAutomations: number;
  failedAutomations: number;
  skippedAutomations: number;

  pendingSteps: number;
  successfulSteps: number;
  failedSteps: number;
  skippedSteps: number;

  totalAutomations: number;
  totalSteps: number;
};

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

const STEP_ACTION = 'STEP';
const GENERATOR_ACTION = 'GENERATOR';
const PROMPT_ACTION = 'PROMPT';

type ActionType = {
  __type__: string;
  payload: {
    [key: string]: any;
  };
};

/**
 * Creates automation base action
 * @param {string} type
 * @param {object} payload
 * @return {ActionType}
 */
function createAction(
  type: string,
  payload: {
    [key: string]: any;
  }
): ActionType {
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
  key: string;
  question: string;
  type: 'text-input';
  options?: [];
  answer?: () => void;
};

/**
 * Manages automation and prompts
 */
export class Automator {
  public steps: Array<QueueItem>;
  public isRunning: boolean;
  public currentRunningTaskIndex: number;
  public cwd: string;
  public job: Job;
  public title: string;
  public description: string;
  public status: WorkerStatus;

  /**
   * Creates new instance of automator
   * @param {string=} title
   * @param {string=} description
   */
  constructor(title?: string, description?: string) {
    this.steps = [];
    this.isRunning = false;
    this.currentRunningTaskIndex = -1;
    this.job = null;
    this.title = title;
    this.description = description;
    this.status = 'waiting';
  }

  /**
   * Runs on cli
   * @param {string} file File to execute
   * @param {string[]=} args Command argument
   * @param {execa.Options<string>=} options (Optional)
   * @return {execa.ExecaChildProcess<string>}
   */
  async runOnCli(
    file: string,
    args?: readonly string[],
    options?: execa.Options<string>
  ) {
    return await execa(
      file,
      args,
      Object.assign<execa.Options<string>, execa.Options<string>>(
        {
          cwd: this.cwd,
        },
        options
      )
    );
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
   * @deprecated
   * Use Activity
   * @param {Function} runner
   */
  run(runner: () => Generator<any, any, any>) {
    this.step(runner);
  }

  /**
   * Use Step
   * @param {Function} runner
   * @param {Partial<ItemMeta>=} meta
   */
  step(runner: () => Generator<any, any, any>, meta?: Partial<ItemMeta>) {
    this.steps.push(
      Object.assign<QueueItem, Partial<ItemMeta>>(
        {
          id: id.next().value,
          activator: runner,
          description: '',
          service: '',
          title: '',
          status: 'waiting',
          errors: [],
        },
        meta || {}
      )
    );
  }

  /**
   * Set data to job context
   * @param {string} key
   * @param {T} val
   * @return {T}
   */
  setData<T>(key: string, val: T): T {
    this.ensureContext();
    this.job.context[key] = val;
    return val;
  }

  /**
   * Get data from job context
   * @param {string} key
   * @param {T=} def
   * @return {T}
   */
  getData<T>(key: string, def?: T): T {
    this.ensureContext();
    if (this.job.context[key] === undefined) {
      return def;
    }

    return this.job.context[key];
  }

  /**
   * Starts the job
   * @param {Job=} job
   * @param {string=} cwd
   * @return {Promise}
   */
  start(job: Job = new Job()) {
    this.job = job;
    job.automations.push(this);
    return job.start();
  }

  /**
   * Ensures that the job is started and running
   */
  private ensureContext() {
    if (!this.job) {
      throw new Error('Job context is not defined. May be it is not started?');
    }
  }
}

/**
 * Manages processes and its lifecycle
 */
export class Job {
  private monitor: IAutomatorInterface;
  private currentRunningTaskIndex: number = -1;
  public automations: Array<Automator>;
  public isRunning: boolean;
  public cwd: string;
  public context: any;
  private frameCount: number;
  public errors: Error[];
  public shouldSuppressError: boolean;

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
    this.context = {};
    this.frameCount = 0;
    this.errors = [];
    this.shouldSuppressError = true;
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
      automations: [],

      pendingAutomations: 0,
      successfulAutomations: 0,
      failedAutomations: 0,
      skippedAutomations: 0,

      pendingSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,

      totalAutomations: 0,
      totalSteps: 0,
    };

    snapshot.automations = this.automations.map<AutomationSnapshot>((item) => {
      const stepSnapshots = item.steps.map<StepSnapshot>((stepItem) => ({
        title: stepItem.title,
        description: stepItem.description,
        status: stepItem.status,
      }));

      const metaInfo: Partial<AutomationSnapshot> = stepSnapshots.reduce<
        Partial<AutomationSnapshot>
      >(
        (acc, item) => {
          switch (item.status) {
            case 'waiting': {
              acc.pendingSteps++;
              break;
            }
            case 'completed': {
              acc.successfulSteps++;
              break;
            }
            case 'error': {
              acc.failedSteps++;
              break;
            }
            case 'skipped': {
              acc.skippedSteps++;
              break;
            }
          }
          return acc;
        },
        {
          pendingSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
        }
      );

      return Object.assign<AutomationSnapshot, Partial<AutomationSnapshot>>(
        {
          title: item.title,
          description: item.description,
          steps: stepSnapshots,
          totalSteps: stepSnapshots.length,
          status: item.status,

          pendingSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
        },
        metaInfo
      );
    });

    const automatorMeta = snapshot.automations.reduce<Partial<JobSnapshot>>(
      (acc, item) => {
        switch (item.status) {
          case 'in-progress':
          case 'waiting': {
            acc.pendingAutomations++;
            break;
          }
          case 'completed': {
            acc.successfulAutomations++;
            break;
          }
          case 'error': {
            acc.failedAutomations++;
            break;
          }
          case 'skipped': {
            acc.skippedAutomations++;
            break;
          }
        }

        const stepMeta = item.steps.reduce<Partial<JobSnapshot>>(
          (acc, item) => {
            switch (item.status) {
              case 'in-progress':
              case 'waiting': {
                acc.pendingSteps++;
                break;
              }
              case 'completed': {
                acc.successfulSteps++;
                break;
              }
              case 'error': {
                acc.failedSteps++;
                break;
              }
              case 'skipped': {
                acc.skippedSteps++;
                break;
              }
            }
            return acc;
          },
          acc
        );

        acc.totalSteps += item.totalSteps;

        return Object.assign(acc, stepMeta);
      },
      {
        pendingAutomations: 0,
        successfulAutomations: 0,
        failedAutomations: 0,
        skippedAutomations: 0,

        pendingSteps: 0,
        successfulSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,

        totalAutomations: snapshot.automations.length,
        totalSteps: snapshot.totalSteps,
      }
    );

    return Object.assign<JobSnapshot, Partial<JobSnapshot>>(
      snapshot,
      automatorMeta
    );
  }

  /**
   * Gets user input
   * @param {Prompt} prompt
   * @return {Promise}
   */
  getPromptResponse(prompt: Prompt) {
    if (!this.monitor) {
      throw new Error(
        'Prompts cannot be handled because no monitor is attached to the Job'
      );
    }
    return new Promise((resolve, reject) => {
      this.monitor.onNewPrompt(prompt, (answer = null) => resolve(answer));
    });
  }

  /**
   * Creates automator
   * @param {Automator} automator
   */
  queueAutomator(automator: Automator) {
    automator.job = this;
    this.automations.push(automator);
  }

  /**
   * Returns if the job has error
   * @return {boolean}
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
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
          } else if (typeof result.value === 'function') {
            const fnResult = await Promise.resolve(result.value());
            // Check if generator function
            if (fnResult && typeof fnResult.next === 'function') {
              await runGenerator(fnResult, depth + 1);
            } else {
              answer = fnResult;
            }
          } else if (typeof result.value === 'object') {
            // Check if generator object
            if (isActionType(result.value)) {
              switch (result.value.__type__) {
                case STEP_ACTION:
                case GENERATOR_ACTION: {
                  const isStep = result.value.__type__ === STEP_ACTION;

                  let errorHandler: (e: Error) => void = null;
                  if (isStep === true) {
                    const stepRef = this.automations[
                      this.currentRunningTaskIndex
                    ].steps[
                      this.automations[this.currentRunningTaskIndex]
                        .currentRunningTaskIndex
                    ];

                    const skipStep = () => {
                      if (stepRef) {
                        stepRef.status = 'skipped';
                        this.emitSnapshot('progress-update');
                      }
                    };

                    errorHandler = (e: Error) => {
                      if (stepRef) {
                        stepRef.status = 'error';
                        stepRef.errors.push(e);
                      }
                      this.emitSnapshot('progress-update');
                    };

                    if (this.hasErrors()) {
                      skipStep();
                      break;
                    }
                  }

                  try {
                    await runGenerator(<any>result.value.payload, depth + 1);
                  } catch (e) {
                    errorHandler && errorHandler(e);
                    throw e;
                  }
                  break;
                }
                case PROMPT_ACTION: {
                  answer = await this.getPromptResponse(
                    <any>result.value.payload
                  );
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
          this.errors.push(e);
          if (this.shouldSuppressError === false) {
            throw e;
          }
        }
        result = generator.next(answer);
      }
    };

    return new Promise((resolve, reject) => {
      const runner = this.runNext();
      runGenerator(runner)
        .then(() => resolve(null))
        .catch(reject);
    });
  }

  /**
   * Emits snapshot on progress update
   * @param {JobEvents} event
   */
  private emitSnapshot(event: JobEvents) {
    this.frameCount++;
    if (this.monitor) {
      if (this.monitor.onSnapshot) {
        this.monitor.onSnapshot(event, this.getSnapshot(), this.frameCount);
      }
    }
  }

  /**
   * Job Runner function
   * @return {boolean}
   */
  private *runNext() {
    const job = this;
    job.isRunning = true;
    this.emitSnapshot('init');
    while (job.isRunning === true) {
      job.currentRunningTaskIndex++;
      const automation = job.automations[job.currentRunningTaskIndex];
      if (automation) {
        automation.cwd = this.cwd;
        yield function* () {
          // Step runner
          automation.isRunning = true;
          automation.status = 'in-progress';
          job.emitSnapshot('progress-update');
          while (automation.isRunning === true) {
            automation.currentRunningTaskIndex++;
            const step = automation.steps[automation.currentRunningTaskIndex];
            if (step) {
              step.status = 'in-progress';
              job.emitSnapshot('progress-update');
              // Call the actual step
              yield createAction(STEP_ACTION, step.activator(step.service));
              if (step.status === 'in-progress') {
                step.status = 'completed';
                job.emitSnapshot('progress-update');
              } else if (step.status === 'error') {
                automation.status = 'error';
                job.emitSnapshot('progress-update');
              }
            } else {
              automation.isRunning = false;
              if (automation.status === 'in-progress') {
                if (job.hasErrors()) {
                  automation.status = 'skipped';
                } else {
                  automation.status = 'completed';
                }
              }

              job.emitSnapshot('progress-update');
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
