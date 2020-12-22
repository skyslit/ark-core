import {createService} from '../core/Automator';
import fs from 'fs';

export default createService(() => ({
  mkdir: (path: string) => {
    return fs.mkdirSync(path, {recursive: true});
  },
  sayHello: () => {
    console.log('Hello');
  },
}));
