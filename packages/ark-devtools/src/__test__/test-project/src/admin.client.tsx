import React from 'react';
import { Link } from 'react-router-dom';
import { createContext, createModule } from '@skyslit/ark-core';
import { createComponent, Frontend } from '@skyslit/ark-frontend';

const layoutCreator = createComponent(({ children }) => {
  return (
    <div>
      <div>
        <Link to="/">Page 1</Link>
        <Link to="/2">Page 2</Link>
      </div>
      <div>{children}</div>
    </div>
  );
});

const page1Creator = createComponent(() => {
  return <div>Page 1 (Page 1 SSR Test)</div>;
});

const page2Creator = createComponent(() => {
  return <div>Page 2</div>;
});

const module1 = createModule(({ use }) => {
  const { useComponent, mapRoute } = use(Frontend);
  const Page1 = useComponent('main', page1Creator);
  mapRoute('/', Page1, 'default/primary', {
    exact: true,
  });
});

const module2 = createModule(({ use }) => {
  const { useComponent, mapRoute } = use(Frontend);
  const Page2 = useComponent('main', page2Creator);
  mapRoute('/2', Page2, 'default/primary', {
    exact: true,
  });
});

const _package = createContext(({ useModule, use }) => {
  const { useLayout } = use(Frontend);
  useLayout('primary', layoutCreator);
  useModule('mod1', module1);
  useModule('mod2', module2);
});

export default _package;
