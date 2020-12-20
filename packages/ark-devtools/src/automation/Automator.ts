export interface IAutomatorInterface {}

type QueueItem = {
  activator?: (...args: any[]) => Generator,
  service?: any
}

/**
 * Manages automation and prompts
 */
class Automator {
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
   */
  run(activity: QueueItem) {
    this.queue.push(activity);
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

/**
 * Create new service
 * @param {any} serviceCreator
 * @return {any}
 */
export function createService<T>(serviceCreator: () => T) {
  return (
      gn: (services: T) => Generator
  ) => ({
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
