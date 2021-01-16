import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { Automator } from '../core/Automator';

type ParsePreset = 'raw' | 'json' | 'ts|tsx' | 'custom';

type Parser<O> = {
  encode: (input: O) => string;
  decode: (input: string) => O;
};

type ParserMap = { [key: string]: Parser<any> };

const RawParser: Parser<string> = {
  encode: (input) => input,
  decode: (input) => input,
};

const JSONParser: Parser<any> = {
  encode: (input) => JSON.stringify(input),
  decode: (input) => JSON.parse(input),
};

const FileParser: ParserMap = {
  json: JSONParser,
  raw: RawParser,
};

export type ContextType = {
  content: any;
  raw: string;
  saveFile: () => boolean;
  automator: Automator;
};

export const useFileSystem = (automator: Automator) => ({
  createDirectory: (p: string) => {
    return fs.mkdirSync(path.join(automator.cwd, p), { recursive: true });
  },
  /**
   * Create or overrite file
   * @param {string} p
   * @param {any} content
   * @return {void}
   */
  writeFile: (p: string, content: any): void => {
    return fs.writeFileSync(path.join(automator.cwd, p), content, {
      encoding: 'utf-8',
    });
  },
  deleteFile: (p: string) => {
    return fs.rmSync(path.join(automator.cwd, p));
  },
  deleteDirectory: (p: string) => {
    return rimraf.sync(path.join(automator.cwd, p), {});
  },
  existFile: (p: string) => {
    return fs.existsSync(path.join(automator.cwd, p));
  },
  readFile: (p: string): string => {
    return fs.readFileSync(path.join(automator.cwd, p), 'utf-8');
  },
  useFile: (p: string) => {
    const filePath = path.join(automator.cwd, p);
    let data: any = null;
    return {
      readFromDisk: () => {
        if (fs.existsSync(filePath)) {
          data = fs.readFileSync(filePath, 'utf8');
        }
        return {
          parse: (preset: ParsePreset, custom?: Parser<any>) => {
            let parser = custom || null;
            if (preset !== 'custom') {
              if (!FileParser[preset]) {
                throw new Error(`parser '${preset}' is not defined`);
              }
              parser = FileParser[preset];
            }

            if (!parser) {
              parser = RawParser;
            }

            const context: ContextType = {
              automator,
              content: parser.decode(data),
              raw: data,
              saveFile() {
                const dataToSave = parser.encode(context.content);
                fs.writeFileSync(filePath, dataToSave);
                return true;
              },
            };

            return {
              act: (activator: (opts: ContextType) => Generator) => {
                return () => activator(context);
              },
            };
          },
        };
      },
    };
  },
});
