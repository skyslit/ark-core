import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { JobSnapshot, WorkerStatus } from '@skyslit/ark-devtools';

type PropType = {
  hasPrompt: boolean;
  activePrompt: any;
  returnPromptResponse: any;
  snapshot: JobSnapshot;
  isManagedRuntime: boolean;
  hideJobPanel: () => void;
};

const InputForm = (props: any) => {
  const { answer, prompt } = props;
  const [query, setQuery] = useState('');

  return (
    <Box>
      <Box marginRight={1}>
        <Text>{prompt.question}</Text>
      </Box>
      <TextInput value={query} onChange={setQuery} onSubmit={answer} />
    </Box>
  );
};

type StepPropType = Partial<{
  status: WorkerStatus;
  title: string;
  children: any;
  color: string;
}>;

const Check = () => <Text color="green">✔</Text>;
const Cross = () => <Text color="red">✖</Text>;
const Waiting = () => <Text color="gray">◯</Text>;
const Skipped = () => <Text color="gray">↓</Text>;

const StepItem = (props: StepPropType) => {
  const { title, children, status, color } = props;

  let statusComponent: JSX.Element = null;
  switch (status) {
    case 'waiting': {
      statusComponent = <Waiting />;
      break;
    }
    case 'skipped': {
      statusComponent = <Skipped />;
      break;
    }
    case 'in-progress': {
      statusComponent = (
        <Text color="green">
          <Spinner type="dots" />
        </Text>
      );
      break;
    }
    case 'error': {
      statusComponent = <Cross />;
      break;
    }
    case 'completed': {
      statusComponent = <Check />;
      break;
    }
    default: {
      statusComponent = <Cross />;
      break;
    }
  }

  return (
    <>
      <Text>
        {statusComponent}
        <Text> </Text>
        <Text color={color}>{title}</Text>
      </Text>
      {children}
    </>
  );
};

const SnapshotViewer = (
  props: Partial<JobSnapshot & { isManagedRuntime: boolean }>
) => {
  const { automations, hasEnded, isManagedRuntime } = props;
  return (
    <Box flexDirection="column">
      {automations.map((automator, aIndex) => (
        <StepItem
          key={aIndex}
          title={automator.title}
          status={automator.status}
        >
          <Box flexDirection="column" marginLeft={2}>
            {automator.steps.map((step, sIndex) => {
              return (
                <Box key={`${aIndex}-${sIndex}`} flexDirection="column">
                  <StepItem
                    color="gray"
                    title={step.title}
                    status={step.status}
                  />
                  {step.errors && step.errors.length > 0 ? (
                    <Box flexDirection="column" marginLeft={3}>
                      {step.errors.map((err, eIndex) => (
                        <Text
                          color="red"
                          key={`${aIndex}-${sIndex}-e-${eIndex}`}
                        >
                          {err && err.message}
                        </Text>
                      ))}
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        </StepItem>
      ))}
      {!isManagedRuntime && hasEnded ? (
        <Text>Press esc (escape) to go back to menu</Text>
      ) : null}
    </Box>
  );
};

export default (props: PropType) => {
  const { snapshot, hideJobPanel, isManagedRuntime } = props;

  useInput(
    (input, key) => {
      if (key.escape) {
        hideJobPanel();
      }
    },
    {
      isActive:
        isManagedRuntime === false &&
        snapshot &&
        snapshot.pendingAutomations < 1,
    }
  );

  let promptComponent: JSX.Element = null;
  if (props.hasPrompt === true) {
    promptComponent = (
      <InputForm
        key={props.activePrompt.key}
        prompt={props.activePrompt}
        answer={props.returnPromptResponse}
      />
    );
  }

  let mainComponent: JSX.Element = null;
  if (snapshot) {
    mainComponent = (
      <SnapshotViewer
        automations={snapshot.automations}
        successfulAutomations={snapshot.successfulAutomations}
        totalAutomations={snapshot.totalAutomations}
        pendingAutomations={snapshot.pendingAutomations}
        failedAutomations={snapshot.failedAutomations}
        skippedAutomations={snapshot.skippedAutomations}
        totalSteps={snapshot.totalSteps}
        successfulSteps={snapshot.successfulSteps}
        pendingSteps={snapshot.pendingSteps}
        failedSteps={snapshot.failedSteps}
        skippedSteps={snapshot.skippedSteps}
        hasEnded={snapshot.hasEnded}
        isManagedRuntime={isManagedRuntime}
      />
    );

    return (
      <Box flexDirection="column">
        {promptComponent}
        {mainComponent}
      </Box>
    );
  }

  return (
    <Box>
      <Text color="gray"> Automator starting...</Text>
    </Box>
  );
};
