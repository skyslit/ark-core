/* eslint-disable require-jsdoc */
import {ApplicationContext, createPointer} from '..';

interface TestDataPointerType {
    useData: () => {
        useModel: (id: string) => void
    }
}

declare global {
    // eslint-disable-next-line no-unused-vars
    namespace Ark {
        // eslint-disable-next-line no-unused-vars
        interface Pointers extends TestDataPointerType {}
    }
}

describe('application context', () => {
  test('get / set data', () => {
    const context = new ApplicationContext();
    context.setData('test_module', 'test_key', 'test_value');

    const testKeyResult = context.getData('test_module', 'test_key');
    const noKeyResult = context.getData('test_module',
        'test_key2', 'no_match');
    const noIdResult = context.getData('test_module',
        'test_key2', 'no_id_match');

    expect(testKeyResult).toBe('test_value');
    expect(noKeyResult).toBe('no_match');
    expect(noIdResult).toBe('no_id_match');
  });

  test('pointer registration and usage (with promise)', (done) => {
    const context = new ApplicationContext();

    const TestDataPointer = createPointer<TestDataPointerType>((id) => ({
      useData: () => ({
        useModel: (modelId: string) => `${modelId} - ${id}`,
      }),
    }));

    // Register pointer
    context.registerPointer(TestDataPointer);

    context.runOn('default', ({useData}) => {
      const {useModel} = useData();
      const modelId = useModel('hello');
      expect(modelId).toBe('hello - default');

      context.runOn('semi', ({useData}) => {
        const {useModel} = useData();

        const modelId = useModel('hello');
        expect(modelId).toBe('hello - semi');

        (() => new Promise((resolve) => {
          setTimeout(resolve, 300);
        }))().finally(() => {
          const modelId = useModel('hello');
          expect(modelId).toBe('hello - semi');
          done();
        });
      });
    });
  });

  test('use() fn', () => {
    const context = new ApplicationContext();

    // eslint-disable-next-line no-unused-vars
    const TestDataPointer = createPointer<TestDataPointerType>((id) => ({
      useData: () => ({
        useModel: (modelId: string) => `${modelId} - ${id}`,
      }),
    }));

    context.runOn('default', ({use}) => {
      const {useData} = use(TestDataPointer);
      const modelId = useData().useModel('use');
      expect(modelId).toBe('use - default');

      context.runOn('sub', ({use}) => {
        const {useData} = use(TestDataPointer);
        const modelId = useData().useModel('use');
        expect(modelId).toBe('use - sub');
      });
    });
  });
});

describe('real-world usage', () => {
  test('sample', () => {
    const context = new ApplicationContext();
    context.runOn('default', () => {
      context.runOn('module_1', () => {

      });
    });
  });
});
