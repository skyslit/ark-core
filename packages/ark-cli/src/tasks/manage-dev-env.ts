import Listr from 'listr';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import runCommand from '../utils/run-command';

export const createDevEnv = (cwd_?: string) => {
  const cwd = cwd_ || process.cwd();

  if (
    ['docker-compose.yml', 'Dockerfile.dev'].some((p) =>
      fs.existsSync(path.join(cwd, p))
    )
  ) {
    console.log('');
    console.log(chalk.red('Directory is not empty'));
    console.log('');
    return Promise.resolve(true);
  }

  const job = new Listr([
    {
      title: `create Dockerfile.dev`,
      task: () =>
        fs.copyFileSync(
          path.join(__dirname, '../../assets/local-dev/Dockerfile.dev'),
          path.join(cwd, 'Dockerfile.dev')
        ),
    },
    {
      title: `create docker-compose.yml`,
      task: () =>
        fs.copyFileSync(
          path.join(__dirname, '../../assets/local-dev/docker-compose.yml'),
          path.join(cwd, 'docker-compose.yml')
        ),
    },
    {
      title: 'create .env file',
      task: (ctx) =>
        fs.writeFileSync(
          path.join(cwd, '.env'),
          [`TITLE=${ctx.title}`].join('\n'),
          { encoding: 'utf-8' }
        ),
    },
  ]);

  return inquirer
    .prompt([
      {
        name: 'title',
        message: 'Environment title',
        type: 'input',
        default: path.basename(cwd),
      },
    ])
    .then((v) => job.run(v));
};

export const startDevStack = (cwd_?: string) => {
  const cwd = cwd_ || process.cwd();

  if (
    ['docker-compose.yml', 'Dockerfile.dev'].every((p) =>
      fs.existsSync(path.join(cwd, p))
    )
  ) {
    // We have necessary file to proceed
    const job = new Listr([
      {
        title: 'docker-compose up',
        task: () =>
          runCommand('launching stack...', 'docker-compose up -d; exit', {
            cwd,
          }),
      },
      {
        title: 'launch VS Code',
        task: () =>
          runCommand('launching VS Code', `code "${cwd}" -n; exit`, { cwd }),
      },
    ]);

    return inquirer
      .prompt([
        {
          name: 'confirm',
          message: `Start ${path.basename(cwd)}?`,
          type: 'confirm',
          default: false,
        },
      ])
      .then((val) => {
        if (val.confirm === false) {
          console.log('');
          console.log(chalk.gray('Aborted!'));
          console.log('');
          return true;
        }
        return job.run().then(() => {
          console.log('');
          console.log(chalk.green('Stack launched!'));
          console.log('');
          return true;
        });
      });
  } else {
    console.log('');
    console.log(chalk.red('Directory is empty'));
    console.log('');
    return Promise.resolve(true);
  }
};

export const stopDevStack = (cwd_?: string) => {
  const cwd = cwd_ || process.cwd();

  if (
    ['docker-compose.yml', 'Dockerfile.dev'].every((p) =>
      fs.existsSync(path.join(cwd, p))
    )
  ) {
    // We have necessary file to proceed
    const job = new Listr([
      {
        title: 'docker-compose down',
        task: () =>
          runCommand(
            'tearing down...',
            'docker-compose down --remove-orphans; exit',
            { cwd }
          ),
      },
    ]);

    return inquirer
      .prompt([
        {
          name: 'confirm',
          message: `Stop ${path.basename(cwd)}?`,
          type: 'confirm',
          default: false,
        },
      ])
      .then((val) => {
        if (val.confirm === false) {
          console.log('');
          console.log(chalk.gray('Aborted!'));
          console.log('');
          return true;
        }
        return job.run().then(() => {
          console.log('');
          console.log(chalk.green('Stack down!'));
          console.log('');
          return true;
        });
      });
  } else {
    console.log('');
    console.log(chalk.red('Directory is empty'));
    console.log('');
    return Promise.resolve(true);
  }
};
