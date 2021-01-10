import React from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import Automator from './components/automation';
import Panel from './components/panel';
import useApp from './hooks/master';

type PropType = {
  cwd: string;
  keepAlive?: boolean;
};

export default (props: PropType) => {
  const { cwd, keepAlive } = props;
  const {
    screen,
    hasPrompt,
    activePrompt,
    returnPromptResponse,
    runProcess,
  } = useApp({
    cwd,
    keepAlive: keepAlive || false,
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
          returnPromptResponse={returnPromptResponse}
        />
      );
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
