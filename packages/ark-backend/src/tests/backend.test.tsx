import React from 'react';
import path from 'path';
import { ApplicationContext } from '@skyslit/ark-core';
import {
  Backend,
  Data,
  defineService,
  ServiceController,
  Security,
} from '../index';
import { Connection } from 'mongoose';
import supertest from 'supertest';
import * as http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createReactApp, Frontend } from '@skyslit/ark-frontend';
import Joi from 'joi';

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace Ark {
    // eslint-disable-next-line no-unused-vars
    interface Databases {
      testDb: Connection;
    }
  }
}

describe('utils', () => {
  describe('useJwt', () => {
    test('should sign with default options', (done) => {
      const context = new ApplicationContext();

      context
        .activate(({ use }) => {
          const {} = use(Backend);
          const { jwt, enableAuth } = use(Security);
          enableAuth({
            jwtSecretKey: 'test_key_123',
          });
          const signedToken = jwt.sign({
            message: 'Secret Message',
          });
          const verifiedToken: any = jwt.verify(signedToken);

          expect(verifiedToken.message).toStrictEqual('Secret Message');
        })
        .then(() => {
          done();
        })
        .catch(done);
    });

    test('should sign with custom options', (done) => {
      const context = new ApplicationContext();

      context
        .activate(({ use }) => {
          const {} = use(Backend);
          const { jwt, enableAuth } = use(Security);
          enableAuth({
            jwtSecretKey: 'test_key_123',
          });

          const signedToken = jwt.sign(
            {
              message: 'Secret Message 2',
            },
            'test_key_456'
          );

          const verifiedToken: any = jwt.verify(signedToken, 'test_key_456');

          expect(verifiedToken.message).toStrictEqual('Secret Message 2');
        })
        .then(() => {
          done();
        })
        .catch(done);
    });

    test('should decode without verifying', (done) => {
      const context = new ApplicationContext();

      context
        .activate(({ use }) => {
          const {} = use(Backend);
          const { jwt, enableAuth } = use(Security);
          enableAuth({
            jwtSecretKey: 'test_key_123',
          });

          const signedToken = jwt.sign(
            {
              message: 'Secret Message 2',
            },
            'test_key_456'
          );

          const verifiedToken: any = jwt.decode(signedToken);

          expect(verifiedToken.message).toStrictEqual('Secret Message 2');
        })
        .then(() => {
          done();
        })
        .catch(done);
    });
  });
});

describe('Backend services', () => {
  test('useServer() fn', (done) => {
    const appContext = new ApplicationContext();
    appContext
      .activate(({ use }) => {
        const { useServer } = use(Backend);
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
    appContext
      .activate(({ use, run }) => {
        const { useRoute } = use(Backend);
        run(() => {
          useRoute('get', '/', (req, res, next) => {
            res.send('hello');
          });
        });
      })
      .finally(() => {
        supertest(appContext.getData('default', 'express'))
          .get('/')
          .then((res) => {
            expect(res.status).toBe(200);
            done();
          });
      });
  });

  describe('useService() fn', () => {
    test('response structure should be appropriate', (done) => {
      const testService = defineService('TEST_SERVICE', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({ message: 'This is from meta' }, [1, 2, 3]);
        });
      });

      const context = new ApplicationContext();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          useService(testService, {
            controller: new ServiceController(),
          });
        })
        .finally(() => {
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST_SERVICE')
            .expect(200)
            .then((res) => {
              expect(res.body.meta.message).toStrictEqual('This is from meta');
              expect(res.body.data).toStrictEqual([1, 2, 3]);
              expect(res.body.type).toStrictEqual('success');
              done();
            });
        });
    });

    test('should register in service controller', (done) => {
      const testService = defineService('TEST_SERVICE', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({ message: 'This is from meta' });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          useService(testService, {
            controller: serviceController,
            skipServiceRegistration: true,
          });
        })
        .finally(() => {
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST_SERVICE')
            .expect(200)
            .then((res) => {
              expect(
                serviceController.find('TEST_SERVICE', 'service')
              ).toBeFalsy();
              done();
            });
        });
    });

    test('should not register in service controller', (done) => {
      const testService = defineService('TEST_SERVICE', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({ message: 'This is from meta' });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          useService(testService, {
            controller: serviceController,
          });
        })
        .finally(() => {
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST_SERVICE')
            .expect(200)
            .then((res) => {
              expect(
                serviceController.find('TEST_SERVICE', 'service')
              ).toBeTruthy();
              done();
            });
        });
    });

    test('should say 400 for invalid request', (done) => {
      const testService = defineService('TEST_SERVICE', (opts) => {
        opts.defineValidator(
          Joi.object({
            userName: Joi.string().required(),
          })
        );

        opts.defineLogic((opts) => {
          return opts.success({ message: 'This is from meta' });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          useService(testService, {
            controller: serviceController,
          });
        })
        .finally(() => {
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST_SERVICE')
            .expect(400)
            .then((res) => {
              expect(res.body.message).toStrictEqual('"userName" is required');
              expect(res.body.validationErrors[0].key).toStrictEqual(
                'userName'
              );
              expect(res.body.validationErrors[0].message).toStrictEqual(
                '"userName" is required'
              );
              done();
            });
        });
    });

    test('should say 401 for unauthorised scenario', (done) => {
      const loginService = defineService('LOGIN', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({
            token: opts.security.jwt.sign({
              _id: 'u-100',
              name: 'John',
              email: 'john@doe.com',
            }),
          });
        });
      });

      const testService = defineService('TEST', (opts) => {
        opts.defineRule((opts) => {
          if (opts.args.isAuthenticated) {
            opts.allow();
          }
        });
        opts.defineLogic((opts) => {
          return opts.success({
            message: 'This is from meta',
            user: opts.args.user,
          });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          const { enableAuth } = use(Security);

          enableAuth({
            jwtSecretKey: 'my_secret_123',
          });

          useService(testService, {
            controller: serviceController,
          });

          useService(loginService, {
            controller: serviceController,
          });
        })
        .finally(() => {
          // Try accessing protected route
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST')
            .expect(401)
            .then((res) => {
              // Login
              supertest(context.getData('default', 'express'))
                .post('/___service/default/LOGIN')
                .expect(200)
                .then((res) => {
                  const token = res.body.meta.token;
                  // Access the protected route again with token
                  supertest(context.getData('default', 'express'))
                    .post('/___service/default/TEST')
                    .set('Authorization', token)
                    .expect(200)
                    .then((res) => {
                      expect(res.body.meta.user.name).toStrictEqual('John');
                      expect(res.body.meta.message).toStrictEqual(
                        'This is from meta'
                      );
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });

    test('should say 403 for forbidden request', (done) => {
      const loginService = defineService('LOGIN', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({
            token: opts.security.jwt.sign({
              _id: 'u-100',
              name: 'John',
              email: 'john@doe.com',
            }),
          });
        });
      });

      const testService = defineService('TEST', (opts) => {
        opts.defineRule((opts) => {
          if (opts.args.isAuthenticated) {
            opts.allowPolicy('SAMPLE_POLICY');
          }
        });
        opts.defineLogic((opts) => {
          return opts.success({
            message: 'This is from meta',
            user: opts.args.user,
          });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          const { enableAuth } = use(Security);

          enableAuth({
            jwtSecretKey: 'my_secret_123',
          });

          useService(testService, {
            controller: serviceController,
          });

          useService(loginService, {
            controller: serviceController,
          });
        })
        .finally(() => {
          // Try accessing protected route
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST')
            .expect(401)
            .then((res) => {
              // Login
              supertest(context.getData('default', 'express'))
                .post('/___service/default/LOGIN')
                .expect(200)
                .then((res) => {
                  const token = res.body.meta.token;
                  // Access the protected route again with token
                  supertest(context.getData('default', 'express'))
                    .post('/___service/default/TEST')
                    .set('Authorization', token)
                    .expect(403)
                    .then((res) => {
                      expect(res.body.message).toStrictEqual(
                        'Access forbidden'
                      );
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });

    test('should say 200 when policy is matched', (done) => {
      const loginService = defineService('LOGIN', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({
            token: opts.security.jwt.sign({
              _id: 'u-100',
              name: 'John',
              email: 'john@doe.com',
              policies: ['SAMPLE_POLICY'],
            }),
          });
        });
      });

      const testService = defineService('TEST', (opts) => {
        opts.defineRule((opts) => {
          if (opts.args.isAuthenticated) {
            opts.allowPolicy('SAMPLE_POLICY');
          }
        });
        opts.defineLogic((opts) => {
          return opts.success({
            message: 'This is from meta',
            user: opts.args.user,
          });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          const { enableAuth } = use(Security);

          enableAuth({
            jwtSecretKey: 'my_secret_123',
          });

          useService(testService, {
            controller: serviceController,
          });

          useService(loginService, {
            controller: serviceController,
          });
        })
        .finally(() => {
          // Try accessing protected route
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST')
            .expect(401)
            .then((res) => {
              // Login
              supertest(context.getData('default', 'express'))
                .post('/___service/default/LOGIN')
                .expect(200)
                .then((res) => {
                  const token = res.body.meta.token;
                  // Access the protected route again with token
                  supertest(context.getData('default', 'express'))
                    .post('/___service/default/TEST')
                    .set('Authorization', token)
                    .expect(200)
                    .then((res) => {
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });

    test('should say 200 when user name is John', (done) => {
      const loginService = defineService('LOGIN', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({
            token: opts.security.jwt.sign({
              _id: 'u-100',
              name: 'John',
              email: 'john@doe.com',
              role: 'STANDARD_USER',
            }),
          });
        });
      });

      const testService = defineService('TEST', (opts) => {
        opts.defineRule((opts) => {
          if (opts.args.isAuthenticated) {
            opts.allowPolicy('SAMPLE_POLICY');
          }
        });
        opts.defineLogic((opts) => {
          return opts.success({
            message: 'This is from meta',
            user: opts.args.user,
          });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          const { enableAuth, definePolicyExtractor } = use(Security);

          enableAuth({
            jwtSecretKey: 'my_secret_123',
          });

          definePolicyExtractor('global', (args) => {
            if (args.isAuthenticated === true) {
              if (args.user.name === 'John') {
                return ['SAMPLE_POLICY'];
              }
            }
          });

          definePolicyExtractor('test-extractor', (args) => {
            return ['TEST_POLICY'];
          });

          useService(testService, {
            controller: serviceController,
            policyExtractorRefs: ['test-extractor', 'global'],
          });

          useService(loginService, {
            controller: serviceController,
          });
        })
        .finally(() => {
          // Try accessing protected route
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST')
            .expect(401)
            .then((res) => {
              // Login
              supertest(context.getData('default', 'express'))
                .post('/___service/default/LOGIN')
                .expect(200)
                .then((res) => {
                  const token = res.body.meta.token;
                  // Access the protected route again with token
                  supertest(context.getData('default', 'express'))
                    .post('/___service/default/TEST')
                    .set('Authorization', token)
                    .expect(200)
                    .then((res) => {
                      expect(res.body.meta.message).toStrictEqual(
                        'This is from meta'
                      );
                      expect(res.body.meta.user.name).toStrictEqual('John');
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });

    test('should say 403 when user name is not John', (done) => {
      const loginService = defineService('LOGIN', (opts) => {
        opts.defineLogic((opts) => {
          return opts.success({
            token: opts.security.jwt.sign({
              _id: 'u-100',
              name: 'Sam',
              email: 'john@doe.com',
              role: 'STANDARD_USER',
            }),
          });
        });
      });

      const testService = defineService('TEST', (opts) => {
        opts.defineRule((opts) => {
          if (opts.args.isAuthenticated) {
            opts.allowPolicy('SAMPLE_POLICY');
          }
        });
        opts.defineLogic((opts) => {
          return opts.success({
            message: 'This is from meta',
            user: opts.args.user,
          });
        });
      });

      const context = new ApplicationContext();
      const serviceController = new ServiceController();
      context
        .activate(({ use }) => {
          const { useService } = use(Backend);
          const { enableAuth, definePolicyExtractor } = use(Security);

          enableAuth({
            jwtSecretKey: 'my_secret_123',
          });

          definePolicyExtractor('global', (args) => {
            if (args.isAuthenticated === true) {
              if (args.user.name === 'John') {
                return ['SAMPLE_POLICY'];
              }
            }
          });

          useService(testService, {
            controller: serviceController,
            policyExtractorRefs: ['global'],
          });

          useService(loginService, {
            controller: serviceController,
          });
        })
        .finally(() => {
          // Try accessing protected route
          supertest(context.getData('default', 'express'))
            .post('/___service/default/TEST')
            .expect(401)
            .then((res) => {
              // Login
              supertest(context.getData('default', 'express'))
                .post('/___service/default/LOGIN')
                .expect(200)
                .then((res) => {
                  const token = res.body.meta.token;
                  // Access the protected route again with token
                  supertest(context.getData('default', 'express'))
                    .post('/___service/default/TEST')
                    .set('Authorization', token)
                    .expect(403)
                    .then((res) => {
                      expect(res.body.message).toBeTruthy();
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});

describe('Data services', () => {
  const mongod = new MongoMemoryServer();
  let testDbConnectionString: string = '';

  beforeAll(async (done) => {
    testDbConnectionString = await mongod.getUri();
    done();
  }, 60000);

  test('useDatabase() fn', (done) => {
    const appContext = new ApplicationContext();
    appContext
      .activate(({ use }) => {
        const { useDatabase } = use(Data);
        useDatabase('default', testDbConnectionString);
      })
      .catch(done)
      .finally(() => {
        // Perform assertion
        appContext.deactivate().then(done);
      });
  });

  test('useModel() fn as remote function', (done) => {
    const appContext = new ApplicationContext();
    appContext
      .activate(({ use, useModule }) => {
        const { useDatabase } = use(Data);
        useDatabase('default', testDbConnectionString);
        useModule('testModule', ({ use, run }) => {
          const { useModel } = use(Data);
          useModel('StudentSchema', {
            name: {
              type: String,
            },
          });
          run(() => {
            const { useModel } = use(Data);
            const StudentSchema = useModel('StudentSchema');
            const newStudent = new StudentSchema({
              name: 'John Doe',
            });
            return newStudent.save();
          });
        });
        useModule('testModule2', ({ runOn }) => {
          runOn('testModule', async ({ use }) => {
            const { useModel } = use(Data);
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
    appContext
      .activate(({ use, useModule }) => {
        const { useDatabase } = use(Data);
        useDatabase('testDb', testDbConnectionString);
        useModule('testModule', ({ use, run }) => {
          const { useModel } = use(Data);
          useModel(
            'ProfileSchema',
            {
              name: {
                type: String,
              },
              age: {
                type: Number,
              },
            },
            'testDb'
          );
          run(() => {
            const { useModel } = use(Data);
            const ProfileSchema = useModel('ProfileSchema');
            const newStudent = new ProfileSchema({
              name: 'John Doe',
              age: 21,
            });
            return newStudent.save();
          });
        });
        useModule('testModule2', ({ runOn }) => {
          runOn('testModule', async ({ use }) => {
            const { useModel } = use(Data);
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

describe('Frontend services', () => {
  let context: ApplicationContext;

  const webApp = createReactApp(({ use }) => {
    const { useComponent, mapRoute } = use(Frontend);
    const TestComp = useComponent('testCompo', () => {
      return <div>Hello</div>;
    });
    mapRoute('/', TestComp);
  });

  beforeEach(() => {
    context = new ApplicationContext();
  });

  test('useWebApp()', (done) => {
    context
      .activate(({ use }) => {
        const { useWebApp, useRoute } = use(Backend);
        const SampleWebApp = useWebApp(
          'sample',
          webApp,
          path.join(__dirname, 'test-template.html')
        );
        useRoute('get', '/', SampleWebApp.render());
      })
      .finally(() => {
        supertest(context.getData('default', 'express'))
          .get('/')
          .then((res) => {
            expect(res.status).toBe(200);
            expect(res.text).toContain('Hello');
            done();
          });
      });
  });
});
