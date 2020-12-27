import fs from 'fs';

export default {
  createDirectory: (path: string) => {
    return fs.mkdirSync(path, {recursive: true});
  },
  /**
   * Create or overrite file
   * @param {string} path
   * @param {any} content
   * @return {void}
   */
  writeFile: (path: string, content: any): void => {
    return fs.writeFileSync(path, content, {encoding: 'utf-8'});
  },
  deleteFile: (path: string) => {
    return fs.rmSync(path);
  },
  deleteDirectory: (path: string) => {
    return fs.rmdirSync(path);
  },
};
