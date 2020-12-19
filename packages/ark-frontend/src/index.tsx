import React from 'react';
import {createStore, Store} from 'redux';
import {
  ApplicationContext,
  ContextScope,
  ControllerContext,
  createPointer,
  extractRef,
} from '@skyslit/ark-core';
import {HelmetProvider} from 'react-helmet-async';
import {
  BrowserRouter,
  Switch,
  Route,
  RouteProps,
} from 'react-router-dom';

export type RenderMode = 'ssr' | 'csr';

export type ComponentPropType = {
  use: <T extends (...args: any) => any>
    (creators: T) => ReturnType<T>
  currentModuleId: string
  children?: any
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
        useStore: <T>(refId: string, defaultVal?: T) => [
          T,
          (val: T) => void
        ],
        useComponent: <T>(refId: string, component?: ArkReactComponent<T>) =>
          React.FunctionComponent<T>,
        useLayout: <T>(refId: string, component?: ArkReactComponent<T>) =>
          React.FunctionComponent<T>,
        mapRoute: (
          path: string,
          component: React.ComponentClass | React.FunctionComponent,
          layoutRefId?: string,
          opts?: RouteProps) => void,
      }
    }
  }
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
 * Initializes pure routed app
 * that can be used to render both in browser and node js
 * @param {ContextScope<any>} scope
 * @param {ApplicationContext} ctx
 * @return {Promise<React.FunctionComponent>}
 */
export function initReactRouterApp(
    scope: ContextScope<any>,
    ctx: ApplicationContext = new ApplicationContext()
) {
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
        return Promise.resolve(routes);
      });
}

/**
 * Run react application
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
  return initReactRouterApp(scope, ctx)
      .then((PureAppConfig) => {
        return Promise.resolve(
            () => (
              <HelmetProvider>
                <BrowserRouter>
                  <Switch>
                    {
                      PureAppConfig.map(
                          (route) => <Route key={route.path} {...route} />
                      )
                    }
                  </Switch>
                </BrowserRouter>
              </HelmetProvider>
            )
        );
      });
}

/**
 * Converts Ark Component to Connected React Component
 * @param {ArkReactComponent<any>} creator
 * @param {string} refId
 * @param {string} moduleId
 * @param {ControllerContext<any>} controller
 * @param {ApplicationContext} context
 * @return {React.FunctionComponent} Returns connected react component
 */
export function arkToReactComponent(
    creator: ArkReactComponent<any>,
    refId: string,
    moduleId: string,
    controller: ControllerContext<any>,
    context: ApplicationContext
): React.FunctionComponent<any> {
  if (!creator) {
    throw new Error('creator is required');
  }
  const ref = extractRef(refId, moduleId);
  return (props: any) => creator({...props, ...{
    use: context.getPointers(ref.moduleName, controller).use,
    currentModuleId: ref.moduleName,
  }});
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
  useStore: (refId, defaultVal = null) => {
    const ref = extractRef(refId, moduleId);
    const fullyQualifiedRefId = `${ref.moduleName}/${ref.refId}`;
    const store = context.getData<Store>('default', 'store');
    const [localStateVal, updateLocalStateVal] =
      React.useState(store.getState()[fullyQualifiedRefId] || defaultVal);

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
  useComponent: (refId, componentCreator = null) => {
    return context.useDataFromContext(
        moduleId,
        refId,
      componentCreator ? arkToReactComponent(
          componentCreator,
          refId,
          moduleId,
          controller,
          context
      ) : undefined,
      false,
      'components',
    );
    // findResourceByRef(
    //     'Component',
    //     refId,
    //     moduleId,
    //     context,
    // );
  },
  useLayout: (refId, componentCreator = null) => {
    return context.useDataFromContext(
        moduleId,
        refId,
    componentCreator ? arkToReactComponent(
        componentCreator,
        refId,
        moduleId,
        controller,
        context
    ) : undefined,
    false,
    'layouts',
    );
  //   findResourceByRef(
  //     'Layout',
  //     refId,
  //     moduleId,
  //     context,
  //     componentCreator ? arkToReactComponent(
  //         componentCreator,
  //         refId,
  //         moduleId,
  //         controller,
  //         context
  //     ) : null
  // )
  },
  mapRoute: (path, Component, layoutRefId = null, opts = {}) => {
    let Layout: any = null;
    if (layoutRefId) {
      Layout = context.take(
          moduleId,
          layoutRefId,
          'layouts'
      );
    }

    const routes: any = context.getData(moduleId, 'routes', {});
    routes[path] = Object.assign<Partial<RouteProps>, RouteProps>({
      component: Layout ? (
        (props: any) => (
          <Layout {...props}>
            <Component {...props}/>
          </Layout>
        )
      ) : Component,
      path,
    }, opts);
  },
}));
