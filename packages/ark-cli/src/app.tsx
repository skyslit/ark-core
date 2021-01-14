import React from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import Automator from './components/automation';
import Panel from './components/panel';
import useApp from './hooks/master';
import commandLineArgs from 'command-line-args';
import { getHelpText } from './cli';

type Mode = 'command' | 'help' | 'normal';

export type AppPropType = {
  cwd: string;
  mode: Mode;
  keepAlive?: boolean;
  options?: commandLineArgs.CommandLineOptions;
};

export default (props: AppPropType) => {
  const { cwd, keepAlive, mode, options } = props;
  if (mode === 'help') {
    const helpText = React.useMemo(() => getHelpText(), []);
    return <Text>{helpText}</Text>;
  }

  const {
    screen,
    hasPrompt,
    activePrompt,
    jobSnapshot,
    isManagedRuntime,
    returnPromptResponse,
    runProcess,
    hideJobPanel,
  } = useApp({
    cwd,
    keepAlive: keepAlive || false,
    mode,
    options,
  });

  switch (screen) {
    case 'panel': {
      return <Panel runProcess={runProcess} />;
    }
    case 'automator': {
      return (
        <Automator
          hasPrompt={hasPrompt}
          activePrompt={activePrompt}
          isManagedRuntime={isManagedRuntime}
          returnPromptResponse={returnPromptResponse}
          snapshot={jobSnapshot}
          hideJobPanel={hideJobPanel}
        />
      );
    }
    case '_blank': {
      return null;
    }
    default: {
      return (
        <Box height={10} alignItems="center" justifyContent="center">
          <Text>
            <Spinner />
          </Text>
          <Text color="gray"> Ark CLI Booting up...</Text>
        </Box>
      );
    }
  }
};
