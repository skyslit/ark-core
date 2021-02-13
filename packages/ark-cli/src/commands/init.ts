import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

import inquirer from 'inquirer';
import Listr from 'listr';

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
    const delay = (ms: number = 1000) => new Promise((r) => setTimeout(r, ms));
    const task = new Listr([
      {
        title: 'Install package dependencies with Yarn',
        task: (ctx, task) => delay(),
      },
      {
        title: 'Install package dependencies with npm',
        enabled: (ctx) => ctx.yarn === false,
        task: () =>
          inquirer.prompt([
            {
              type: 'input',
              name: 'projectName',
            },
          ]),
      },
      {
        title: 'Run tests',
        task: () => delay(),
      },
      {
        title: 'Publish package',
        task: () => delay(),
      },
    ]);

    task
      .run()
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });

    // inquirer.prompt([
    // 	{
    // 		type: 'input',
    // 		name: 'projectName',
    // 	}
    // ])
    // .then((v) => {
    // 	console.log(v);
    // })
    // .catch((err) => {
    // 	console.error(err);
    // 	process.exit(1);
    // })
  }
};
