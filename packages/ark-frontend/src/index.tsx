import React from 'react';
import { createStore, Store } from 'redux';
import {
  ApplicationContext,
  ContextScope,
  ControllerContext,
  createPointer,
  extractRef,
  ServiceResponse,
} from '@skyslit/ark-core';
import axios, { AxiosRequestConfig } from 'axios';
import { HelmetProvider } from 'react-helmet-async';
import {
  BrowserRouter,
  StaticRouter,
  Switch,
  Route,
  RouteProps,
} from 'react-router-dom';

export type RenderMode = 'ssr' | 'csr';

export type ComponentPropType = {
  use: <T extends (...args: any) => any>(creators: T) => ReturnType<T>;
  currentModuleId: string;
  children?: any;
};

type StoreHook = <T>(
  refId: string,
  defaultVal?: T,
  useReactState?: boolean
) => [T, (val: T) => void];
type ServiceHookOptions = {
  serviceId: string;
  useRedux: boolean;
  ajax: AxiosRequestConfig;
};
type ServiceHook<
  T = ServiceResponse<any, any>,
  E = ServiceResponse<any, any>
> = (
  serviceId: string | Partial<ServiceHookOptions>
) => {
  isLoading: boolean;
  response: T;
  err: E;
  invoke: (body?: any) => void;
};

type ContextHook<
  T = ServiceResponse<any, any>,
  E = ServiceResponse<any, any>
> = () => {
  isLoading: boolean;
  response: T;
  err: E;
  invoke: (body?: any) => void;
};

export type ArkReactComponent<T> = (
  props: ComponentPropType & T
) => JSX.Element;

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace Ark {
    // eslint-disable-next-line no-unused-vars
    namespace MERN {
      // eslint-disable-next-line no-unused-vars
      interface React {
        useStore: StoreHook;
        useComponent: <T>(
          refId: string,
          component?: ArkReactComponent<T>
        ) => React.FunctionComponent<T>;
        useService: ServiceHook;
        useContext: ContextHook;
        useLayout: <T>(
          refId: string,
          component?: ArkReactComponent<T>
        ) => React.FunctionComponent<T>;
        mapRoute: (
          path: string,
          component: React.ComponentClass | React.FunctionComponent,
          layoutRefId?: string,
          opts?: RouteProps
        ) => void;
      }
    }
  }
}

const createReducer = (initialState = {}) => (
  state = initialState,
  action: any
) => {
  switch (action.type) {
    case 'SET_ITEM': {
      const { key, value } = action.payload;
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
 * @param {ApplicationContext=} ctx
 * @param {object=} initialState
 * @return {Promise<React.FunctionComponent>}
 */
export function initReactRouterApp(
  scope: ContextScope<any>,
  ctx: ApplicationContext = new ApplicationContext(),
  initialState: { [key: string]: any } = {}
) {
  let reduxDevtoolEnhancer: any = undefined;
  try {
    reduxDevtoolEnhancer =
      (global.window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
      (global.window as any).__REDUX_DEVTOOLS_EXTENSION__();
  } catch (e) {
    /** Do nothing */
  }
  ctx.setData(
    'default',
    'store',
    createStore(createReducer(initialState), reduxDevtoolEnhancer)
  );

  return ctx.activate(scope).then(() => {
    // Extracts all routes from every module
    const routes: any[] = Object.keys(ctx.data).reduce(
      (accumulator, moduleKey) => {
        if (ctx.data[moduleKey]['routes']) {
          return [
            ...accumulator,
            ...Object.keys(ctx.data[moduleKey]['routes']).reduce(
              (accumulator, pathKey) => {
                if (ctx.data[moduleKey]['routes'][pathKey]) {
                  return [
                    ...accumulator,
                    ctx.data[moduleKey]['routes'][pathKey],
                  ];
                }
                return accumulator;
              },
              []
            ),
          ];
        }
        return accumulator;
      },
      []
    );
    return Promise.resolve(routes);
  });
}

type MakeAppOptions = { url: string; initialState?: any };

// eslint-disable-next-line camelcase
declare const ___hydrated_redux___: any;

/**
 * Run react application
 * @param {RenderMode} mode
 * @param {ContextScope<any>} scope
 * @param {ApplicationContext} ctx
 * @param {object=} opts_
 * @return {Promise<React.FunctionComponent>}
 */
export function makeApp(
  mode: RenderMode,
  scope: ContextScope<any>,
  ctx: ApplicationContext = new ApplicationContext(),
  opts_: Partial<MakeAppOptions> = null
): Promise<React.FunctionComponent> {
  const opts: MakeAppOptions = Object.assign<
    MakeAppOptions,
    Partial<MakeAppOptions>
  >(
    {
      url: undefined,
      initialState: {},
    },
    opts_
  );

  if (mode === 'csr') {
    if (!opts.initialState) {
      opts.initialState = {};
    }

    opts.initialState = Object.assign(
      {},
      ___hydrated_redux___,
      opts.initialState
    );
  }

  return initReactRouterApp(scope, ctx, opts.initialState).then(
    (PureAppConfig) => {
      return Promise.resolve(() => {
        const main = useContextCreator(ctx)();
        const context: any = {};

        React.useEffect(() => {
          main.invoke();
        }, []);

        if (!main.response) {
          return <div>Application booting up...</div>;
        }

        let Router: any = BrowserRouter;
        let routerProps: any = {};
        if (mode === 'ssr') {
          Router = StaticRouter;
          routerProps = {
            location: opts ? opts.url : '',
            context,
          };
        }

        return (
          <HelmetProvider>
            <Router {...routerProps}>
              <Switch>
                {PureAppConfig.map((route) => (
                  <Route key={route.path} {...route} />
                ))}
              </Switch>
            </Router>
          </HelmetProvider>
        );
      });
    }
  );
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
  return (props: any) =>
    creator({
      ...props,
      ...{
        use: context.getPointers(ref.moduleName, controller).use,
        currentModuleId: ref.moduleName,
      },
    });
}

/**
 * Create react component
 * @param {ArkReactComponent} component
 * @return {JSX.Element}
 */
export function createComponent<T = {}>(
  component: ArkReactComponent<T>
): ArkReactComponent<T> {
  return component;
}

/**
 * Creates a new react based single page application
 * @param {ContextScope<Partial<Ark.MERN.React>>} fn
 * @return {ContextScope<Partial<Ark.MERN.React>>}
 */
export function createReactApp(fn: ContextScope<any>): ContextScope<any> {
  return fn;
}

const useStoreCreator: (
  moduleId: string,
  ctx: ApplicationContext
) => StoreHook = (moduleId, ctx) => (
  refId,
  defaultVal = null,
  useReactState: boolean = false
) => {
  if (useReactState === false) {
    const ref = extractRef(refId, moduleId);
    const fullyQualifiedRefId = `${ref.moduleName}/${ref.refId}`;
    const store = ctx.getData<Store>('default', 'store');
    const [localStateVal, updateLocalStateVal] = React.useState(
      store.getState()[fullyQualifiedRefId] || defaultVal
    );

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
  } else {
    return React.useState(defaultVal);
  }
};

const getServiceUrl = (modId: string, service: string) =>
  `/___service/${modId}/${service}`;

const useServiceCreator: (
  modId: string,
  ctx: ApplicationContext
) => ServiceHook = (modId, ctx) => (service) => {
  const option: ServiceHookOptions = Object.assign<
    ServiceHookOptions,
    Partial<ServiceHookOptions>
  >(
    {
      useRedux: false,
      serviceId: typeof service === 'string' ? service : undefined,
      ajax: {
        method: 'post',
      },
    },
    typeof service === 'string' ? {} : service
  );

  if (typeof service === 'string') {
    option.ajax.url = getServiceUrl(modId, service);
    option.ajax.method = 'post';
  } else {
    try {
      option.ajax.url = getServiceUrl(modId, service.serviceId);
      if (service.ajax) {
        option.ajax = { ...option.ajax, ...service.ajax };
      }
    } catch (e) {
      console.error(e);
    }
  }

  const [isLoading, setLoading] = useStoreCreator(modId, ctx)<boolean>(
    `IS_LOADING_${option.serviceId}`,
    null,
    !option.useRedux
  );
  const [response, setResponse] = useStoreCreator(modId, ctx)<
    ServiceResponse<any, any>
  >(`RESPONSE_${option.serviceId}`, null, !option.useRedux);
  const [err, setError] = useStoreCreator(modId, ctx)<
    ServiceResponse<any, any>
  >(`ERROR_${option.serviceId}`, null, !option.useRedux);

  return {
    isLoading: isLoading || false,
    response,
    err,
    invoke: (data?: any) => {
      setLoading(true);
      axios(Object.assign(option.ajax, { data }))
        .then((response) => {
          setResponse(response.data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    },
  };
};

const useContextCreator: (context: ApplicationContext) => ContextHook = (
  context: ApplicationContext
) => () => {
  return useServiceCreator(
    'default',
    context
  )({
    serviceId: '___context',
    useRedux: true,
  });
};

export const Frontend = createPointer<Ark.MERN.React>(
  (moduleId, controller, context) => ({
    init: () => {},
    useService: useServiceCreator(moduleId, context),
    useStore: useStoreCreator(moduleId, context),
    useContext: useContextCreator(context),
    useComponent: (refId, componentCreator = null) => {
      return context.useDataFromContext(
        moduleId,
        refId,
        componentCreator
          ? arkToReactComponent(
              componentCreator,
              refId,
              moduleId,
              controller,
              context
            )
          : undefined,
        false,
        'components'
      );
    },
    useLayout: (refId, componentCreator = null) => {
      return context.useDataFromContext(
        moduleId,
        refId,
        componentCreator
          ? arkToReactComponent(
              componentCreator,
              refId,
              moduleId,
              controller,
              context
            )
          : undefined,
        false,
        'layouts'
      );
    },
    mapRoute: (path, Component, layoutRefId = null, opts = {}) => {
      let Layout: any = null;
      if (layoutRefId) {
        Layout = context.take(moduleId, layoutRefId, 'layouts');
      }

      const routes: any = context.getData(moduleId, 'routes', {});
      routes[path] = Object.assign<Partial<RouteProps>, RouteProps>(
        {
          component: Layout
            ? (props: any) => (
                <Layout {...props}>
                  <Component {...props} />
                </Layout>
              )
            : Component,
          path,
        },
        opts
      );
    },
  })
);
