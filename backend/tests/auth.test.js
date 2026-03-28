import test from 'node:test';
import assert from 'node:assert/strict';
import { login, register } from '../src/controllers/authController.js';
import { createMockRequest, createMockResponse } from './helpers/http.js';
import { resetPersistentState } from './helpers/state.js';

test.beforeEach(() => {
  resetPersistentState();
});

test.after(() => {
  resetPersistentState();
});

test('register rejects invalid email addresses', async () => {
  const req = createMockRequest({
    method: 'POST',
    originalUrl: '/api/auth/register',
    body: {
      email: 'not-an-email',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    }
  });
  const res = createMockResponse();

  await register(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Invalid email format');
});

test('register and login succeed with normalized email', async () => {
  const uniqueEmail = `newuser-${Date.now()}@example.com`;
  const registerReq = createMockRequest({
    method: 'POST',
    originalUrl: '/api/auth/register',
    body: {
      email: ` ${uniqueEmail.toUpperCase()} `,
      password: 'password123',
      firstName: 'New',
      lastName: 'User'
    }
  });
  const registerRes = createMockResponse();

  await register(registerReq, registerRes);

  assert.equal(registerRes.statusCode, 201);
  assert.equal(registerRes.body.success, true);
  assert.equal(registerRes.body.data.user.email, uniqueEmail);

  const loginReq = createMockRequest({
    method: 'POST',
    originalUrl: '/api/auth/login',
    body: {
      email: uniqueEmail,
      password: 'password123'
    }
  });
  const loginRes = createMockResponse();

  await login(loginReq, loginRes);

  assert.equal(loginRes.statusCode, 200);
  assert.equal(loginRes.body.success, true);
  assert.ok(loginRes.body.data.token);
  assert.equal(loginRes.body.data.user.email, uniqueEmail);
});
