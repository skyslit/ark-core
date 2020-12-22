import React, {
  useState,
  useEffect,
} from 'react';
import {
  Text,
  Box,
} from 'ink';
import Spinner from 'ink-spinner';
import AutomationView from './components/automation';
import {useAutomator} from './hooks/automator';
import {Automations} from '@skyslit/ark-devtools';

type AppState = 'boot' | 'automation' | 'dashboard';

export default () => {
  const {isActive, run} = useAutomator();
  const [appState] = useState<AppState>('boot');

  useEffect(() => {
    console.clear();
    const timer = setTimeout(() => {
      if (appState === 'boot') {
        run(Automations.processes.SetupProject);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isActive === true) {
    return (
      <AutomationView />
    );
  } else {
    switch (appState) {
      case 'dashboard': {
        return (
          <Text color="green">Dashboard...</Text>
        );
      }
      default: {
        return (
          <Box height={10} alignItems="center" justifyContent="center">
            <Text>
              <Spinner />
            </Text>
            <Text color="gray">
              {' '}Ark CLI Booting up...
            </Text>
          </Box>
        );
      }
    }
  }
};
