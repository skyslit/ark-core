import { Observable } from 'rxjs';
import fs from 'fs';
import path from 'path';

/**
 * Initializes NPM, skips if already initialized
 * @param {any} ctx
 * @param {any} task
 * @return {Observable}
 */
export default (ctx: any, task: any) => {
  return new Observable((observer) => {
    const { cwd } = ctx;

    // Check if package.json exists
    const packageJsonPath = path.join(cwd, 'package.json');
    const doesPackageJsonFileExists = fs.existsSync(packageJsonPath);

    if (doesPackageJsonFileExists === true) {
      task.skip('Package already initialized');
      observer.complete();
    } else {
      const packageName: string = ctx.projectName;

      if (!packageName) {
        throw new Error(`Project name is required`);
      }

      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(
          {
            name: packageName,
            description: 'Cloud Application powered by Skyslit Ark',
            version: '0.0.1',
            scripts: {
              start: 'fpz start',
              build: 'fpz build',
              test: 'echo "Error: no test specified" && exit 1',
            },
            license: 'ISC',
            dependencies: {},
            devDependencies: {},
          },
          undefined,
          ' '
        )
      );
      observer.complete();
    }
  });
};
