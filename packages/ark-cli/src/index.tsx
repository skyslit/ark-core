#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import App from './app';

render(<App cwd={process.cwd()} keepAlive={true} />);
