import React from 'react';
import {createStore, Store} from 'redux';
import {
  ApplicationContext,
  ContextScope,
  createPointer,
} from '@skyslit/ark-core';
import {HelmetProvider} from 'react-helmet-async';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  RouteProps,
} from 'react-router-dom';

export type RenderMode = 'ssr' | 'csr';

export type ComponentPropType = {
  use: <T extends (...args: any) => any>
    (creators: T) => ReturnType<T>
}

export type ArkReactComponent<T> =
  (props: ComponentPropType & T) => JSX.Element;

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace Ark {
    // eslint-disable-next-line no-unused-vars
    namespace MERN {
      // eslint-disable-next-line no-unused-vars
      interface React {
        mapRoute: (
          path: string,
          component: React.ComponentClass | React.FunctionComponent,
          opts?: RouteProps) => void,
        useComponent: <T>(refId: string, component?: ArkReactComponent<T>) =>
          React.FunctionComponent<T>,
        useStore: <T>(refId: string, defaultVal?: T) => [
          T,
          (val: T) => void
        ]
      }
    }
  }
}

type RefInfo = {moduleName: string, refId: string};
/**
 * Extracts reference information
 * @param {string} refId
 * @param {string=} moduleName
 * @return {RefInfo}
 */
export function extractRef(refId: string, moduleName: string): RefInfo {
  const info: RefInfo = {
    moduleName,
    refId,
  };

  if (refId.includes('/')) {
    info.refId = refId.substring(
        refId.indexOf('/') + 1,
        refId.length
    );
    info.moduleName = refId.substring(
        0,
        refId.indexOf('/')
    );
  }

  return info;
}

const createReducer = (initialState = {}) => (
    state = initialState, action: any) => {
  switch (action.type) {
    case 'SET_ITEM': {
      const {key, value} = action.payload;
      return Object.assign({}, state, {
        [key]: value,
      });
    }
    default: {
      return state;
    }
  }
};

/**
 * Run react applicat
 * @param {RenderMode} mode
 * @param {ContextScope<any>} scope
 * @param {ApplicationContext} ctx
 * @return {Promise<React.FunctionComponent>}
 */
export function makeApp(
    mode: RenderMode,
    scope: ContextScope<any>,
    ctx: ApplicationContext = new ApplicationContext()
): Promise<React.FunctionComponent> {
  ctx.setData('default', 'store',
      createStore(createReducer())
  );

  return ctx.activate(scope)
      .then(() => {
        // Extracts all routes from every module
        const routes: any[] = Object.keys(ctx.data)
            .reduce((accumulator, moduleKey) => {
              if (ctx.data[moduleKey]['routes']) {
                return [
                  ...accumulator,
                  ...Object.keys(ctx.data[moduleKey]['routes'])
                      .reduce((accumulator, pathKey) => {
                        if (ctx.data[moduleKey]['routes'][pathKey]) {
                          return [
                            ...accumulator,
                            ctx.data[moduleKey]['routes'][pathKey],
                          ];
                        }
                        return accumulator;
                      }, []),
                ];
              }
              return accumulator;
            }, []);
        return Promise.resolve(
            () => (
              <HelmetProvider>
                <Router>
                  <Switch>
                    {
                      routes.map(
                          (route) => <Route key={route.path} {...route} />
                      )
                    }
                  </Switch>
                </Router>
              </HelmetProvider>
            )
        );
      });
}

/**
 * Create react component
 * @param {ArkReactComponent} component
 * @return {JSX.Element}
 */
export function createComponent<T = {}>(
    component: ArkReactComponent<T>): ArkReactComponent<T> {
  return component;
}

/**
 * Creates a new react based single page application
 * @param {ContextScope<Partial<Ark.MERN.React>>} fn
 * @return {ContextScope<Partial<Ark.MERN.React>>}
 */
export function createReactApp(fn: ContextScope<any>):
  ContextScope<any> {
  return fn;
}

export const Frontend =
createPointer<Ark.MERN.React>((moduleId, controller, context) => ({
  init: () => {},
  mapRoute: (path, component, opts = {}) => {
    const routes: any = context.getData(moduleId, 'routes', {});
    routes[path] = Object.assign<Partial<RouteProps>, RouteProps>({
      component,
      path,
    }, opts);
  },
  useComponent: (refId, componentCreator = null): any => {
    const ref = extractRef(refId, moduleId);
    const components: any = context.getData(ref.moduleName, 'components', {});

    if (componentCreator) {
      components[ref.refId] = (props: any) => componentCreator({...props, ...{
        use: context.getPointers(ref.moduleName, controller).use,
      }});
      return components[ref.refId];
    } else {
      if (components[ref.refId]) {
        return components[ref.refId];
      } else {
        // eslint-disable-next-line max-len
        throw new Error(`Component '${ref.refId}' is not found under module '${ref.moduleName}'`);
      }
    }
  },
  useStore: (refId, defaultVal = null) => {
    const fullyQualifiedRefId = `default/${refId}`;
    const store = context.getData<Store>('default', 'store');
    const [localStateVal, updateLocalStateVal] =
      React.useState(defaultVal);

    React.useEffect(() => {
      const unsubscribe = store.subscribe(() => {
        const updatedVal = store.getState()[fullyQualifiedRefId];
        if (localStateVal !== updatedVal) {
          updateLocalStateVal(updatedVal);
        }
      });

      return () => unsubscribe();
    }, [fullyQualifiedRefId]);

    return [
      localStateVal,
      (value) => {
        store.dispatch({
          type: 'SET_ITEM',
          payload: {
            value,
            key: fullyQualifiedRefId,
          },
        });
      },
    ];
  },
}));
