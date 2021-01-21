import { defineService, runService, shouldAllow, shouldDeny } from '../index';
import Joi from 'joi';

describe('utility', () => {
  test('should allow', () => {
    const policies = ['ABC', 'DEF', 'TEST'];
    const testPolicy = 'TEST';
    const isAllowed = shouldAllow(testPolicy, policies);
    expect(isAllowed).toStrictEqual(true);
  });
  test('should not allow', () => {
    const policies = ['ABC', 'DEF', 'TEST'];
    const testPolicy = 'SOMETHING_ELSE';
    const isAllowed = shouldAllow(testPolicy, policies);
    expect(isAllowed).toStrictEqual(false);
  });

  test('should deny', () => {
    const policies = ['ABC', 'DEF', 'TEST'];
    const testPolicy = 'TEST';
    const isAllowed = shouldDeny(testPolicy, policies);
    expect(isAllowed).toStrictEqual(true);
  });
  test('should not deny', () => {
    const policies = ['ABC', 'DEF', 'TEST'];
    const testPolicy = 'SOMETHING_ELSE';
    const isAllowed = shouldDeny(testPolicy, policies);
    expect(isAllowed).toStrictEqual(false);
  });
});

describe('definePre tests', () => {
  const TestService = defineService('TestService', (options) => {
    options.definePre('dbObj', () => {
      return 'Object from database';
    });

    options.defineLogic((opts) => {
      return opts.success({
        message: 'Test',
      });
    });
  });

  test('input should have dbObj when dbId is provided', async () => {
    const output = await runService(TestService, {
      input: {
        dbId: '123',
      },
    });

    expect(output.args.input.dbObj).toStrictEqual('Object from database');
    expect(output.result.type).toStrictEqual('success');
    expect(output.result.meta.message).toStrictEqual('Test');
  });

  test('input should have dbObj when dbObj is provided', async () => {
    const output = await runService(TestService, {
      input: {
        dbObj: 'Passthru information',
      },
    });

    expect(output.args.input.dbObj).toStrictEqual('Passthru information');
    expect(output.result.type).toStrictEqual('success');
    expect(output.result.meta.message).toStrictEqual('Test');
  });
});

describe('defineRule test', () => {
  const TestServiceWithRuleChecking = defineService(
    'TestService',
    (options) => {
      options.defineRule((opts) => {
        opts.allowPolicy('TEST');
      });

      options.defineLogic((opts) => {
        return opts.success({
          message: 'Hello World',
        });
      });
    }
  );

  const PublicTestService = defineService('TestService', (options) => {
    options.defineLogic((opts) => {
      return opts.success({
        message: 'Hello World',
      });
    });
  });

  test('result should be 401 error without any policies', async () => {
    const output = await runService(TestServiceWithRuleChecking);
    expect(output.result.type).toStrictEqual('error');
    expect(output.result.errCode).toStrictEqual(401);
  });

  test('result should be 401 error', async () => {
    const output = await runService(TestServiceWithRuleChecking, {
      policies: ['TEST22'],
    });
    expect(output.result.type).toStrictEqual('error');
    expect(output.result.errCode).toStrictEqual(401);
  });

  test('result should be success', async () => {
    const output = await runService(TestServiceWithRuleChecking, {
      policies: ['TEST'],
    });
    expect(output.result.type).toStrictEqual('success');
    expect(output.result.meta.message).toStrictEqual('Hello World');
  });

  test('public test > result should be success', async () => {
    const output = await runService(PublicTestService);
    expect(output.result.type).toStrictEqual('success');
    expect(output.result.meta.message).toStrictEqual('Hello World');
  });

  test('public test > result should be success (with policies specified in input)', async () => {
    const output = await runService(PublicTestService, {
      policies: ['TEST'],
    });
    expect(output.result.type).toStrictEqual('success');
    expect(output.result.meta.message).toStrictEqual('Hello World');
  });

  test('result should fail when no policy is specified in rule definition', async () => {
    const TestServiceWithRuleCheckingWithoutPolicies = defineService(
      'TestService',
      (options) => {
        options.defineRule((opts) => {});

        options.defineLogic((opts) => {
          return opts.success({
            message: 'Hello World',
          });
        });
      }
    );

    const output = await runService(
      TestServiceWithRuleCheckingWithoutPolicies,
      {
        policies: ['TEST'],
      }
    );
    expect(output.result.type).toStrictEqual('error');
    expect(output.result.errCode).toStrictEqual(401);
  });
});

describe('defineValidator test', () => {
  test('validation should fail', async () => {
    const TestService = defineService('TestService', (options) => {
      options.defineValidator(
        Joi.object({
          userName: Joi.string().alphanum().min(3).max(30).required().messages({
            'any.required': 'Please enter your username',
          }),

          fullName: Joi.string().alphanum().min(3).max(30).required().messages({
            'any.required': 'Full name is required',
          }),
        })
      );

      options.defineLogic((opts) => {
        return opts.success({
          message: 'Hello World',
        });
      });
    });

    const output = await runService(TestService);

    expect(output.result.type).toStrictEqual('error');
    expect(output.result.errCode).toStrictEqual(400);
    expect(output.validationErrors[0].key).toStrictEqual('userName');
    expect(output.validationErrors[0].message).toStrictEqual(
      'Please enter your username'
    );
    expect(output.validationErrors[1].key).toStrictEqual('fullName');
    expect(output.validationErrors[1].message).toStrictEqual(
      'Full name is required'
    );
  });

  test('validation should succeed', async () => {
    const TestService = defineService('TestService', (options) => {
      options.defineValidator(
        Joi.object({
          userName: Joi.string().alphanum().min(3).max(30).required().messages({
            'any.required': 'Please enter your username',
          }),

          fullName: Joi.string().alphanum().min(3).max(30).required().messages({
            'any.required': 'Full name is required',
          }),
        })
      );

      options.defineLogic((opts) => {
        return opts.success({
          message: 'Hello World',
        });
      });
    });

    const output = await runService(TestService, {
      input: {
        userName: 'dameemshahabaz',
        fullName: 'Dameem',
      },
    });

    expect(output.result.type).toStrictEqual('success');
    expect(output.result.meta.message).toStrictEqual('Hello World');
  });
});

describe('error handling', () => {
  test('error on definePre', async () => {
    const TestService = defineService('TestService', (options) => {
      options.definePre('dbObj', () => {
        throw new Error('Intentional error');
      });

      options.defineLogic((opts) => {
        return opts.success({
          message: 'Test',
        });
      });
    });

    const output = await runService(TestService);

    expect(output.result.type).toStrictEqual('error');
    expect(output.result.errCode).toStrictEqual(500);
  });

  test('error on defineRule', async () => {
    const TestService = defineService('TestService', (options) => {
      options.defineRule(() => {
        throw new Error('Intentional error');
      });

      options.defineLogic((opts) => {
        return opts.success({
          message: 'Test',
        });
      });
    });

    const output = await runService(TestService);

    expect(output.result.type).toStrictEqual('error');
    expect(output.result.errCode).toStrictEqual(500);
  });

  test('error on defineLogic', async () => {
    const TestService = defineService('TestService', (options) => {
      options.defineLogic((opts) => {
        throw new Error('Intentional error');
      });
    });

    const output = await runService(TestService);

    expect(output.result.type).toStrictEqual('error');
    expect(output.result.errCode).toStrictEqual(500);
  });
});
