import { createModule } from '@skyslit/ark-core';
import { createTestContext, createTestDb } from '../test-utils';
import { Backend, Data } from '../index';
import request from 'supertest';

const moduleToTest = createModule(({ use }) => {
  const { useRoute } = use(Backend);
  useRoute('get', '/', (req, res) => {
    res.send('Hello World');
  });
});

const dbServer = createTestDb();

afterAll(dbServer.stop);

test('sample', async () => {
  const db = await dbServer.getDbConnectionString();
  const context = await createTestContext(({ useModule, use }) => {
    const { useDatabase } = use(Data);
    useDatabase('default', db);
    useModule('default', moduleToTest);
  });

  await request(context.app)
    .get('/')
    .expect(200)
    .then(() => {
      return true;
    })
    .then(() => context.instance.deactivate());
});
