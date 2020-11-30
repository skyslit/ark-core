import {ApplicationContext} from '@skyslit/ark-package';
import {Express, Data} from '../index';
import supertest from 'supertest';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('System Services', () => {
  test('useRoute() fn', (done) => {
    const appContext = new ApplicationContext();
    appContext.activate(({use, run}) => {
      const {useRoute} = use(Express);
      run(() => {
        useRoute('get', '/', (req, res, next) => {
          res.send('hello');
        });
      });
    }).finally(() => {
      supertest(appContext.getData('default', 'express'))
          .get('/')
          .then((res) => {
            expect(res.status).toBe(200);
            done();
          });
    });
  });
});

describe('database operations', () => {
  const mongod = new MongoMemoryServer();
  let testDbConnectionString: string = '';

  beforeAll(async (done) => {
    testDbConnectionString = await mongod.getUri();
    done();
  }, 60000);

  test('connectDatabase() fn', (done) => {
    const appContext = new ApplicationContext();
    appContext.activate(({use}) => {
      const {connectDatabase} = use(Data);
      connectDatabase('default', testDbConnectionString);
    })
        .catch(done)
        .finally(() => {
          // Perform assertion
          appContext.deactivate()
              .then(done);
        });
  });

  test('useModel() fn as remote function', (done) => {
    const appContext = new ApplicationContext();
    appContext.activate(({use, useModule}) => {
      const {connectDatabase} = use(Data);
      connectDatabase('default', testDbConnectionString);
      useModule('testModule', ({use, run}) => {
        const {useModel} = use(Data);
        useModel('StudentSchema', {
          name: {
            type: String,
          },
        });
        run(() => {
          const {useModel} = use(Data);
          const StudentSchema = useModel('StudentSchema');
          const newStudent = new StudentSchema({
            name: 'John Doe',
          });
          return newStudent.save();
        });
      });
      useModule('testModule2', ({runOn}) => {
        runOn('testModule', async ({use}) => {
          const {useModel} = use(Data);
          const StudentSchema = useModel('StudentSchema');
          const students = await StudentSchema.find({}).exec();
          expect(students.length).toEqual(1);
          expect((students[0] as any).name).toEqual('John Doe');
        });
      });
    })
        .catch(done)
        .finally(async () => {
          await appContext.deactivate();
          done();
        });
  });

  afterAll(async () => {
    await mongod.stop();
  });
});
