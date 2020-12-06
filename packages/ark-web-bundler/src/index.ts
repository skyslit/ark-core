/* eslint-disable no-unused-vars */
// import path from 'path';
// import {spawnSync} from 'child_process';
import {ExpressBuilder} from './builders/ExpressBuilder';
import webpack from 'webpack';
import path from 'path';

// spawnSync('node', [path.join(__dirname, './scripts/build.js')], {
//   stdio: 'inherit',
// });

// const builder = new ExpressBuilder();
// builder.build({
//   cwd: process.cwd(),
//   mode: 'production',
// });


const compiler = webpack({
  mode: 'development',
});

compiler.compile((err, r) => {
  if (err) {
    console.error(err);
  } else {
    console.log(r.compiler.context);
    console.log('success');
  }
});
