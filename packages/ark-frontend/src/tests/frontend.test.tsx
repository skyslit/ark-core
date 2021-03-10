import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { ApplicationContext, createModule } from '@skyslit/ark-core';
import { useHistory } from 'react-router-dom';
import {
  createReactApp,
  Frontend,
  createComponent,
  makeApp,
  reduxServiceStateSnapshot,
  Routers,
} from '../index';

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

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {},
        }),
      },
    })
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

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {},
        }),
      },
    })
      .then((App) => {
        const { getByText } = render(<App />);
        expect(getByText(/Comp/i).textContent).toBe('Component B');
        done();
      })
      .catch(done);
  });

  test('useRouteConfig() should work as expected', (done) => {
    const TestComponentA = createComponent(() => {
      return <h1>Component A</h1>;
    });

    const TestComponentB = createComponent(() => {
      return <h1>Component B</h1>;
    });

    const Layout = createComponent((props) => {
      return (
        <div>
          <h1>Layout D</h1>
          {props.children}
        </div>
      );
    });

    const testModuleA = createModule(({ use }) => {
      const { useComponent, useLayout } = use(Frontend);
      useComponent('test-compo-a', TestComponentA);
      useLayout('layout-a', Layout);
    });

    const testModuleB = createModule(({ use }) => {
      const { useComponent } = use(Frontend);
      useComponent('test-compo-b', TestComponentB);
    });

    const testContext = createReactApp(({ use, useModule, run }) => {
      const { useRouteConfig, useComponent, useLayout } = use(Frontend);
      useModule('modA', testModuleA);
      useModule('modB', testModuleB);

      useRouteConfig(() => [
        {
          path: '/',
          component: useComponent('modB/test-compo-b'),
          layout: useLayout('modA/layout-a'),
        },
      ]);
    });

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {},
        }),
      },
    })
      .then((App) => {
        const { getByText } = render(<App />);
        // Expect component and layout
        expect(getByText(/Layou/i).textContent).toBe('Layout D');
        expect(getByText(/Comp/i).textContent).toBe('Component B');
        done();
      })
      .catch(done);
  });

  describe('useContent', () => {
    test('useContent', (done) => {
      const createCMSComponent = createComponent(({ use }) => {
        const { useContent } = use(Frontend);
        const {
          isAvailable,
          content,
          setContent,
          updateKey,
          pushItem,
          unshiftItem,
          insertItem,
          hasChanged,
          markAsSaved,
          reset,
          runBatch,
          removeItemAt,
        } = useContent<any>('test-content');
        return (
          <div>
            <div>Hello</div>
            <button
              onClick={() => {
                reset();
              }}
            >
              Reset
            </button>
            <button
              onClick={() => {
                markAsSaved();
              }}
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                updateKey('title', 'Sample Updated Title');
              }}
            >
              Update Title
            </button>
            <button
              onClick={() => {
                pushItem('items', 4);
              }}
            >
              Push to Items Array
            </button>
            <button
              onClick={() => {
                unshiftItem('items', 0);
              }}
            >
              Unshift Items Array
            </button>
            <button
              onClick={() => {
                insertItem('items', 3, 2.5);
              }}
            >
              Insert val to items at index 3
            </button>
            <button
              onClick={() => {
                updateKey(
                  'innerObj.collection.0.subTitle',
                  'Collection Sub Title (changed)'
                );
              }}
            >
              Update content inside
            </button>
            <button
              onClick={() => {
                runBatch(() => {
                  updateKey('keyA', 100);
                  updateKey('keyB', 200);
                });
              }}
            >
              Update multiple key
            </button>
            <button
              onClick={() => {
                runBatch(() => {
                  removeItemAt('itemsToRemoveFrom', 3);
                });
              }}
            >
              Remove item at index 3
            </button>
            <button
              onClick={() =>
                setContent({
                  title: 'Sample',
                  keyA: 1,
                  keyB: 2,
                  items: [1, 2, 3],
                  itemsToRemoveFrom: ['a', 'b', 'c', 'd', 'e'],
                  innerObj: {
                    collection: [
                      {
                        subTitle: 'Collection Sub Title',
                      },
                    ],
                  },
                })
              }
            >
              Set Content
            </button>
            <div data-testid="changed-field">{String(Boolean(hasChanged))}</div>
            <div data-testid="output">
              {isAvailable === true ? (
                <code>{JSON.stringify(content)}</code>
              ) : null}
            </div>
          </div>
        );
      });

      const testContext = createReactApp(({ use }) => {
        const { useComponent, useRouteConfig } = use(Frontend);
        const CMS = useComponent('cms', createCMSComponent);

        useRouteConfig(() => [
          {
            path: '/',
            component: CMS,
          },
        ]);
      });

      makeApp('csr', testContext, ctx, {
        initialState: {
          ...reduxServiceStateSnapshot('___context', 'default', {
            responseCode: 200,
            response: {},
          }),
        },
      })
        .then(async (App) => {
          const { getByText, getByTestId } = render(<App />);

          expect(getByTestId('output').innerHTML).toBe('');

          // Has changed field
          expect(getByTestId('changed-field').textContent).toEqual('false');

          act(() => {
            // Sets content
            getByText('Set Content').click();
          });

          expect(getByTestId('changed-field').textContent).toEqual('false');

          // Assert title
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).title
          ).toEqual('Sample');

          act(() => {
            // Click update title
            getByText('Update Title').click();
          });

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('true');

          // Mark as save
          act(() => {
            getByText('Save Changes').click();
          });

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('false');

          // Check if title has been changed
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).title
          ).toEqual('Sample Updated Title');

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('false');

          act(() => {
            // Click Push to Items Array
            getByText('Push to Items Array').click();
          });

          // Check if items has been changed
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).items
          ).toEqual([1, 2, 3, 4]);

          act(() => {
            // Click unshift button
            getByText('Unshift Items Array').click();
          });

          // Check if items has been changed
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).items
          ).toEqual([0, 1, 2, 3, 4]);

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('true');

          // Mark as save
          act(() => {
            getByText('Save Changes').click();
          });

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('false');

          act(() => {
            // Click `Insert val to items at index 3` button
            getByText('Insert val to items at index 3').click();
          });

          // Check if items has been changed
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).items
          ).toEqual([0, 1, 2, 2.5, 3, 4]);

          // Mark as save
          act(() => {
            getByText('Save Changes').click();
          });

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('false');

          act(() => {
            // Click `Update content inside` button
            getByText('Update content inside').click();
          });

          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).innerObj.collection[0].subTitle
          ).toEqual('Collection Sub Title (changed)');

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('true');

          act(() => {
            getByText('Reset').click();
          });

          // Content has changed
          expect(getByTestId('changed-field').textContent).toEqual('false');

          // Try again after clicking reset
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).innerObj.collection[0].subTitle
          ).toEqual('Collection Sub Title');

          act(() => {
            // Click `Update multiple key` button
            getByText('Update multiple key').click();
          });

          // Check if keyA and keyB are updated
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).keyA
          ).toEqual(100);
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).keyB
          ).toEqual(200);

          // Expect items before removal
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).itemsToRemoveFrom
          ).toEqual(['a', 'b', 'c', 'd', 'e']);

          act(() => {
            // Click `Remove item at index 3` button
            getByText('Remove item at index 3').click();
          });

          // Expect item to be removed
          expect(
            JSON.parse(
              getByTestId('output').getElementsByTagName('code')[0].textContent
            ).itemsToRemoveFrom
          ).toEqual(['a', 'b', 'c', 'e']);
        })
        .then(() => {
          done();
        })
        .catch(done);
    });
  });
});

describe('predefined Routers', () => {
  const LoginPage = createComponent(() => {
    return <h1>Login Page</h1>;
  });

  const Dashboard = createComponent(() => {
    return <h1>Dashboard</h1>;
  });

  const Layout = createComponent((props) => {
    const history = useHistory();
    return (
      <div>
        <span>P: {history.location.pathname}</span>
        <h1>Layout D</h1>
        {props.children}
      </div>
    );
  });

  test('should take to login page when not authenticated', (done) => {
    const ctx = new ApplicationContext();

    const testContext = createReactApp(({ use }) => {
      const { useRouteConfig, useComponent, useLayout } = use(Frontend);

      useComponent('dashboard-page', Dashboard);
      useComponent('login-page', LoginPage);
      useLayout('layout-a', Layout);

      useComponent('ProtectedRoute', Routers.ProtectedRoute);
      useComponent('AuthRoute', Routers.AuthRoute);

      useRouteConfig(() => [
        {
          path: '/auth/login',
          component: useComponent('login-page'),
          layout: useLayout('layout-a'),
          exact: true,
          Route: useComponent('AuthRoute'),
        },
        {
          path: '/',
          component: useComponent('dashboard-page'),
          layout: useLayout('layout-a'),
          Route: useComponent('ProtectedRoute'),
        },
      ]);
    });

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {
            meta: {
              isAuthenticated: false,
            },
          },
        }),
      },
    })
      .then((App) => {
        const { getByText } = render(<App />);
        // Expect component and layout
        expect(getByText(/Layou/i).textContent).toBe('Layout D');
        expect(getByText(/Login Page/i).textContent).toBe('Login Page');
        done();
      })
      .catch(done);
  });

  test('should take to dashboard page when authenticated', (done) => {
    const ctx = new ApplicationContext();

    const testContext = createReactApp(({ use }) => {
      const { useRouteConfig, useComponent, useLayout } = use(Frontend);

      useComponent('dashboard-page', Dashboard);
      useComponent('login-page', LoginPage);
      useLayout('layout-a', Layout);

      useComponent('ProtectedRoute', Routers.ProtectedRoute);
      useComponent('AuthRoute', Routers.AuthRoute);

      useRouteConfig(() => [
        {
          path: '/auth/login',
          component: useComponent('login-page'),
          layout: useLayout('layout-a'),
          exact: true,
          Route: useComponent('AuthRoute'),
        },
        {
          path: '/',
          component: useComponent('dashboard-page'),
          layout: useLayout('layout-a'),
          Route: useComponent('ProtectedRoute'),
        },
      ]);
    });

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {
            meta: {
              isAuthenticated: true,
            },
          },
        }),
      },
    })
      .then((App) => {
        const { getByText } = render(<App />);
        // Expect component and layout
        expect(getByText(/Layou/i).textContent).toBe('Layout D');
        expect(getByText(/Dash/i).textContent).toBe('Dashboard');
        done();
      })
      .catch(done);
  });

  test('should take to custom login url', (done) => {
    const ctx = new ApplicationContext();

    const testContext = createReactApp(({ use }) => {
      const { useRouteConfig, useComponent, useLayout, configureAuth } = use(
        Frontend
      );

      useComponent('dashboard-page', Dashboard);
      useComponent('login-page', LoginPage);
      useLayout('layout-a', Layout);

      useComponent('ProtectedRoute', Routers.ProtectedRoute);
      useComponent('AuthRoute', Routers.AuthRoute);

      configureAuth({
        loginPageUrl: '/custom/auth/login',
        defaultProtectedUrl: '/',
      });

      useRouteConfig(() => [
        {
          path: '/custom/auth/login',
          component: useComponent('login-page'),
          layout: useLayout('layout-a'),
          exact: true,
          Route: useComponent('AuthRoute'),
        },
        {
          path: '/',
          component: useComponent('dashboard-page'),
          layout: useLayout('layout-a'),
          Route: useComponent('ProtectedRoute'),
          exact: true,
        },
      ]);
    });

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {
            meta: {
              isAuthenticated: false,
            },
          },
        }),
      },
    })
      .then((App) => {
        const { getByText } = render(<App />);
        // Expect component and layout
        expect(getByText(/Layou/i).textContent).toBe('Layout D');
        expect(getByText(/Login Page/i).textContent).toBe('Login Page');
        done();
      })
      .catch(done);
  });

  test('should take to custom default url', (done) => {
    const ctx = new ApplicationContext();

    const testContext = createReactApp(({ use }) => {
      const { useRouteConfig, useComponent, useLayout, configureAuth } = use(
        Frontend
      );

      useComponent('dashboard-page', Dashboard);
      useComponent('login-page', LoginPage);
      useLayout('layout-a', Layout);

      useComponent('ProtectedRoute', Routers.ProtectedRoute);
      useComponent('AuthRoute', Routers.AuthRoute);

      configureAuth({
        loginPageUrl: '/custom/auth/login',
        defaultProtectedUrl: '/custom-landing',
      });

      useRouteConfig(() => [
        {
          path: '/custom/auth/login',
          component: useComponent('login-page'),
          layout: useLayout('layout-a'),
          exact: true,
          Route: useComponent('AuthRoute'),
        },
        {
          path: '/custom-landing',
          component: useComponent('dashboard-page'),
          layout: useLayout('layout-a'),
          Route: useComponent('ProtectedRoute'),
          exact: true,
        },
      ]);
    });

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {
            meta: {
              isAuthenticated: true,
            },
          },
        }),
      },
    })
      .then((App) => {
        const { getByText } = render(<App />);
        // Expect component and layout
        expect(getByText(/Layou/i).textContent).toBe('Layout D');
        expect(getByText(/Dashboard/i).textContent).toBe('Dashboard');
        done();
      })
      .catch(done);
  });
});

describe('useVolumeAccessPoint()', () => {
  test('general tests', (done) => {
    const ctx = new ApplicationContext();

    let valFromDefault: string = null;
    let valFromTestModule: string = null;
    let valFromTestModuleFromDefault: string = null;

    const testContext = createReactApp(({ use, useModule }) => {
      const { useVolumeAccessPoint } = use(Frontend);

      const accessPointFromDefault = useVolumeAccessPoint('testAP');
      valFromDefault = accessPointFromDefault.getUrl('file');

      useModule('testModule', ({ use }) => {
        const { useVolumeAccessPoint } = use(Frontend);

        const accessPointFromTest = useVolumeAccessPoint('testAP');
        valFromTestModule = accessPointFromTest.getUrl('file');

        const accessPointTestModuleFromDefault = useVolumeAccessPoint(
          'default/testAP'
        );
        valFromTestModuleFromDefault = accessPointTestModuleFromDefault.getUrl(
          'file'
        );
      });
    });

    makeApp('csr', testContext, ctx, {
      initialState: {
        ...reduxServiceStateSnapshot('___context', 'default', {
          responseCode: 200,
          response: {
            meta: {
              isAuthenticated: false,
            },
          },
        }),
      },
    })
      .then((App) => {
        render(<App />);
        expect(valFromDefault).toStrictEqual('/volumes/default/testAP/file');
        expect(valFromTestModule).toStrictEqual(
          '/volumes/testModule/testAP/file'
        );
        expect(valFromTestModuleFromDefault).toStrictEqual(valFromDefault);
        done();
      })
      .catch(done);
  });
});
