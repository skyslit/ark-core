import React, { useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

type AppState = 'boot' | 'automation' | 'dashboard';

export default () => {
  const [appState] = useState<AppState>('boot');
  switch (appState) {
    case 'dashboard': {
      return <Text color="green">Dashboard...</Text>;
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
