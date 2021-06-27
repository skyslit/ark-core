import {
  resolveIndexFromTraversalResult,
  resolveAddressForTraversal,
} from '../index';
import traverse from 'traverse';

test('common usage', () => {
  const data: any = {
    links: [
      {
        id: 'l-100',
        text: '100',
      },
      {
        id: 'l-200',
        text: '200',
        subLinks: [
          {
            id: 's-100',
            text: '100',
          },
          {
            id: 's-200',
            text: '200',
          },
          {
            id: 's-300',
            text: '300',
          },
        ],
      },
      {
        id: 'l-300',
        text: '300',
      },
    ],
  };

  const traverseResult = traverse(data);
  const output = resolveAddressForTraversal(
    traverseResult,
    'links.[l-200].subLinks.[s-300]'
  );

  expect(output).toStrictEqual('links.1.subLinks.2');
});

test('root usage', () => {
  const data: any = [
    {
      id: 's-100',
      text: '100',
    },
    {
      id: 's-200',
      text: '200',
    },
    {
      id: 's-300',
      text: '300',
    },
  ];

  const traverseResult = traverse(data);
  const output = resolveAddressForTraversal(traverseResult, '[s-200]');

  expect(output).toStrictEqual('1');
});

test('should return 2', () => {
  const data: any = {
    links: [
      {
        id: 'l-100',
        text: '100',
      },
      {
        id: 'l-200',
        text: '200',
      },
      {
        id: 'l-300',
        text: '300',
      },
    ],
  };
  const traverseResult = traverse(data);
  const index = resolveIndexFromTraversalResult(
    traverseResult,
    'links',
    '[l-300]'
  );
  expect(index).toStrictEqual(2);
});

test('should return 1', () => {
  const data: any = {
    links: [
      {
        id: 'l-100',
        text: '100',
      },
      {
        id: 'l-200',
        text: '200',
      },
      {
        id: 'l-300',
        text: '300',
      },
    ],
  };
  const traverseResult = traverse(data);
  const index = resolveIndexFromTraversalResult(
    traverseResult,
    'links',
    '[l-200]'
  );
  expect(index).toStrictEqual(1);
});

test('should return 1 in this case', () => {
  const data: any = {
    links: [
      {
        id: 'l-100',
        text: '100',
      },
      {
        id: 'l-200',
        text: '200',
        subLinks: [
          {
            id: 's-100',
            text: '100',
          },
          {
            id: 's-200',
            text: '200',
          },
          {
            id: 's-300',
            text: '300',
          },
        ],
      },
      {
        id: 'l-300',
        text: '300',
      },
    ],
  };
  const traverseResult = traverse(data);
  const index = resolveIndexFromTraversalResult(
    traverseResult,
    'links.1.subLinks',
    '[s-200]'
  );
  expect(index).toStrictEqual(1);
});
