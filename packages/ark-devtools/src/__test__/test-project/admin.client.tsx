import React from 'react';
import {createContext} from '@skyslit/ark-core';
import {TestComponent} from './modules/Module1/mock.view';

// TODO
const useRoute = (path: string, _: any) => _;

export default createContext(() => {
  useRoute('/', <TestComponent />);
});
