import Listr from 'listr';
import fs from 'fs';
import path from 'path';
import ini from 'ini';
import chalk from 'chalk';
import gitP from 'simple-git/promise';
import inquirer from 'inquirer';
import runCommand from '../utils/run-command';
import ensureDir from '../utils/ensure-dir';

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

export const updateGit = (cwd_?: string) => {
  const cwd = cwd_ || process.cwd();
  const git = gitP(cwd);

  return git.listConfig().then((gitConfigList) => {
    let gitDefaultName: string = null;
    let gitDefaultEmail: string = null;

    try {
      let i = 0;
      for (i = 0; i < gitConfigList.files.length; i++) {
        const fPath: string = gitConfigList.files[i];

        if (!gitDefaultName) {
          if (gitConfigList.values[fPath]['user.name']) {
            gitDefaultName = gitConfigList.values[fPath]['user.name'] as any;
          }
        }

        if (!gitDefaultEmail) {
          if (gitConfigList.values[fPath]['user.email']) {
            gitDefaultEmail = gitConfigList.values[fPath]['user.email'] as any;
          }
        }
      }
    } catch (e) {
      /** Do nothing */
    }

    return inquirer
      .prompt([
        {
          name: 'name',
          message: 'Your name',
          type: 'input',
          default: gitDefaultName,
        },
        {
          name: 'email',
          message: 'Your Email',
          type: 'input',
          default: gitDefaultEmail,
        },
      ])
      .then((v) => {
        const gitconfigFilePath = path.join(cwd, 'root', '.gitconfig');
        ensureDir(gitconfigFilePath);

        let config: any = {};

        try {
          if (fs.existsSync(gitconfigFilePath)) {
            config = ini.parse(fs.readFileSync(gitconfigFilePath, 'utf-8'));
          }
        } catch (e) {
          /** Do nothing */
        }

        if (!config.core) {
          config.core = {};
        }

        config.core.ignorecase = false;

        if (!config.credential) {
          config.credential = {};
        }

        config.credential.helper = '!aws codecommit credential-helper $@';
        config.credential.UseHttpPath = true;

        if (!config.user) {
          config.user = {};
        }

        config.user.name = v.name;
        config.user.email = v.email;

        fs.writeFileSync(gitconfigFilePath, ini.stringify(config));

        console.log('');
        console.log(chalk.green('Update successful!'));
        console.log(
          chalk.yellow('Please restart the stack to see this change in effect')
        );
        console.log('');

        return true;
      });
  });
};
