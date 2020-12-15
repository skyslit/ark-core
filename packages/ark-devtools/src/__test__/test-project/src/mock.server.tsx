import {createContext, runApp, ApplicationContext} from '@skyslit/ark-core';
import {Backend} from '@skyslit/ark-backend';
import TestModule from './modules/Module1/mock.module';
// Client application
import AdminClientApp from './admin.client';

// TODO
const registerSPA = (id: string, _: any) => _;

const app = createContext(({use, useModule}) => {
  const {useServer, useRoute} = use(Backend);

  registerSPA('admin', AdminClientApp);

  useModule('test_id', TestModule);

  useRoute('get', '/', (req, res) => {
    res.send('Test');
  });

  useServer({
    port: 3001,
  } as any);
});

runApp(app);

process.on('SIGTERM', () => {
  ApplicationContext.getInstance().deactivate()
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
});
