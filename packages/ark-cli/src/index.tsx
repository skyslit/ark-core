#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

import { runStart, runBuild } from './commands/builders';

const mainCommand = commandLineArgs(
  [
    {
      name: 'command',
      type: String,
      defaultOption: true,
    },
  ],
  {
    stopAtFirstUnknown: true,
  }
);

switch (mainCommand.command) {
  case 'start': {
    runStart(mainCommand._unknown);
    break;
  }
  case 'build': {
    runBuild(mainCommand._unknown);
    break;
  }
  default: {
    console.log(
      commandLineUsage([
        {
          header: `FreePizza Developer Tools (v${
            require('../package.json').version
          })`,
          content:
            'CLI tools for developing modular business applications using Ark Framework',
        },
        {
          header: 'Usage',
          content: '$ fpz <command> <options>',
        },
        {
          header: 'Command List',
          content: [
            {
              name: 'init',
              summary: 'Setup the current directory with a blank Ark project',
            },
            {
              name: 'start',
              summary: 'Run this command from Ark project to run in local',
            },
            {
              name: 'build',
              summary:
                'Creates an optimized production build of your application',
            },
            { name: 'publish', summary: 'Publish Ark Module to FreePizza.io' },
            { name: 'help', summary: 'Display help information about FPZ.' },
            { name: 'version', summary: 'Prints the version.' },
          ],
        },
      ])
    );
    break;
  }
}
