import React from 'react';
import {createContext} from '@skyslit/ark-core';
import {TestComponent} from './mock.view';

export default createContext(() => {
  // eslint-disable-next-line no-unused-vars
  const a = <TestComponent />;
});
