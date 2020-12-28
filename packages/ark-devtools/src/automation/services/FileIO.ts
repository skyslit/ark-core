import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import {Automator} from '../core/Automator';

type ParsePreset = 'raw' | 'json' | 'ts|tsx' | 'custom';

export const useFileSystem = (automator: Automator) => ({
  createDirectory: (p: string) => {
    return fs.mkdirSync(path.join(automator.cwd, p), {recursive: true});
  },
  /**
   * Create or overrite file
   * @param {string} p
   * @param {any} content
   * @return {void}
   */
  writeFile: (p: string, content: any): void => {
    return fs.writeFileSync(
        path.join(automator.cwd, p), content, {encoding: 'utf-8'});
  },
  deleteFile: (p: string) => {
    return fs.rmSync(path.join(automator.cwd, p));
  },
  deleteDirectory: (p: string) => {
    return rimraf.sync(path.join(automator.cwd, p), {});
  },
  useFile: (p: string) => ({
    readFromDisk: () => {
      return {
        parse: (preset: ParsePreset) => {
          return {
            act: () => {
            },
          };
        },
      };
    },
  }),
});
