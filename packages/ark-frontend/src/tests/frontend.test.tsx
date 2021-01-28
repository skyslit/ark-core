import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ApplicationContext, createModule } from '@skyslit/ark-core';
import { createReactApp, Frontend, createComponent, makeApp } from '../index';

describe('functionality tests', () => {
  let ctx: ApplicationContext;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    ctx = new ApplicationContext();
  });

  test('useStore() should work seemlessly across multiple modules', (done) => {
    const TestComponent = createComponent(({ use }) => {
      const { useStore } = use(Frontend);
      const [data, updateData] = useStore('testData', 'Welcome');
      return (
        <div>
          <p data-testid="msgbox">{data}</p>
          <button onClick={() => updateData('Welcome Dameem')}>
            Say Hello
          </button>
        </div>
      );
    });

    const testModule = createModule(({ use }) => {
      const { useComponent } = use(Frontend);
      const TestComp = useComponent('test-compo', TestComponent);
      const { getByText, getByTestId } = render(<TestComp />);
      // Testing UI change
      expect(getByTestId('msgbox').textContent).toBe('Welcome');
      getByText(/Say Hello/).click();
      expect(getByTestId('msgbox').textContent).toBe('Welcome Dameem');
      // Testing redux state
      expect(
        ctx.getData<any>('default', 'store').getState()['module1/testData']
      ).toBe('Welcome Dameem');
    });

    const TestComponentB = createComponent(({ use }) => {
      const { useStore } = use(Frontend);
      const [data, updateData] = useStore('module1/testData', 'Welcome 2');
      return (
        <div>
          <p data-testid="msgbox2">{data}</p>
          <button onClick={() => updateData('Welcome 2 Again')}>
            Say Hola
          </button>
        </div>
      );
    });

    const testModule2 = createModule(({ use }) => {
      const { useComponent } = use(Frontend);
      const TestComp2 = useComponent('test-compo', TestComponentB);
      const { getByTestId } = render(<TestComp2 />);
      // Testing UI change
      expect(getByTestId('msgbox2').textContent).toBe('Welcome Dameem');
    });

    const testContext = createReactApp(({ useModule }) => {
      useModule('module1', testModule);
      useModule('module2', testModule2);
    });

    makeApp('csr', testContext, ctx)
      .then(() => {
        done();
      })
      .catch(done);
  });

  test('useStore(useReactState = true) should not work across multiple modules', (done) => {
    const TestComponent = createComponent(({ use }) => {
      const { useStore } = use(Frontend);
      const [data, updateData] = useStore('testData', 'Welcome', true);
      return (
        <div>
          <p data-testid="msgbox">{data}</p>
          <button onClick={() => updateData('Welcome Dameem')}>
            Say Hello
          </button>
        </div>
      );
    });

    const testModule = createModule(({ use }) => {
      const { useComponent } = use(Frontend);
      const TestComp = useComponent('test-compo', TestComponent);
      const { getByText, getByTestId } = render(<TestComp />);
      // Testing UI change
      expect(getByTestId('msgbox').textContent).toBe('Welcome');
      getByText(/Say Hello/).click();
      expect(getByTestId('msgbox').textContent).toBe('Welcome Dameem');
      // Testing redux state
      expect(
        ctx.getData<any>('default', 'store').getState()['module1/testData']
      ).toBe(undefined);
    });

    const TestComponentB = createComponent(({ use }) => {
      const { useStore } = use(Frontend);
      const [data, updateData] = useStore(
        'module1/testData',
        'Welcome 2',
        true
      );
      return (
        <div>
          <p data-testid="msgbox2">{data}</p>
          <button onClick={() => updateData('Welcome 2 Again')}>
            Say Hola
          </button>
        </div>
      );
    });

    const testModule2 = createModule(({ use }) => {
      const { useComponent } = use(Frontend);
      const TestComp2 = useComponent('test-compo', TestComponentB);
      const { getByTestId } = render(<TestComp2 />);
      // Testing UI change
      expect(getByTestId('msgbox2').textContent).toBe('Welcome 2');
    });

    const testContext = createReactApp(({ useModule }) => {
      useModule('module1', testModule);
      useModule('module2', testModule2);
    });

    makeApp('csr', testContext, ctx)
      .then(() => {
        done();
      })
      .catch(done);
  });

  // eslint-disable-next-line max-len
  test('useComponent() should work seemlessly across multiple modules', (done) => {
    const TestComponentA = createComponent(({ currentModuleId }) => {
      return <h1>{`Component A ${currentModuleId}`}</h1>;
    });

    const testModuleA = createModule(({ use }) => {
      const { useComponent } = use(Frontend);
      useComponent('test-compo', TestComponentA);
    });

    const testModuleB = createModule(({ use }) => {
      const { useComponent } = use(Frontend);
      let TestCompB: any = null;
      const t = () => (TestCompB = useComponent('test-compo'));
      expect(t).toThrowError();

      TestCompB = useComponent('modA/test-compo');

      const { getByText } = render(<TestCompB />);
      expect(getByText(/Compo/i).textContent).toContain('modA');
    });

    const testContext = createReactApp(({ useModule }) => {
      useModule('modA', testModuleA);
      useModule('modB', testModuleB);
    });

    makeApp('csr', testContext, ctx)
      .then(() => {
        done();
      })
      .catch(done);
  });

  test('useLayout() should work seemlessly across multiple modules', (done) => {
    const TestLayout = createComponent(({ currentModuleId, children }) => {
      return (
        <div>
          <h1>{`Layout A ${currentModuleId}`}</h1>
          {children}
        </div>
      );
    });

    const TestView = createComponent(({ currentModuleId }) => {
      return <h1>{`View A ${currentModuleId}`}</h1>;
    });

    const testModuleA = createModule(({ use }) => {
      const { mapRoute, useComponent } = use(Frontend);
      const TestViewComponent = useComponent('test-view', TestView);

      mapRoute('/', TestViewComponent, 'default/test-compo');
    });

    const testContext = createReactApp(({ use, useModule }) => {
      const { useLayout } = use(Frontend);
      useLayout('test-compo', TestLayout);
      useModule('modA', testModuleA);
    });

    makeApp('csr', testContext, ctx)
      .then((App) => {
        const { getByText } = render(<App />);
        expect(getByText(/View/i).textContent).toBe('View A modA');
        expect(getByText(/Layout/i).textContent).toBe('Layout A default');
        done();
      })
      .catch(done);
  });

  test('mapRoute() should work under BrowserRouter', (done) => {
    const TestComponentA = createComponent(() => {
      return <h1>Component A</h1>;
    });

    const TestComponentB = createComponent(() => {
      return <h1>Component B</h1>;
    });

    const testModuleA = createModule(({ use }) => {
      const { useComponent, mapRoute } = use(Frontend);
      const TestCompA = useComponent('test-compo', TestComponentA);
      mapRoute('/test-a', TestCompA);
    });

    const testModuleB = createModule(({ use }) => {
      const { useComponent, mapRoute } = use(Frontend);
      const TestCompB = useComponent('test-compo-b', TestComponentB);
      mapRoute('/', TestCompB);
    });

    const testContext = createReactApp(({ useModule }) => {
      useModule('modA', testModuleA);
      useModule('modB', testModuleB);
    });

    makeApp('csr', testContext, ctx)
      .then((App) => {
        const { getByText } = render(<App />);
        expect(getByText(/Comp/i).textContent).toBe('Component B');
        done();
      })
      .catch(done);
  });
});
