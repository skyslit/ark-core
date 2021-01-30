import React from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';

export default (props: any) => {
  const { runProcess } = props;
  const handleSubmit = (item: any) => {
    runProcess(item.value);
  };

  const items = [
    {
      label: 'Sync All',
      value: 'sync',
    },
    // {
    //   label: 'Add New Module',
    //   value: 'add-module',
    // },
    // {
    //   label: 'Install FreePizza Module',
    //   value: '4',
    // },
    // {
    //   label: 'Add Frontend Project',
    //   value: '1',
    // },
    // {
    //   label: 'Add Backend Project',
    //   value: '2',
    // },
    // {
    //   label: 'Run All',
    //   value: '5',
    // },
    // {
    //   label: 'Build All',
    //   value: '6',
    // },
    // {
    //   label: 'Publish FreePizza Module',
    //   value: '3',
    // },
  ];

  return (
    <>
      <Text>Welcome to FPZ (Ark CLI)</Text>
      <Text color="gray">What do you want to do?</Text>
      <SelectInput items={items} onSelect={handleSubmit} />
    </>
  );
};
