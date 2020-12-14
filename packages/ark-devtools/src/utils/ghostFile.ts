import fs from 'fs';
import path from 'path';
import ejs from 'ejs';

type GhostFileActions = {
  eject: (
    contextPath: string,
    relPath: string,
  ) => void,
  provide: (
    contextPath: string,
    relPath: string,
  ) => {[key: string]: string},
}

/**
 * Read EJS template
 * @param {string} templatePath
 * @return {string}
 */
function readTemplate(templatePath: string): string {
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Creates Ghost file
 * @param {string} templatePath
 * @param {any=} data
 * @return {GhostFileActions}
 */
export function createGhostFile(
    templatePath: string,
    data?: any
): GhostFileActions {
  return {
    eject: (
        contextPath: string,
        relPath: string,
    ) => {
      const output = ejs.render(readTemplate(templatePath), data);
      const targetDirPath = path.dirname(path.join(contextPath, relPath));

      if (!fs.existsSync(targetDirPath)) {
        fs.mkdirSync(targetDirPath, {recursive: true});
      }

      fs.writeFileSync(
          path.join(contextPath, relPath),
          output
      );
    },
    provide: (
        contextPath: string,
        relPath: string,
    ) => {
      // Check if file already exists
      const targetFilePath = path.join(contextPath, relPath);
      if (fs.existsSync(targetFilePath)) {
        return {};
      } else {
        const output = ejs.render(readTemplate(templatePath), data);
        return {
          [relPath]: output,
        };
      }
    },
  };
}
