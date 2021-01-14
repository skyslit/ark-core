import React, { useCallback } from 'react';
import { Job, Automator } from '@skyslit/ark-devtools';
import {
  Prompt,
  JobSnapshot,
} from '@skyslit/ark-devtools/build/automation/core/Automator';

type PromptEnvelop = {
  prompt: Prompt;
  returnAnswer: (...args: any[]) => void;
};

let job: Job;

type AutomatorOption = {
  cwd: string;
};

export const useAutomator = (opts: AutomatorOption) => {
  const [isActive, setIsActive] = React.useState(false);
  const [snapshot, updateSnapshot] = React.useState<JobSnapshot>(null);
  const [
    activePromptEnvelop,
    setActivePromptEnvelop,
  ] = React.useState<PromptEnvelop>(null);

  const run = useCallback((automationProcessCreator: () => Automator) => {
    job = new Job(
      {
        onSnapshot: (e, snapshot) => {
          updateSnapshot(snapshot);
        },
        onNewPrompt: (prompt, returnAnswer) => {
          setActivePromptEnvelop({
            prompt,
            returnAnswer,
          });
        },
      },
      opts.cwd
    );
    updateSnapshot(null);
    setIsActive(true);
    return automationProcessCreator().start(job);
  }, []);

  const returnPromptResponse = useCallback(
    (...args: any[]) => {
      if (!activePromptEnvelop) {
        return false;
      }
      activePromptEnvelop.returnAnswer(...args);
      setActivePromptEnvelop(null);
    },
    [activePromptEnvelop, setActivePromptEnvelop]
  );

  return {
    isActive,
    jobSnapshot: snapshot,
    activePrompt: activePromptEnvelop ? activePromptEnvelop.prompt : null,
    hasPrompt: activePromptEnvelop ? true : false,
    hideJobPanel: () => setIsActive(false),
    showJobPanel: () => setIsActive(true),
    returnPromptResponse,
    run,
  };
};
