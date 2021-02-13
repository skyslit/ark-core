#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import App from './app';
import { getAppProps } from './cli';

render(<App {...getAppProps()} />);
