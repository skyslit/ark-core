import Listr from 'listr';
import inquirer from 'inquirer';

export default (cwd_?: string) => {
  const cwd = cwd_ || process.cwd();
  const job = new Listr([
    {
      title: 'downloading module...',
      task: () => {},
    },
    {
      title: 'copying files...',
      task: () => {},
    },
    {
      title: 'cleaning up...',
      task: () => {},
    },
  ]);

  return Promise.resolve()
    .then(() =>
      inquirer.prompt([
        {
          name: 'moduleId',
          message: 'Please specify the module id',
          type: 'input',
        },
      ])
    )
    .then((input) =>
      job.run({
        cwd,
        ...input,
      })
    );
};
