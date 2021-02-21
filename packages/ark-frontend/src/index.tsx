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
  Redirect,
} from 'react-router-dom';
import ReactDOMServer from 'react-dom/server';
import traverse from 'traverse';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

export type RenderMode = 'ssr' | 'csr';

axios.defaults.withCredentials = true;

export type ComponentPropType = {
  use: <T extends (...args: any) => any>(creators: T) => ReturnType<T>;
  currentModuleId: string;
  children?: any;
} & { [key: string]: any };

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
type ServiceInvokeOptions = {
  force: boolean;
};
type ServiceHook<T = ServiceResponse<any, any>, E = Error> = (
  serviceId: string | Partial<ServiceHookOptions>
) => {
  statusCode: number;
  hasInitialized: boolean;
  isLoading: boolean;
  response: T;
  err: E;
  invoke: (body?: any, opts?: Partial<ServiceInvokeOptions>) => Promise<any>;
};

type ContextHook<T = ServiceResponse<any, any>, E = Error> = () => {
  statusCode: number;
  hasInitialized: boolean;
  isLoading: boolean;
  response: T;
  err: E;
  invoke: (body?: any, opts?: Partial<ServiceInvokeOptions>) => Promise<any>;
};

type ContentHookOptions<T> = {
  serviceId: string;
  defaultContent: T;
  useReduxStore: boolean;
};
type ContentHook = <T>(
  serviceId: string | ContentHookOptions<T>
) => {
  isAvailable: boolean;
  hasChanged: boolean;
  content: T;
  runBatch: (fn: () => void) => void;
  markAsSaved: () => void;
  setContent: (content: T) => void;
  updateKey: (key: string, val: T) => void;
  pushItem: (key: string, val: any) => void;
  unshiftItem: (key: string, val: any) => void;
  removeItemAt: (key: string, index: any) => void;
  insertItem: (key: string, indexToInsert: number, val: any) => void;
  reset: () => void;
};

type MapRoute = (
  path: string,
  component: React.ComponentClass | React.FunctionComponent,
  layoutRefId?: string,
  opts?: RouteProps
) => void;

type RouteConfigItem = {
  layout?: any;
  Route?: 'public' | 'auth' | 'protected' | React.FunctionComponent<{}>;
} & RouteProps;

export type ArkReactComponent<T> = (
  props: ComponentPropType & T
) => JSX.Element;

export type AuthConfiguration = {
  loginPageUrl: string;
  defaultProtectedUrl: string;
};

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace Ark {
    // eslint-disable-next-line no-unused-vars
    namespace MERN {
      // eslint-disable-next-line no-unused-vars
      interface React {
        useStore: StoreHook;
        useComponent: <T = any>(
          refId: string,
          component?: ArkReactComponent<T>
        ) => React.FunctionComponent<T>;
        useService: ServiceHook;
        useContext: ContextHook;
        useLayout: <T>(
          refId: string,
          component?: ArkReactComponent<T>
        ) => React.FunctionComponent<T>;
        useContent: ContentHook;
        mapRoute: MapRoute;
        useRouteConfig: (configCreator: () => Array<RouteConfigItem>) => void;
        configureAuth: (opts: AuthConfiguration) => void;
        useAuthConfiguration: () => AuthConfiguration;
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
    const routes = ctx.getData<RouteConfigItem[]>(
      'default',
      'routeConfigs',
      []
    );
    return Promise.resolve(routes);
  });
}

type MakeAppOptions = { url: string; initialState?: any };

// eslint-disable-next-line camelcase
declare const ___hydrated_redux___: any;

/**
 * Render react to string
 * @param {any} Component
 * @return {string}
 */
export function renderToString(Component: any) {
  return ReactDOMServer.renderToString(<Component />);
}

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

    try {
      opts.initialState = Object.assign(
        {},
        ___hydrated_redux___,
        opts.initialState
      );
    } catch (e) {
      /** Do nothing */
    }
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
                {PureAppConfig.map((config) => {
                  let RouteComponent: any;

                  if (!config.Route) {
                    config.Route = 'public';
                  }

                  if (config.Route === 'auth') {
                    RouteComponent = (props: any) => (
                      <Routers.AuthRoute
                        {...props}
                        redirectUrl={'/'}
                        isAuthenticated={main.response.meta.isAuthenticated}
                      />
                    );
                  } else if (config.Route === 'protected') {
                    RouteComponent = (props: any) => (
                      <Routers.ProtectedRoute
                        {...props}
                        loginUrl={'/auth/login'}
                        isAuthenticated={main.response.meta.isAuthenticated}
                      />
                    );
                  } else if (config.Route === 'public') {
                    RouteComponent = Route;
                  } else {
                    RouteComponent = config.Route;
                  }

                  const _props = config;
                  return <RouteComponent key={config.path} {..._props} />;
                })}
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

/**
 * Creates a fully qualified ref id
 * @param {string} refId
 * @param {string} moduleId
 * @return {string}
 */
export function getFullyQualifiedReduxRefId(
  refId: string,
  moduleId: string
): string {
  return `${moduleId}/${refId}`;
}

/**
 * Creates a redux snapshot object
 * @param {string} refId
 * @param {string} moduleId
 * @param {any} val
 * @return {object}
 */
export function reduxStateSnapshot(
  refId: string,
  moduleId: string,
  val: any
): object {
  const ref = extractRef(refId, moduleId);
  return {
    [getFullyQualifiedReduxRefId(ref.refId, ref.moduleName)]: val,
  };
}

/**
 * Creates service state from backend
 * @param {string} serviceRefId
 * @param {string} moduleId
 * @param {any} stat
 * @return {object}
 */
export function reduxServiceStateSnapshot(
  serviceRefId: string,
  moduleId: string,
  stat: any
): object {
  const ref = extractRef(serviceRefId, moduleId);
  return {
    ...reduxStateSnapshot(`HAS_INITIALIZED_${ref.refId}`, moduleId, true),
    ...reduxStateSnapshot(`IS_LOADING_${ref.refId}`, moduleId, false),
    ...reduxStateSnapshot(
      `RESPONSE_${ref.refId}`,
      moduleId,
      stat.responseCode === 200 ? stat.response : null
    ),
    ...reduxStateSnapshot(
      `ERROR_${ref.refId}`,
      moduleId,
      stat.responseCode !== 200 ? stat.response : null
    ),
  };
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
    const fullyQualifiedRefId = getFullyQualifiedReduxRefId(
      ref.refId,
      ref.moduleName
    );
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

      return unsubscribe;
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

  const [hasInitialized, setHasInitialized] = useStoreCreator(
    modId,
    ctx
  )<boolean>(`HAS_INITIALIZED_${option.serviceId}`, null, !option.useRedux);
  const [isLoading, setLoading] = useStoreCreator(modId, ctx)<boolean>(
    `IS_LOADING_${option.serviceId}`,
    null,
    !option.useRedux
  );
  const [response, setResponse] = useStoreCreator(modId, ctx)<
    ServiceResponse<any, any>
  >(`RESPONSE_${option.serviceId}`, null, !option.useRedux);
  const [err, setError] = useStoreCreator(modId, ctx)<Error>(
    `ERROR_${option.serviceId}`,
    null,
    !option.useRedux
  );
  const [statusCode, setStatusCode] = useStoreCreator(modId, ctx)<number>(
    `STATUS_CODE_${option.serviceId}`,
    null,
    !option.useRedux
  );

  return {
    hasInitialized: hasInitialized || false,
    isLoading: isLoading || false,
    response,
    err,
    statusCode,
    invoke: (data?, opts_?) => {
      return new Promise((resolve, reject) => {
        const opts: ServiceInvokeOptions = Object.assign<
          ServiceInvokeOptions,
          Partial<ServiceInvokeOptions>
        >(
          {
            force: false,
          },
          opts_
        );

        if (hasInitialized !== true || opts.force === true) {
          setStatusCode(-1);
          setLoading(true);
          setError(null);
          setResponse(null);
          axios(Object.assign(option.ajax, { data }))
            .then((response) => {
              setStatusCode(response.status);
              setHasInitialized(true);
              setResponse(response.data);
              setLoading(false);
              resolve(response.data);
            })
            .catch((err) => {
              let statusCodeVal = 500;
              let errObj = err;
              // Fix: API error is not visible in redux state
              try {
                if (err.response) {
                  statusCodeVal = err.response.status;
                  errObj = err.response.data;
                }
              } catch (e) {
                // Do nothing
              }
              setError(errObj);
              setStatusCode(statusCodeVal);
              setLoading(false);
              reject(errObj);
            });
        } else {
          resolve(false);
        }
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

const mapRouteCreator = (
  moduleId: string,
  context: ApplicationContext
): MapRoute => (path, Component, layoutRefId = null, opts = {}) => {
  let Layout: any = null;
  if (layoutRefId) {
    Layout = context.take(moduleId, layoutRefId, 'layouts');
  }

  const routeConfigs = context.getData<RouteConfigItem[]>(
    'default',
    'routeConfigs',
    []
  );
  routeConfigs.push({
    path,
    component: Layout
      ? (props: any) => (
          <Layout {...props}>
            <Component {...props} />
          </Layout>
        )
      : Component,
    ...opts,
  });
};

export const Routers = {
  ProtectedRoute: createComponent(
    ({ component, use, currentModuleId, children, ...rest }) => {
      const { useContext, useAuthConfiguration } = use(Frontend);
      const { hasInitialized, isLoading, response } = useContext();
      const { loginPageUrl } = useAuthConfiguration();

      let isAuthenticated: boolean = false;
      try {
        if (hasInitialized === true && isLoading === false) {
          if (response) {
            isAuthenticated = response.meta.isAuthenticated;
          }
        }
      } catch (e) {
        /** Do nothing */
      }

      const Component: any = component;
      return (
        <Route
          {...rest}
          render={({ location }) =>
            isAuthenticated === true ? (
              <Component {...rest} />
            ) : (
              <Redirect
                to={{
                  pathname: loginPageUrl,
                  state: { from: location },
                }}
              />
            )
          }
        />
      );
    }
  ),
  AuthRoute: createComponent(
    ({ component, use, currentModuleId, children, ...rest }) => {
      const { useContext, useAuthConfiguration } = use(Frontend);
      const { hasInitialized, isLoading, response } = useContext();
      const { defaultProtectedUrl } = useAuthConfiguration();

      let isAuthenticated: boolean = false;
      try {
        if (hasInitialized === true && isLoading === false) {
          if (response) {
            isAuthenticated = response.meta.isAuthenticated;
          }
        }
      } catch (e) {
        /** Do nothing */
      }

      const Component: any = component;
      return (
        <Route
          {...rest}
          render={({ location }) =>
            !isAuthenticated ? (
              <Component {...rest} />
            ) : (
              <Redirect
                to={{
                  pathname: defaultProtectedUrl,
                  state: { from: location },
                }}
              />
            )
          }
        />
      );
    }
  ),
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
    mapRoute: mapRouteCreator(moduleId, context),
    useRouteConfig: (configCreator) => {
      controller.ensureInitializing();
      controller.run(() => {
        const routeConfigs = context.getData<RouteConfigItem[]>(
          'default',
          'routeConfigs',
          []
        );
        routeConfigs.push(
          ...configCreator().map((item) => {
            const RawComponent = item.component;
            item.component = item.layout
              ? (props: any) => (
                  <item.layout {...props}>
                    <RawComponent {...props} />
                  </item.layout>
                )
              : item.component;
            return item;
          })
        );
      });
    },
    useContent: (opts_) => {
      const opts: ContentHookOptions<any> = Object.assign<
        ContentHookOptions<any>,
        ContentHookOptions<any>
      >(
        {
          serviceId: typeof opts_ === 'string' ? opts_ : undefined,
          defaultContent: undefined,
          useReduxStore: false,
        },
        typeof opts_ === 'object' ? opts_ : undefined
      );

      const useStore = useStoreCreator(moduleId, context);
      const [baseContent, setBaseContent] = useStore<any>(
        `_cmsHook/_base_${opts.serviceId}`,
        opts.defaultContent,
        opts.useReduxStore === false
      );
      const [content, setContentToState] = useStore<any>(
        `_cmsHook/${opts.serviceId}`,
        opts.defaultContent,
        opts.useReduxStore === false
      );
      const [hasChanged, setHasChanged] = useStore<boolean>(
        `_cmsHook/_changed_${opts.serviceId}`,
        false,
        opts.useReduxStore === false
      );

      React.useEffect(() => {
        setHasChanged(isEqual(baseContent, content) === false);
      }, [baseContent, content]);

      const getCurrentValByKey = (key: string) => {
        const traverseResult = traverse(content);
        return traverseResult.get(key.split('.'));
      };

      let isBatchModeEnabled: boolean = false;
      let batchContent: any = null;

      const updateKey = (key: string, val: any) => {
        let latest: any = null;

        if (isBatchModeEnabled === true) {
          latest = batchContent;
        } else {
          latest = cloneDeep(content);
        }

        const traverseResult = traverse(latest);
        const paths = traverseResult.paths().filter((p) => p.length > 0);
        let i = 0;
        for (i = 0; i < paths.length; i++) {
          const address = paths[i].join('.');
          if (address === key) {
            traverseResult.set(paths[i], val);
            break;
          }
        }

        if (isBatchModeEnabled === true) {
          batchContent = latest;
        } else {
          setContentToState(latest);
        }
      };

      return {
        isAvailable: content !== null && content !== undefined,
        hasChanged,
        content,
        runBatch: (fn: () => void) => {
          isBatchModeEnabled = true;
          batchContent = cloneDeep(content);
          fn && fn();
          isBatchModeEnabled = false;
          setContentToState(batchContent);
          batchContent = null;
        },
        reset: () => {
          setContentToState(baseContent);
          setHasChanged(false);
        },
        setContent: (val) => {
          setContentToState(val);
          setBaseContent(val);
          setHasChanged(false);
        },
        markAsSaved: () => {
          setBaseContent(content);
          setHasChanged(false);
        },
        insertItem: (key, indexToInsert, val) => {
          const item = getCurrentValByKey(key);
          if (Array.isArray(item)) {
            updateKey(key, [
              ...item.slice(0, indexToInsert),
              val,
              ...item.slice(indexToInsert, item.length),
            ]);
          } else {
            throw new Error(
              `${key} is not an array. pushItem can be only called upon an array`
            );
          }
        },
        pushItem: (key, val) => {
          const item = getCurrentValByKey(key);
          if (Array.isArray(item)) {
            updateKey(key, [...item, val]);
          } else {
            throw new Error(
              `${key} is not an array. pushItem can be only called upon an array`
            );
          }
        },
        unshiftItem: (key, val) => {
          const item = getCurrentValByKey(key);
          if (Array.isArray(item)) {
            updateKey(key, [val, ...item]);
          } else {
            throw new Error(
              `${key} is not an array. unshiftItem can be only called upon an array`
            );
          }
        },
        removeItemAt: (key, index) => {
          const item = getCurrentValByKey(key);
          if (Array.isArray(item)) {
            updateKey(
              key,
              item.filter((x, i) => i !== index)
            );
          } else {
            throw new Error(
              `${key} is not an array. unshiftItem can be only called upon an array`
            );
          }
        },
        updateKey,
      };
    },
    configureAuth: (opts) => {
      controller.ensureInitializing();
      context.setData<AuthConfiguration>('default', 'authOptions', opts);
    },
    useAuthConfiguration: () => {
      return context.getData<AuthConfiguration>('default', 'authOptions', {
        loginPageUrl: '/auth/login',
        defaultProtectedUrl: '/',
      });
    },
  })
);
