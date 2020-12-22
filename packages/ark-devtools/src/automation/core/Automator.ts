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

/**
 * Manages automation and prompts
 */
export class Automator {
  private monitor: IAutomatorInterface;
  public queue: Array<QueueItem>
  public isRunning: boolean;

  /**
   * Creates new instance of automator
   */
  constructor() {
    this.monitor = null;
    this.queue = [];
    this.isRunning = false;
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
    this.queue.push(Object.assign(activity, {title: '', description: ''}));
  }

  /**
   * Attaches UI to the process
   * @param {IAutomatorInterface} monitor
   */
  attachInterface(monitor: IAutomatorInterface) {
    this.monitor = monitor;
  }

  /**
   * Trigger the process
   * @param {Job} ctx
   */
  async __trigger(ctx: Job) {
    this.isRunning = true;
    let runnerIndex: number = 0;
    while (this.isRunning) {
      if (runnerIndex >= this.queue.length) {
        this.isRunning = false;
      } else {
        const steps = this.queue[runnerIndex];
        const stepRunner = steps.activator(steps.service);

        let result = stepRunner.next();
        while (!result.done) {
          await Promise.resolve(result.value);
          result = stepRunner.next();
        }

        runnerIndex++;
      }
    }
  }

  /**
   * Starts the process
   * @param {Job} job
   */
  async start(job: Job = new Job()) {
    job.automations.push(this);
    await job.run();
  }
}

/**
 * Manages processes and its lifecycle
 */
export class Job {
  public automations: Array<Automator>
  public isRunning: boolean;

  /**
   * Creates a new instance of job
   */
  constructor() {
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
   * Run Job
   */
  async run() {
    this.isRunning = true;
    let runnerIndex: number = 0;
    while (this.isRunning) {
      if (runnerIndex >= this.automations.length) {
        this.isRunning = false;
      } else {
        const automator = this.automations[runnerIndex];
        await automator.__trigger(this);
        runnerIndex++;
      }
    }
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
