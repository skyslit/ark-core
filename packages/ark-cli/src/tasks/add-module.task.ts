import Listr from 'listr';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import ensureDir from '../utils/ensure-dir';
import { Observable } from 'rxjs';
import ncp from 'ncp';

export default (packageId: string, cwd_?: string) => {
  const cwd = cwd_ || process.cwd();
  const isNotAPath = packageId === path.basename(packageId);

  let moduleSourceRootDir: string = null;

  const output: any[] = [];

  if (isNotAPath === true) {
    moduleSourceRootDir = path.join(cwd, '.ark', 'temp');
  } else {
    moduleSourceRootDir = packageId;
  }

  const getModuleDir = (id: string) => {
    return path.join(cwd, 'src', 'modules', id);
  };

  const job = new Listr([
    {
      title: 'downloading module...',
      enabled: () => isNotAPath,
      task: (ctx, task) => {
        throw new Error('Freepizza not implemented');
      },
    },
    {
      title: 'copying files...',
      task: (ctx) =>
        new Observable((observer) => {
          const moduleTargetPath = getModuleDir(ctx.moduleId);

          ensureDir(moduleTargetPath, false, true);

          ncp(
            path.join(moduleSourceRootDir, 'src', 'modules', 'main'),
            moduleTargetPath,
            (err) => {
              if (err) {
                observer.error(err);
              } else {
                observer.complete();
              }
            }
          );
        }),
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
    .then((input) => {
      const modulePath = getModuleDir(input.moduleId);

      // Check if module already exists
      const moduleExists = fs.existsSync(modulePath);
      if (moduleExists) {
        throw new Error(`Module '${input.moduleId}' already exists`);
      }

      return job.run({
        cwd,
        ...input,
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => {
      console.log(output);
    });
};
