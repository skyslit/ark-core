import React from 'react';
import {Job, Automator} from '@skyslit/ark-devtools';
import {EventEmitter} from 'events';
// eslint-disable-next-line max-len
import {IAutomatorInterface, Prompt, PromptAnswerActivator} from '@skyslit/ark-devtools/build/automation/core/Automator';

/**
 * Automation controller instance
 */
class AutomationController extends EventEmitter implements IAutomatorInterface {
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
   * Prompt Handler
   * @param {Prompt} prompt
   * @param {Function} sendAnswer
   */
  onNewPrompt(prompt: Prompt, sendAnswer: PromptAnswerActivator) {

  };

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
          this.emit('job-state-changed', false);
        })
        .catch((err) => {
          this.emit('job-state-changed', false);
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
      'prompt',
    ];
  }
}

export const useAutomator = () => {
  // const controller = AutomationController.getInstance();
  const [controller] = React.useState(new AutomationController());
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
    run: controller.runProcess.bind(controller),
    reset: controller.reset.bind(controller),
  };
};
