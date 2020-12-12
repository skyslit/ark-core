import React from 'react';
import {render, cleanup} from '@testing-library/react';
import {
  ApplicationContext,
  createContext,
  createModule,
} from '@skyslit/ark-core';
import {
  createReactApp,
  Frontend,
  createComponent,
  makeApp,
  extractRef,
} from '../index';

// eslint-disable-next-line no-unused-vars
type TestPropType = {
  hello: string
};
const TestComponent = createComponent<TestPropType>((props) => {
  const [sample, setSample] = React.useState('Click Action');
  return (
    <div className={props.hello}>
      <button onClick={() =>
        setSample('Click Action Result')}>Click Me!</button>
      <span>{sample}</span>
    </div>
  );
});

describe('extractRef()', () => {
  test('should extract info from relative address', () => {
    const data = extractRef('hello', 'default');
    expect(data.moduleName).toBe('default');
    expect(data.refId).toBe('hello');
  });

  test('should extract info from absolute address', () => {
    const data = extractRef('test/hello', 'default');
    expect(data.moduleName).toBe('test');
    expect(data.refId).toBe('hello');
  });

  // eslint-disable-next-line max-len
  test('should extract info from absolute address (with multiple parts)', () => {
    const data = extractRef('test/hello/sample', 'default');
    expect(data.moduleName).toBe('test');
    expect(data.refId).toBe('hello/sample');
  });
});

describe('real-world usage', () => {
  afterEach(() => {
    cleanup();
  });

  test('sample-test', (done) => {
    const testModule = createContext(({use}) => {
      const {useComponent} = use(Frontend);
      const App = useComponent('/test', TestComponent);

      const {getByText} = render(<App hello="123" />);
      getByText(/Click Me!/).click();
      expect(getByText(/Click Action/i).textContent)
          .toBe('Click Action Result');
    });

    const app = createReactApp(({useModule}) => {
      useModule('/test', testModule);
    });

    const ctx = new ApplicationContext();
    ctx.activate(app)
        .then(() => {
          setTimeout(() => {
            done();
          }, 1000);
        })
        .catch((er) => {
          done(er);
        });
  });
});

describe('functionality tests', () => {
  let ctx: ApplicationContext;

  beforeEach(() => {
    ctx = new ApplicationContext();
  });

  test('useStore()', (done) => {
    const TestComponent = createComponent(({use}) => {
      const {useStore} = use(Frontend);
      const [data, updateData] = useStore('testData', 'Welcome');
      return (
        <div>
          <p data-testid="msgbox">{data}</p>
          <button onClick={
            () => updateData('Welcome Dameem')
          }>Say Hello</button>
        </div>
      );
    });

    const testModule = createModule(({use}) => {
      const {useComponent} = use(Frontend);
      const TestComp = useComponent('/test-compo', TestComponent);
      const {getByText, getByTestId} = render(<TestComp />);
      // Testing UI change
      expect(getByTestId('msgbox').textContent).toBe('Welcome');
      getByText(/Say Hello/).click();
      expect(getByTestId('msgbox').textContent).toBe('Welcome Dameem');
      // Testing redux state
      expect(ctx.getData<any>('default', 'store')
          .getState()['default/testData'])
          .toBe('Welcome Dameem');
    });

    const testContext = createReactApp(({useModule}) => {
      useModule('/test', testModule);
    });

    makeApp('csr', testContext, ctx)
        .then(() => {
          done();
        })
        .catch(done);
  });


  test('mapRoute()', (done) => {
    const TestComponentA = createComponent(() => {
      return (
        <h1>
          Component A
        </h1>
      );
    });

    const TestComponentB = createComponent(() => {
      return (
        <h1>
          Component B
        </h1>
      );
    });

    const testModuleA = createModule(({use}) => {
      const {useComponent, mapRoute} = use(Frontend);
      const TestCompA = useComponent('test-compo', TestComponentA);
      mapRoute('/test-a', TestCompA);
    });

    const testModuleB = createModule(({use}) => {
      const {useComponent, mapRoute} = use(Frontend);
      const TestCompB = useComponent('test-compo-b', TestComponentB);
      mapRoute('/', TestCompB);
    });

    const testContext = createReactApp(({useModule}) => {
      useModule('modA', testModuleA);
      useModule('modB', testModuleB);
    });

    makeApp('csr', testContext, ctx)
        .then((App) => {
          const {getByText} = render(<App />);
          expect(getByText(/Comp/i).textContent).toBe('Component B');
          done();
        })
        .catch(done);
  });
});
