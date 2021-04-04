import { createModule } from '@skyslit/ark-core';
import { createTestContext, createTestDb } from '../test-utils';
import { Backend, Data, defineService } from '../index';
import request from 'supertest';

// @ts-ignore
process.env.DISABLE_APP_LOG = true;

const dbServer = createTestDb();

afterEach(dbServer.stop);

test('general startup with functional context', async () => {
  const moduleToTest = createModule(({ use }) => {
    const { useRoute } = use(Backend);
    useRoute('get', '/', (req, res) => {
      res.send('Hello World');
    });
  });

  const dbConnString = await dbServer.getDbConnectionString();
  const context = await createTestContext(({ useModule, use }) => {
    const { useDatabase } = use(Data);
    useDatabase('default', dbConnString);
    useModule('default', moduleToTest);
  });

  await request(context.app)
    .get('/')
    .expect(200)
    .then(() => {
      return true;
    })
    .finally(() => context.instance.deactivate());
});

test('general startup with opts', async () => {
  const sampleService = defineService('sample-service', (props) => {
    props.defineLogic((props) => {
      return props.success({ message: 'Hi World!' });
    });
  });

  const moduleToTest = createModule(({ use }) => {
    const { useService } = use(Backend);
    useService(sampleService);
  });

  const dbConnString = await dbServer.getDbConnectionString();
  const context = await createTestContext({
    module: moduleToTest,
    dbConnString,
  });

  await context
    .invokeService('sample-service')
    .expect(200)
    .then((response) => {
      expect(response.body.meta.message).toStrictEqual('Hi World!');
      return true;
    })
    .finally(() => context.instance.deactivate());
});
