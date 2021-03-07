import { ContextScope, ApplicationContext } from '@skyslit/ark-core';
import { MongoMemoryServer } from 'mongodb-memory-server';

/* -------------------------------------------------------------------------- */
/*                                 Test Utils                                 */
/* -------------------------------------------------------------------------- */

/**
 * Run test application in singleton context
 * @param {ContextScope<T>} fn
 * @return {Promise<any>}
 */
export function createTestContext(
  fn: ContextScope<void>
): Promise<{ instance: ApplicationContext; app: Express.Application }> {
  const context = new ApplicationContext();
  return context.activate(fn, 'default').then(() => {
    const throwExpressNotInitalisedError = () => {
      throw new Error('Test server requires useBackend() fn');
    };

    try {
      if (!context.data.default.express) {
        throwExpressNotInitalisedError();
      }
    } catch (err) {
      throwExpressNotInitalisedError();
    }
    return {
      app: context.data.default.express,
      instance: context,
    };
  });
}

/**
 * Creates test DB
 * @return {any}
 */
export function createTestDb() {
  const mongod = new MongoMemoryServer();
  return {
    getDbConnectionString: async (otherDbNames?: string) => {
      return await mongod.getUri(otherDbNames);
    },
    stop: async () => {
      await mongod.stop();
    },
  };
}
