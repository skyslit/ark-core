import React, { useEffect } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import Automator from './components/automation';
import Panel from './components/panel';
// import BuilderPanel from './components/builder';
import useApp from './hooks/master';
import commandLineArgs from 'command-line-args';
import { getHelpText } from './cli';

type Mode = 'command' | 'help' | 'normal';

export type AppPropType = {
  cwd: string;
  mode: Mode;
  keepAlive?: boolean;
  options?: commandLineArgs.CommandLineOptions;
  isManagedRuntime?: boolean;
};

export default (props: AppPropType) => {
  const { cwd, mode, options } = props;
  if (mode === 'help') {
    const helpText = React.useMemo(() => getHelpText(), []);
    return <Text>{helpText}</Text>;
  }

  const {
    screen,
    hasPrompt,
    isJobActive,
    activePrompt,
    jobSnapshot,
    returnPromptResponse,
    runProcess,
    hideJobPanel,
    build,
    boot,
  } = useApp({
    cwd,
    mode,
    options,
  });

  let _isManagedRuntime: boolean = false;

  if (props.isManagedRuntime !== undefined) {
    _isManagedRuntime = props.isManagedRuntime;
  }

  if (mode === 'command') {
    _isManagedRuntime = true;
    if (['sync'].indexOf(options.process) > -1) {
      // Processes
      useEffect(() => {
        runProcess(options.process);
      }, []);
    } else if (['build', 'start'].indexOf(options.process) > -1) {
      useEffect(() => {
        build(options.process === 'start' ? 'development' : 'production');
      }, []);
    }
  } else {
    useEffect(() => {
      console.clear();
      boot();
    }, []);

    if (_isManagedRuntime === false) {
      useEffect(() => {
        process.stdin.resume();
      }, [isJobActive]);
    }
  }

  switch (screen) {
    case 'panel': {
      return <Panel runProcess={runProcess} />;
    }
    case 'automator': {
      return (
        <Automator
          hasPrompt={hasPrompt}
          activePrompt={activePrompt}
          isManagedRuntime={_isManagedRuntime}
          returnPromptResponse={returnPromptResponse}
          snapshot={jobSnapshot}
          hideJobPanel={hideJobPanel}
        />
      );
    }
    default: {
      if (mode === 'command') {
        switch (options.process) {
          default: {
            return null;
          }
        }
      }
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
