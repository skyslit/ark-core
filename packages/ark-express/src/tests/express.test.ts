import {ApplicationContext} from '@skyslit/ark-core';
import {Express, Data} from '../index';
import {Connection} from 'mongoose';
import supertest from 'supertest';
import * as http from 'http';
import {MongoMemoryServer} from 'mongodb-memory-server';

declare global {
    // eslint-disable-next-line no-unused-vars
    namespace Ark {
        // eslint-disable-next-line no-unused-vars
        namespace MERN {
            // eslint-disable-next-line no-unused-vars
            interface Databases {
                testDb: Connection
            }
        }
    }
}

describe('app services', () => {
  test('useServer() fn', (done) => {
    const appContext = new ApplicationContext();
    appContext.activate(({use}) => {
      const {useServer} = use(Express);
      useServer();
    })
        .catch(done)
        .finally(async () => {
          expect(
              appContext.getData<http.Server>('default', 'http').listening
          ).toEqual(true);
          await appContext.deactivate();
          done();
        });
  });

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

  test('useDatabase() fn', (done) => {
    const appContext = new ApplicationContext();
    appContext.activate(({use}) => {
      const {useDatabase} = use(Data);
      useDatabase('default', testDbConnectionString);
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
      const {useDatabase} = use(Data);
      useDatabase('default', testDbConnectionString);
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

  test('useModel() fn with different database', (done) => {
    const appContext = new ApplicationContext();
    appContext.activate(({use, useModule}) => {
      const {useDatabase} = use(Data);
      useDatabase('testDb', testDbConnectionString);
      useModule('testModule', ({use, run}) => {
        const {useModel} = use(Data);
        useModel('ProfileSchema', {
          name: {
            type: String,
          },
          age: {
            type: Number,
          },
        }, 'testDb');
        run(() => {
          const {useModel} = use(Data);
          const ProfileSchema = useModel('ProfileSchema');
          const newStudent = new ProfileSchema({
            name: 'John Doe',
            age: 21,
          });
          return newStudent.save();
        });
      });
      useModule('testModule2', ({runOn}) => {
        runOn('testModule', async ({use}) => {
          const {useModel} = use(Data);
          const ProfileSchema = useModel('ProfileSchema');
          const students = await ProfileSchema.find({}).exec();
          expect(students.length).toEqual(1);
          expect((students[0] as any).name).toEqual('John Doe');
          expect((students[0] as any).age).toEqual(21);
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
