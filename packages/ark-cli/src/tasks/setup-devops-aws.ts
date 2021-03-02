import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import ensureDir from '../utils/ensure-dir';

/**
 * Copy modified template file
 * @param {string} srcPath
 * @param {string} destPath
 * @param {string} mod
 */
function copyTemplate(
  srcPath: string,
  destPath: string,
  mod: (content: any) => any
) {
  let content: any = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));

  if (mod) {
    content = mod(content);
  }

  ensureDir(destPath, false);

  // Write template: ./target/devops-template.json
  fs.writeFileSync(destPath, JSON.stringify(content, null, ' '));
}

/**
 * Creates buildspec file
 * @param {string} cwd
 */
function createBuildSpecFile(cwd: string) {
  const hasBuildSpec: boolean = ['buildspec.yml'].every((file) =>
    fs.existsSync(path.join(cwd, file))
  );

  if (!hasBuildSpec) {
    fs.copyFileSync(
      path.join(__dirname, '../../aws/code-build/buildspec.yml'),
      path.join(cwd, 'buildspec.yml')
    );

    console.log(chalk.green('buildspec.yaml added'));
  } else {
    console.log(chalk.gray('buildspec.yaml already exists, skipping...'));
  }
}

/**
 * Create CloudFormation templates
 * @param {string} cwd
 * @return {Promise<boolean>}
 */
function createCloudFormationTemplates(cwd: string) {
  const awsDir: string = path.join(cwd, 'aws');

  const hasTemplates: boolean = [
    'devops-template.json',
    'full-env-template.json',
    'standard-env-template.json',
  ].every((file) => fs.existsSync(path.join(awsDir, file)));

  if (!hasTemplates) {
    const packageJson: any = JSON.parse(
      fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')
    );

    // Copy template: ./source/devops-template.json
    copyTemplate(
      path.join(__dirname, '../../aws/cloud-formation/devops-template.json'),
      path.join(awsDir, 'devops-template.json'),
      (content) => {
        content.Parameters.ProjectName.Default = packageJson.name;
        return content;
      }
    );

    // Copy template: ./source/full-env-template.json
    copyTemplate(
      path.join(__dirname, '../../aws/cloud-formation/full-env-template.json'),
      path.join(awsDir, 'full-env-template.json'),
      (content) => {
        return content;
      }
    );

    // Copy template: ./source/standard-env-template.json
    copyTemplate(
      path.join(
        __dirname,
        '../../aws/cloud-formation/standard-env-template.json'
      ),
      path.join(awsDir, 'standard-env-template.json'),
      (content) => {
        return content;
      }
    );

    console.log(chalk.green('CF templates added'));
    return true;
  }

  console.log(chalk.gray('CF templates already exists, skipping...'));
  return true;
}

export default (cwd_?: string) => {
  const cwd = cwd_ || process.cwd();

  return Promise.resolve(true)
    .then(() => createCloudFormationTemplates(cwd))
    .then(() => createBuildSpecFile(cwd))
    .then(() => {
      console.log('');
      return true;
    });
};
