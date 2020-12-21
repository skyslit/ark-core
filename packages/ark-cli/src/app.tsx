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

type AppState = 'boot' | 'automation' | 'dashboard';

export default () => {
  const [appState, setAppState] = useState<AppState>('boot');

  useEffect(() => {
    console.clear();
    const timer = setInterval(() => {
      if (appState === 'boot') {
        setAppState('automation');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  switch (appState) {
    case 'dashboard': {
      return (
        <Text color="green">Dashboard...</Text>
      );
    }
    case 'automation': {
      return (
        <AutomationView />
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
};
