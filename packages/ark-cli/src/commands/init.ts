import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

import runInitProject from '../tasks/initProject.task';

const optionDefs = [
  {
    name: 'module',
    type: Boolean,
    defaultValue: false,
    description: 'Scaffold a project suitable for publishing as FPZ Module',
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display help information about this command',
  },
];

export default (argv?: string[]) => {
  const options = commandLineArgs(optionDefs, {
    argv,
    stopAtFirstUnknown: true,
  });

  if (options.help) {
    console.log(
      commandLineUsage([
        {
          header: 'Initialize Project',
          content:
            'Scaffolds a template suitable for building enterprise grade business application or re-usable FPZ module',
        },
        {
          header: 'Usage',
          content: '$ fpz init <option>',
        },
        {
          header: 'Options List',
          optionList: optionDefs,
        },
      ])
    );
  } else {
    console.log(
      commandLineUsage([
        {
          header: 'Create Project',
          content:
            'Scaffolds a template suitable for building enterprise grade business application or re-usable FPZ module',
        },
      ])
    );
    runInitProject()
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
};
