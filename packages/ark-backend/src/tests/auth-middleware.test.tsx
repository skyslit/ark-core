import { ApplicationContext, ControllerContext } from '@skyslit/ark-core';
import { createAuthMiddleware, Security } from '../index';

test('should allow bearer token with decodeUri', async () => {
  const jwtSecretKey = 'SECRET_123';
  const app = new ApplicationContext();
  // eslint-disable-next-line new-cap
  const { jwt } = Security('default', new ControllerContext(app), app);

  const token = jwt.sign({}, jwtSecretKey);

  let isNextCalled: boolean = false;
  const req: any = {
    cookies: {
      authorization: `Bearer%20${token}`,
    },
    headers: {},
  };

  await createAuthMiddleware({
    jwtSecretKey,
  })(req, null, () => (isNextCalled = true));

  expect(isNextCalled).toEqual(true);
  expect(req.isAuthenticated).toStrictEqual(true);
});
