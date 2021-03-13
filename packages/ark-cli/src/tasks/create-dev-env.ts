import Listr from 'listr';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

export default (cwd_?: string) => {
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
