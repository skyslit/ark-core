import React from 'react';
import {Job, Automator} from '@skyslit/ark-devtools';
import {EventEmitter} from 'events';

/**
 * Automation controller instance
 */
class AutomationController extends EventEmitter {
  static instance: AutomationController;
  /**
   * Singleton Instance Provider
   * @return {AutomationController}
   */
  static getInstance() {
    if (!AutomationController.instance) {
      AutomationController.instance = new AutomationController();
    }
    return AutomationController.instance;
  }

  isStarted: boolean = false;
  activeJob: Job;

  /**
   * Constructor
   */
  constructor() {
    super();
  }

  /**
   * Runs a process
   * @param {Automator} proc
   */
  runProcess(proc: Automator) {
    this.isStarted = true;
    this.activeJob = new Job();
    this.emit('job-state-changed', true);
    proc.start(this.activeJob)
        .then(() => {

        })
        .catch((err) => {
          console.error(err);
        });
  }

  /**
   * Reset state
   */
  reset() {
    this.isStarted = false;
    this.activeJob = null;
    this.emit('job-state-changed', false);
  }

  /**
   * Gets all supported eventnames
   * @return {string[]}
   */
  eventNames() {
    return [
      'job-state-changed',
    ];
  }
}

export const useAutomator = () => {
  const controller = AutomationController.getInstance();
  const [isActive, setIsActive] = React.useState(controller.isStarted);

  React.useEffect(() => {
    const newJobHandler = (isStarted: boolean) => {
      setIsActive(isStarted);
    };

    controller.on('job-state-changed', newJobHandler);

    return () => controller.off('job-state-changed', newJobHandler);
  }, []);

  return {
    isActive,
    run: controller.runProcess.bind(AutomationController.getInstance()),
    reset: controller.reset.bind(AutomationController.getInstance()),
  };
};
