export { BackendBuilder } from './builders/BackendBuilder';
export { SPABuilder } from './builders/FrontendBuilder';

import initializeNpm from './activities/init/npm-init';

export const Activities = {
  init: {
    initializeNpm,
  },
};
