#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

import runInit from './commands/init';
import { runStart, runBuild } from './commands/builders';

const mainCommand = commandLineArgs(
  [
    {
      name: 'command',
      type: String,
      defaultOption: true,
    },
    {
      name: 'version',
      alias: 'v',
      type: Boolean,
    },
  ],
  {
    stopAtFirstUnknown: true,
  }
);

switch (mainCommand.command) {
  case 'init': {
    runInit(mainCommand._unknown);
    break;
  }
  case 'start': {
    runStart(mainCommand._unknown);
    break;
  }
  case 'build': {
    runBuild(mainCommand._unknown);
    break;
  }
  default: {
    if (mainCommand.version === true) {
      console.log(`v${require('../package.json').version}`);
      break;
    }
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
          content: '$ fpz <options> <command>',
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
          ],
        },
        {
          header: 'Options List',
          optionList: [
            {
              name: 'help',
              alias: 'h',
              description: 'Display help information about FPZ (CLI) Devtools',
              type: Boolean,
            },
            {
              name: 'version',
              alias: 'v',
              description: 'Prints the version information',
              type: Boolean,
            },
          ],
        },
      ])
    );
    break;
  }
}
