import test from 'node:test';
import assert from 'node:assert/strict';
import { resetPersistentState } from './helpers/state.js';
import { loginAndGetToken, requestJson, startTestServerOrSkip } from './helpers/server.js';

test('audit routes require admin auth and expose recorded events', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const unauthorizedResponse = await requestJson(serverHandle.baseUrl, '/api/admin/audit');
  assert.equal(unauthorizedResponse.status, 401);

  const adminToken = await loginAndGetToken(serverHandle.baseUrl);
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  };

  const createArtworkResponse = await requestJson(serverHandle.baseUrl, '/api/admin/artworks', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Route Test Artwork',
      artist: 'Codex',
      price: '220',
      category: 'Abstract',
      style: 'Modern',
      size: 'Medium',
      dimensions: '24x36',
      frameColor: 'Gold',
      description: 'Created through the admin route integration test.',
      image: '/uploads/route-artwork.jpg'
    })
  });

  assert.equal(createArtworkResponse.status, 201);
  assert.equal(createArtworkResponse.body.success, true);

  const auditResponse = await requestJson(serverHandle.baseUrl, '/api/admin/audit?action=artwork.create', {
    headers: {
      Authorization: adminHeaders.Authorization
    }
  });

  assert.equal(auditResponse.status, 200);
  assert.equal(auditResponse.body.success, true);
  assert.equal(auditResponse.body.data[0].action, 'artwork.create');

  const statsResponse = await requestJson(serverHandle.baseUrl, '/api/admin/audit/stats', {
    headers: {
      Authorization: adminHeaders.Authorization
    }
  });

  assert.equal(statsResponse.status, 200);
  assert.equal(statsResponse.body.success, true);
  assert.ok(statsResponse.body.data.total >= 1);
  assert.ok(statsResponse.body.data.actionCounts['artwork.create'] >= 1);
});

test('blog admin routes validate payloads and persist successful posts', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const adminToken = await loginAndGetToken(serverHandle.baseUrl);
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  };

  const invalidResponse = await requestJson(serverHandle.baseUrl, '/api/admin/blog', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'No',
      excerpt: 'short',
      content: 'too short',
      author: '',
      category: ''
    })
  });

  assert.equal(invalidResponse.status, 400);
  assert.ok(typeof invalidResponse.body.error === 'string');

  const validResponse = await requestJson(serverHandle.baseUrl, '/api/admin/blog', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Route Test Blog Post',
      excerpt: 'This excerpt is long enough for the API validation layer.',
      content: 'This is a route-level integration test for blog creation with enough content to pass validation.',
      author: 'Codex',
      category: 'Behind the Scenes',
      isPublished: true
    })
  });

  assert.equal(validResponse.status, 201);
  assert.equal(validResponse.body.success, true);

  const listResponse = await requestJson(serverHandle.baseUrl, '/api/admin/blog', {
    headers: {
      Authorization: adminHeaders.Authorization
    }
  });

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.success, true);
  assert.ok(listResponse.body.data.some((post) => post.title === 'Route Test Blog Post'));
});
