import { once } from 'node:events';
import app, { runtimeStateReady } from '../../src/server.js';

export const startTestServer = async () => {
  await runtimeStateReady;

  const server = app.listen(0);
  await once(server, 'listening');

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;

  if (!port) {
    throw new Error('Failed to determine test server port');
  }

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  };
};

export const startTestServerOrSkip = async (t) => {
  try {
    return await startTestServer();
  } catch (error) {
    if (error?.code === 'EPERM' && error?.syscall === 'listen') {
      t.skip('Route integration tests require local port binding, which is blocked in this environment.');
      return null;
    }

    throw error;
  }
};

export const requestJson = async (baseUrl, pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    response,
    status: response.status,
    body
  };
};

export const loginAndGetToken = async (
  baseUrl,
  credentials = {
    email: 'admin@example.com',
    password: 'supersecure123',
    firstName: 'Admin',
    lastName: 'Tester'
  }
) => {
  const bootstrapStatusResponse = await requestJson(baseUrl, '/api/auth/bootstrap-status');

  if (bootstrapStatusResponse.status === 200 && bootstrapStatusResponse.body?.data?.requiresAdminSetup) {
    const bootstrapResponse = await requestJson(baseUrl, '/api/auth/bootstrap-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        firstName: credentials.firstName,
        lastName: credentials.lastName
      })
    });

    if (bootstrapResponse.status !== 201 || !bootstrapResponse.body?.data?.token) {
      throw new Error(`Failed to bootstrap test admin: ${bootstrapResponse.body?.error || bootstrapResponse.status}`);
    }

    return bootstrapResponse.body.data.token;
  }

  const loginResponse = await requestJson(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password
    })
  });

  if (loginResponse.status !== 200 || !loginResponse.body?.data?.token) {
    throw new Error(`Failed to authenticate test user: ${loginResponse.body?.error || loginResponse.status}`);
  }

  return loginResponse.body.data.token;
};
