import {createContext, runApp} from '@skyslit/ark-core';
import TestModule from './modules/Module1/mock.module';
// Client application
import AdminClientApp from './admin.client';

// TODO
const registerSPA = (id: string, _: any) => _;

const app = createContext(({useModule}) => {
  registerSPA('admin', AdminClientApp);

  useModule('test_id', TestModule);
});

runApp(app);
