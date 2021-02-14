import Listr from 'listr';
import inquirer from 'inquirer';

export default () => {
  const job = new Listr([
    {
      title: 'initialize npm package',
      task: () => {},
    },
    {
      title: 'add .gitignore',
      task: () => {},
    },
    {
      title: 'setup git',
      task: () => {},
    },
    {
      title: 'install and configure typescript',
      task: () => {},
    },
    {
      title: 'configure .eslint',
      task: () => {},
    },
    {
      title: 'install dependencies',
      task: () => {},
    },
    {
      title: 'install @types declarations',
      task: () => {},
    },
    {
      title: 'setup prettier (git hook)',
      task: () => {},
    },
    {
      title: 'setup prettier (git hook)',
      task: () => {},
    },
  ]);

  return Promise.resolve()
    .then(() =>
      inquirer.prompt([
        {
          name: 'projectName',
          type: 'input',
        },
      ])
    )
    .then((input) => job.run());
};
