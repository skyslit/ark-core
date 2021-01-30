import React from 'react';
import Table from 'ink-table';

const data = [
  {
    type: 'server',
    name: 'app',
    status: 'pending',
  },
  {
    type: 'client',
    name: 'admin',
    status: 'pending',
  },
  {
    type: 'client',
    name: 'app',
    status: 'pending',
  },
];

export default (props: any) => {
  return <Table data={data} />;
};
