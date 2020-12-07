import {createContext, runApp} from '@skyslit/ark-core';
import {} from '@skyslit/ark-express';
import TestModule from './modules/Module1/mock.module';

const app = createContext(({useModule}) => {
  useModule('test_id', TestModule);
});

runApp(app);
