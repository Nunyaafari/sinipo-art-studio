import test from 'node:test';
import assert from 'node:assert/strict';
import { resetPersistentState } from './helpers/state.js';
import { requestJson, startTestServerOrSkip } from './helpers/server.js';

test('auth routes expose first-admin bootstrap when no admin exists', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const statusResponse = await requestJson(serverHandle.baseUrl, '/api/auth/bootstrap-status');
  assert.equal(statusResponse.status, 200);
  assert.equal(statusResponse.body.success, true);
  assert.equal(statusResponse.body.data.requiresAdminSetup, true);

  const bootstrapResponse = await requestJson(serverHandle.baseUrl, '/api/auth/bootstrap-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'owner@example.com',
      password: 'supersecure123',
      firstName: 'Owner',
      lastName: 'Admin'
    })
  });

  assert.equal(bootstrapResponse.status, 201);
  assert.equal(bootstrapResponse.body.success, true);
  assert.equal(bootstrapResponse.body.data.user.role, 'admin');
  assert.ok(bootstrapResponse.body.data.token);

  const secondStatusResponse = await requestJson(serverHandle.baseUrl, '/api/auth/bootstrap-status');
  assert.equal(secondStatusResponse.status, 200);
  assert.equal(secondStatusResponse.body.data.requiresAdminSetup, false);
  assert.equal(secondStatusResponse.body.data.adminCount, 1);
});

test('auth routes register a user and then allow login', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const uniqueEmail = `route-auth-${Date.now()}@example.com`;
  const registerResponse = await requestJson(serverHandle.baseUrl, '/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'supersecure123',
      firstName: 'Route',
      lastName: 'Tester'
    })
  });

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.success, true);
  assert.equal(registerResponse.body.data.user.email, uniqueEmail);

  const loginResponse = await requestJson(serverHandle.baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'supersecure123'
    })
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.success, true);
  assert.ok(loginResponse.body.data.token);
});

test('auth routes reject invalid registration payloads with a client error', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const response = await requestJson(serverHandle.baseUrl, '/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'bad-email',
      password: 'short',
      firstName: '',
      lastName: 'Tester'
    })
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Missing required fields: firstName');
});
