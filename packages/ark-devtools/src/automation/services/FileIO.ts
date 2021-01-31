import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { Automator } from '../core/Automator';
import commentJson from 'comment-json';

type ParsePreset = 'raw' | 'raw-lines' | 'json' | 'ts|tsx' | 'custom';

type Parser<O> = {
  encode: (input: O) => string;
  decode: (input: string) => O;
};

type ParserMap = { [key: string]: Parser<any> };

const RawParser: Parser<string> = {
  encode: (input) => input,
  decode: (input) => input,
};

const RawLineParser: Parser<string[]> = {
  encode: (input) => input.join('\n'),
  decode: (input) => {
    if (input) {
      return input.split('\n');
    }
    return [];
  },
};

const JSONParser: Parser<any> = {
  encode: (input) => commentJson.stringify(input, null, 2),
  decode: (input) => {
    if (input) {
      return commentJson.parse(input, undefined, false);
    }
    return {};
  },
};

const FileParser: ParserMap = {
  json: JSONParser,
  raw: RawParser,
  'raw-lines': RawLineParser,
};

export type ContextType = {
  exists: boolean;
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
    let exists: boolean = false;
    return {
      readFromDisk: () => {
        if (fs.existsSync(filePath)) {
          data = fs.readFileSync(filePath, 'utf8');
          exists = true;
        } else {
          data = '';
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
              exists,
              automator,
              content: parser.decode(data),
              raw: data,
              saveFile() {
                const dirname = path.dirname(filePath);
                if (!fs.existsSync(dirname)) {
                  fs.mkdirSync(dirname, { recursive: true });
                }
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
