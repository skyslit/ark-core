import { defineService, runService } from '../index';

// eslint-disable-next-line no-unused-vars
const service1 = defineService('SERVICE_1', (options) => {
  options.defineLogic((opts) => {
    return opts.success({
      message: 'Hello World',
    });
  });
});

test('test runner', async () => {
  const result = await runService(service1);
  expect(result.result.meta.message).toStrictEqual('Hello World');
});
