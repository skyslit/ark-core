import React, { useCallback } from 'react';
import { Job, Automator } from '@skyslit/ark-devtools';
import { Prompt } from '@skyslit/ark-devtools/build/automation/core/Automator';

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
  const [
    activePromptEnvelop,
    setActivePromptEnvelop,
  ] = React.useState<PromptEnvelop>(null);

  const run = useCallback((automationProcessCreator: () => Automator) => {
    job = new Job(
      {
        onNewPrompt: (prompt, returnAnswer) => {
          setActivePromptEnvelop({
            prompt,
            returnAnswer,
          });
        },
      },
      opts.cwd
    );
    setIsActive(true);
    automationProcessCreator()
      .start(job)
      .then(() => {
        setIsActive(false);
      })
      .catch((err) => {
        console.error(err);
        setIsActive(false);
      });
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
    activePrompt: activePromptEnvelop ? activePromptEnvelop.prompt : null,
    hasPrompt: activePromptEnvelop ? true : false,
    returnPromptResponse,
    run,
  };
};
