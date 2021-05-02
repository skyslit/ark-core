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

type TableHookOptions = {
  defaultPageSize?: number;
  defaultPage?: number;
  columns?: any[];
  additionalColumnNames?: string[];
  disableSelect?: boolean;
};

type TableHook = (
  serviceId: string | Partial<ServiceHookOptions & TableHookOptions>
) => {
  onChange: () => void;
  dataSource: any[];
  loading: boolean;
  columns: any[];
  pagination: {
    current: number;
    pageSize: number;
  };
};

type ContentHookOptions<T> = {
  serviceId: string;
  defaultContent: T;
  useReduxStore: boolean;
  enableLocalStorage?: boolean;
};
type ContentHook = <T>(
  serviceId: string | Partial<ContentHookOptions<T>>
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
  saveLocally: () => void;
  hasLocalData: () => boolean;
  reset: () => void;
};

type MapRoute = (
  path: string,
  component: React.ComponentClass | React.FunctionComponent,
  layoutRefId?: string,
  opts?: RouteProps
) => void;

type MenuItem = {
  path: string | string[];
  hasLink?: boolean;
  isFlattened?: boolean;
  label?: string;
  icon?: any;
  extras?: any;
  hideInMenu?: boolean;
};

type MenuItemAddOn = {
  submenu?: Array<SubRouteConfigItem>;
};

type SubRouteConfigItem = {
  layout?: any;
  Route?: 'public' | React.FunctionComponent<{}>;
} & RouteProps &
  MenuItem;

type MenuHookOptions = {
  currentPath: string;
  refId: string;
  itemRenderer: (props?: { data: MenuItem; children?: any }) => JSX.Element;
  groupRenderer: (props?: {
    data: MenuItem & MenuItemAddOn;
    children?: any;
  }) => JSX.Element;
};

type MenuHook = (
  opts: MenuHookOptions
) => {
  menuItems: Array<JSX.Element>;
  activeGroupPath: string;
};

export type RouteConfigItem = SubRouteConfigItem & MenuItemAddOn;

export type ArkReactComponent<T> = (
  props: ComponentPropType & T
) => JSX.Element;

export type AuthConfiguration = {
  loginPageUrl: string;
  defaultProtectedUrl: string;
};

export type AccessPoint = {
  getUrl: (filename: string) => string;
};

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace Ark {
    // eslint-disable-next-line no-unused-vars
    namespace MERN {
      // eslint-disable-next-line no-unused-vars
      interface React {
        renderMode: () => RenderMode;
        useStore: StoreHook;
        useComponent: <T = any>(
          refId: string,
          component?: ArkReactComponent<T>
        ) => React.FunctionComponent<T>;
        useService: ServiceHook;
        useVolumeAccessPoint: (refId: string) => AccessPoint;
        useContext: ContextHook;
        useLayout: <T>(
          refId: string,
          component?: ArkReactComponent<T>
        ) => React.FunctionComponent<T>;
        useContent: ContentHook;
        useTableService: TableHook;
        mapRoute: MapRoute;
        useRouteConfig: (
          ref: string | (() => Array<RouteConfigItem>),
          configCreator?: () => Array<RouteConfigItem>
        ) => void;
        useMenu: MenuHook;
        configureAuth: (opts: AuthConfiguration) => void;
        useAuthConfiguration: () => AuthConfiguration;
        resolveServiceUrl: (serviceId: string, moduleId?: string) => string;
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Utilities                                 */
/* -------------------------------------------------------------------------- */

/**
 * Resolve service Id to URL
 * @param {string} serviceId
 * @param {string} moduleId
 * @return {string}
 */
export function resolveServiceUrl(
  serviceId: string,
  moduleId: string = 'default'
): string {
  return `/___service/${moduleId}/${serviceId}`;
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

type MakeAppOptions = {
  url: string;
  initialState?: any;
  Router?: any;
  routerProps?: any;
};

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
  // Set renderMode flag to context
  ctx.setData('default', '__react___renderMode', mode);

  const opts: MakeAppOptions = Object.assign<
    MakeAppOptions,
    Partial<MakeAppOptions>
  >(
    {
      url: undefined,
      initialState: {},
      Router: BrowserRouter,
      routerProps: {},
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

        let Router: any = opts.Router;
        let routerProps: any = {};

        if (mode === 'ssr') {
          Router = StaticRouter;
          routerProps = {
            location: opts ? opts.url : '',
            context,
          };
        }

        if (opts.routerProps) {
          routerProps = {
            ...routerProps,
            ...opts.routerProps,
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

                  if (config.Route === 'public') {
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
  _modId: string,
  ctx: ApplicationContext
) => ServiceHook = (_modId, ctx) => (service) => {
  let modId = _modId;

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
    const ref = extractRef(service, modId);
    modId = ref.moduleName;
    service = ref.refId;

    option.ajax.url = getServiceUrl(modId, service);
    option.ajax.method = 'post';
  } else {
    const ref = extractRef(service.serviceId, modId);
    modId = ref.moduleName;
    service.serviceId = ref.refId;

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

  const invoke = React.useCallback(
    (data?: any, opts_?: Partial<ServiceInvokeOptions>) => {
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
    [
      option,
      setStatusCode,
      setHasInitialized,
      setResponse,
      setLoading,
      setError,
      hasInitialized,
    ]
  );

  return {
    hasInitialized: hasInitialized || false,
    isLoading: isLoading || false,
    response,
    err,
    statusCode,
    invoke,
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

const useTableServiceCreator: (
  modId: string,
  context: ApplicationContext
) => TableHook = (modId: string, context: ApplicationContext) => (
  serviceId
) => {
  let url: string = null;
  let defaultCurrentPage: number = 1;
  let defaultPageSize: number = 30;
  let disableSelect: boolean = false;
  let columns: any[] = undefined;
  let additionalColumnNames: string[] = undefined;
  let columnsToSelect: string[] = undefined;

  try {
    if (typeof serviceId === 'object') {
      url = serviceId.serviceId;
      columns = serviceId.columns;
      additionalColumnNames = serviceId.additionalColumnNames;
      disableSelect =
        typeof serviceId.disableSelect === 'boolean'
          ? serviceId.disableSelect
          : false;

      if (!isNaN(serviceId.defaultPage)) {
        defaultCurrentPage = serviceId.defaultPage;
      }

      if (!isNaN(serviceId.defaultPageSize)) {
        defaultPageSize = serviceId.defaultPageSize;
      }
    }
  } catch (e) {
    /** Do nothing */
  }

  if (disableSelect === false && Array.isArray(columns)) {
    try {
      columnsToSelect = React.useMemo(
        () => [
          ...columns.map((c) => c.dataIndex),
          ...(Array.isArray(additionalColumnNames)
            ? additionalColumnNames
            : []),
        ],
        [columns, additionalColumnNames]
      );
    } catch (e) {
      /** Do nothing */
    }
  }

  const [currentPage, setCurrentPage] = React.useState(defaultCurrentPage);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const service = useServiceCreator(modId, context)(serviceId);

  let dataSource: any[] = [];
  let total: number = 0;
  let pagination: any = {};

  try {
    if (Array.isArray(service.response.data)) {
      dataSource = service.response.data;
    }
  } catch (e) {
    /** Do nothing */
  }

  try {
    if (!isNaN(service.response.meta.totalCount)) {
      total = service.response.meta.totalCount;
    }
  } catch (e) {
    /** Do nothing */
  }

  pagination = {
    current: currentPage,
    pageSize: pageSize,
    total,
  };

  const onChange = React.useCallback(
    (_pag?: any, _filter?: any, _sorter?: any) => {
      if (!_pag) {
        _pag = pagination;
      }

      let sortQ: any = undefined;

      if (_sorter) {
        try {
          const sortFields: any[] = Array.isArray(_sorter)
            ? _sorter
            : [_sorter];
          sortQ = JSON.stringify(
            sortFields.reduce((acc, item) => {
              acc[item.field] = item.order === 'ascend' ? 1 : -1;
              return acc;
            }, {})
          );
        } catch (e) {
          /** Do nothing */
        }
      }

      let filterQ: any = undefined;

      if (_filter) {
        try {
          filterQ = JSON.stringify(_filter);
        } catch (e) {
          /** Do nothing */
        }
      }

      let selectQ: any = undefined;

      try {
        if (
          disableSelect === false &&
          Array.isArray(columnsToSelect) &&
          columnsToSelect.length > 0
        ) {
          selectQ = JSON.stringify(columnsToSelect.join(' '));
        }
      } catch (e) {
        /** Do nothing */
      }

      return service
        .invoke(
          {
            skip: _pag.pageSize * (_pag.current - 1),
            limit: _pag.pageSize,
            sort: sortQ,
            filter: filterQ,
            select: selectQ,
          },
          { force: true }
        )
        .then((res) => {
          setCurrentPage(_pag.current);
          setPageSize(_pag.pageSize);
        });
    },
    // Fix: issue with table source not changing when service id is changed
    [url]
  );

  React.useEffect(() => {
    onChange();
  }, [onChange]);

  return {
    loading: service.isLoading,
    dataSource,
    onChange,
    pagination,
    columns,
  };
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

const addMenuItemToAccumulator = (
  acc: Array<any>,
  items: Array<RouteConfigItem>,
  isFlattened: boolean = false
) => {
  acc.push(
    ...items.map((i) => {
      i.hasLink = i.component !== undefined && i.component !== null;
      i.isFlattened = isFlattened;
      return i;
    })
  );
};

export const flattenRouteConfig = (
  input: Array<RouteConfigItem>
): Array<RouteConfigItem> => {
  return input.reduce((acc, item) => {
    addMenuItemToAccumulator(acc, [item]);

    // Add submenu items
    if (Array.isArray(item.submenu) && item.submenu.length > 0) {
      addMenuItemToAccumulator(acc, item.submenu, true);
    }

    return acc;
  }, []);
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
    renderMode: () => {
      try {
        return context.getData('default', '__react___renderMode');
      } catch (e) {
        /** Do nothing */
      }
      return 'csr';
    },
    useService: useServiceCreator(moduleId, context),
    useVolumeAccessPoint: (refId: string) => {
      const ref = extractRef(refId, moduleId);
      const accessPointPath = `/volumes/${ref.moduleName}/${ref.refId}`;
      return {
        getUrl: (fileName) => `${accessPointPath}/${fileName}`,
      };
    },
    useStore: useStoreCreator(moduleId, context),
    useContext: useContextCreator(context),
    useTableService: useTableServiceCreator(moduleId, context),
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
    useRouteConfig: (_ref, _configCreator) => {
      const ref = typeof _ref === 'string' ? _ref : 'default';
      const configCreator = typeof _ref === 'string' ? _configCreator : _ref;
      const hasConfigCreator = configCreator === undefined ? false : true;

      if (hasConfigCreator === false) {
        return context.useDataFromContext(
          'default',
          ref,
          undefined,
          false,
          'route_menu'
        );
      }

      controller.ensureInitializing();
      controller.run(() => {
        const config =
          hasConfigCreator === true
            ? flattenRouteConfig(configCreator())
            : undefined;
        const menu: Array<MenuItem & MenuItemAddOn> = config.map((c) => ({
          path: c.path,
          extras: c.extras,
          icon: c.icon,
          label: c.label,
          hasLink: c.hasLink,
          isFlattened: c.isFlattened,
          hideInMenu: c.hideInMenu,
          submenu: c.submenu,
        }));

        context.useDataFromContext('default', ref, menu, false, 'route_menu');

        const routeConfigs = context.getData<RouteConfigItem[]>(
          'default',
          'routeConfigs',
          []
        );
        routeConfigs.push(
          ...config
            .filter((c) => c.hasLink === true)
            .map((item) => {
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

      return null;
    },
    useMenu: (opts) => {
      const ItemRenderer = opts.itemRenderer;
      const GroupRenderer = opts.groupRenderer;

      const menuItems = React.useMemo<Array<JSX.Element>>(() => {
        let result = context.useDataFromContext<
          Array<MenuItem & MenuItemAddOn>
        >('default', opts.refId, undefined, false, 'route_menu');

        if (Array.isArray(result) && result.length > 0) {
          result = result
            .filter((m) => m.isFlattened === false)
            .filter(
              (m) => m.hideInMenu === undefined || m.hideInMenu === false
            );
        } else {
          result = [];
        }

        return result.reduce<Array<JSX.Element>>((acc, item, index) => {
          const hasSubItem =
            Array.isArray(item.submenu) && item.submenu.length > 0;

          if (hasSubItem === true) {
            acc.push(
              <GroupRenderer key={item.path as string} data={item}>
                {item.submenu.map((v) => (
                  <ItemRenderer key={v.path as string} data={v} />
                ))}
              </GroupRenderer>
            );
          } else {
            acc.push(<ItemRenderer key={item.path as string} data={item} />);
          }

          return acc;
        }, []);
      }, [opts.refId, ItemRenderer, GroupRenderer]);

      const activeGroupPath: string = React.useMemo(() => {
        let result = context.useDataFromContext<
          Array<MenuItem & MenuItemAddOn>
        >('default', opts.refId, undefined, false, 'route_menu');

        if (Array.isArray(result) && result.length > 0) {
          result = result
            .filter((m) => m.isFlattened === false)
            .filter(
              (m) => m.hideInMenu === undefined || m.hideInMenu === false
            );
        } else {
          result = [];
        }

        let i = 0;
        for (i = 0; i < result.length; i++) {
          if (
            Array.isArray(result[i].submenu) &&
            result[i].submenu.length > 0
          ) {
            let j = 0;
            for (j = 0; j < result[i].submenu.length; j++) {
              if (result[i].submenu[j].path === opts.currentPath) {
                return result[i].path as string;
              }
            }
          }
        }

        return undefined;
      }, [opts.currentPath]);

      return {
        menuItems,
        activeGroupPath,
      };
    },
    useContent: (opts_) => {
      const opts: ContentHookOptions<any> = Object.assign<
        ContentHookOptions<any>,
        Partial<ContentHookOptions<any>>
      >(
        {
          serviceId: typeof opts_ === 'string' ? opts_ : undefined,
          defaultContent: undefined,
          useReduxStore: false,
          enableLocalStorage: false,
        },
        typeof opts_ === 'object' ? opts_ : undefined
      );

      const localStorageKey: string = `_cmsHook/_ls/${opts.serviceId}`;

      if (opts.enableLocalStorage === true) {
        try {
          opts.defaultContent = JSON.parse(
            localStorage.getItem(localStorageKey)
          );
        } catch (e) {
          console.warn(
            `Failed to load content from local storage for '${opts.serviceId};`
          );
          console.warn(e);
        }
      }

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
        saveLocally: () => {
          try {
            window.localStorage.setItem(
              localStorageKey,
              JSON.stringify(content)
            );
          } catch (e) {
            console.warn(
              `Failed to load content from local storage for '${opts.serviceId};`
            );
            console.warn(e);
          }
        },
        hasLocalData: () => {
          try {
            const data = JSON.parse(
              window.localStorage.getItem(localStorageKey)
            );
            return data !== undefined && data !== null;
          } catch (e) {
            console.warn(
              `Failed to load content from local storage for '${opts.serviceId};`
            );
            console.warn(e);
          }

          return false;
        },
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
    resolveServiceUrl: (serviceId: string, modId?: string): string => {
      let _moduleId = moduleId;
      if (modId) {
        _moduleId = modId;
      }

      return resolveServiceUrl(serviceId, _moduleId);
    },
  })
);
