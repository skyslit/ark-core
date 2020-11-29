/* eslint-disable require-jsdoc */
import {
  ApplicationContext,
  ControllerContext,
  createContext,
  createController,
  createPointer,
} from '..';

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
    context.registerPointer('testPointer', TestDataPointer);

    context.activate(({useData}) => {
      const {useModel} = useData();
      const modelId = useModel('hello');
      expect(modelId).toBe('hello - default');

      context.activate(({useData}) => {
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
      }, 'semi');
    });
  });

  test('prevent duplicate pointer registration', () => {
    const context = new ApplicationContext();

    const TestDataPointer = createPointer<TestDataPointerType>((id) => ({
      useData: () => ({
        useModel: (modelId: string) => `${modelId} - ${id}`,
      }),
    }));

    // Register pointer
    context.registerPointer('testPointer', TestDataPointer);
    const t = () => context.registerPointer('testPointer', () => ({}));
    expect(t).toThrowError();
  });

  test('extend registred pointers', () => {
    const context = new ApplicationContext();

    const testDataPointer = createPointer<any>((id) => ({
      sayHello: () => 'hello',
    }));

    // Register pointer
    context.registerPointer('testPointer', testDataPointer);
    context.extendPointer('testPointer', (orginal: any) => {
      return () => ({
        sayHello: () => `${orginal.sayHello()}-modified`,
      });
    });

    const pointers: any =
      context.getPointers('default', new ControllerContext(context));

    expect(pointers.sayHello()).toBe('hello-modified');
  });

  test('use() fn', () => {
    const context = new ApplicationContext();

    // eslint-disable-next-line no-unused-vars
    const TestDataPointer = createPointer<TestDataPointerType>((id) => ({
      useData: () => ({
        useModel: (modelId: string) => `${modelId} - ${id}`,
      }),
    }));

    context.activate(({use}) => {
      const {useData} = use(TestDataPointer);
      const modelId = useData().useModel('use');
      expect(modelId).toBe('use - default');

      context.activate(({use}) => {
        const {useData} = use(TestDataPointer);
        const modelId = useData().useModel('use');
        expect(modelId).toBe('use - sub');
      }, 'sub');
    }, 'default');
  });
});

describe('controller', () => {
  const SampleController = createController(({getInput, setOutput}) => {
    const inputA = getInput('inputA', 'defA');
    const inputB = getInput('inputB', 'defB');
    setOutput('outputA', `${inputA}-O`);
    setOutput('outputB', `${inputB}-O`);
  });

  test('invoke() get / set input / output', (done) => {
    const context = new ApplicationContext();
    context.activate(() => {
      context.activate(({invoke}) => {
        invoke(SampleController, {
          inputB: 'myB',
        }, (v: any) => Object.assign(v,
            {modifiedResponse: `${v.outputA}-${v.outputB}`}))
            .then((v: any) => {
              expect(v.outputA).toBe('defA-O');
              expect(v.outputB).toBe('myB-O');
              expect(v.modifiedResponse).toBe('defA-O-myB-O');
              done();
            });
      }, 'module_1');
    }, 'default');
  });
});

describe('context run / runOn', () => {
  test('get / set / exist data', (done) => {
    let existTestData: boolean = false;
    let existMockData: boolean = false;
    const appPackage = createContext(({useModule}) => {
      useModule('sample', ({setData, getData}) => {
        setData('testData', 'good');
      });
      useModule('sample', ({existData, getData}) => {
        existTestData = existData('testData');
        existMockData = existData('mockData');
      });
    });
    const context = new ApplicationContext();
    context.activate(appPackage)
        .finally(() => {
          expect(existTestData).toEqual(true);
          expect(existMockData).toEqual(false);
          done();
        });
  });

  test('multiple runs', (done) => {
    const output: number[] = [];
    const appPackage = createContext(({run}) => {
      run(() => output.push(1));
      run(() => output.push(2));
      run(() => output.push(3));
      run(() => output.push(5));
      run(() => output.push(4));
    });
    const context = new ApplicationContext();
    context.activate(appPackage).finally(() => {
      expect(output).toEqual([1, 2, 3, 5, 4]);
      expect(output).not.toEqual([1, 2, 3, 4, 5]);
      done();
    });
  });

  test('runOn fn', (done) => {
    const output: number[] = [];
    const appPackage = createContext(({run, useModule}) => {
      run(() => output.push(1));
      run(() => output.push(2));

      useModule('testModule', (testModuleProps) => {
        testModuleProps.setData('testModuleIndexNumber', 420);
      });

      useModule('diffModule', (diffModule) => {
        diffModule.run(() => {
          output.push(11);
        });
        diffModule.runOn('testModule', (testModuleProps) => {
          const dataFromRemoteModule =
            <number>testModuleProps.getData('testModuleIndexNumber');
          output.push(dataFromRemoteModule);
        });
      });

      run(() => output.push(3));
      run(() => output.push(5));
      run(() => output.push(4));
    });
    const context = new ApplicationContext();
    context.activate(appPackage).finally(() => {
      expect(output).toEqual([1, 2, 11, 420, 3, 5, 4]);
      expect(output).not.toEqual([1, 2, 3, 5, 4]);
      done();
    });
  });
});
