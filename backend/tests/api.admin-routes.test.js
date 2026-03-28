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

test('upload routes require admin auth before accepting files', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const unauthorizedResponse = await requestJson(serverHandle.baseUrl, '/api/upload/single', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  assert.equal(unauthorizedResponse.status, 401);

  const adminToken = await loginAndGetToken(serverHandle.baseUrl);
  const authorizedResponse = await requestJson(serverHandle.baseUrl, '/api/upload/single', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({})
  });

  assert.equal(authorizedResponse.status, 400);
  assert.equal(authorizedResponse.body.error, 'No file uploaded');
});

test('admin settings persist media storage configuration', async (t) => {
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

  const updateResponse = await requestJson(serverHandle.baseUrl, '/api/admin/settings', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      shipping: {
        currency: 'USD',
        freeShippingThreshold: 500,
        standardShippingCost: 50,
        shippingLabel: 'Standard delivery',
        estimatedDelivery: '3-5 business days'
      },
      tax: {
        enabled: false,
        taxRate: 0,
        taxLabel: 'Sales tax'
      },
      payment: {
        paymentMode: 'test',
        providerName: 'Paystack',
        guestCheckoutEnabled: true,
        livePublicKey: '',
        liveSecretKey: '',
        testPublicKey: 'pk_test_demo',
        testSecretKey: 'sk_test_demo',
        webhookSecret: '',
        checkoutNotice: 'Sandbox mode'
      },
      email: {
        providerName: 'SMTP',
        fromName: 'Sinipo Art Studio',
        fromAddress: 'hello@sinipo.art',
        replyToAddress: 'hello@sinipo.art',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        secure: false,
        orderConfirmationEnabled: true,
        shippingUpdateEnabled: true,
        newsletterEnabled: true
      },
      inventory: {
        lowStockThreshold: 3
      },
      media: {
        uploadStorage: 'cloudinary',
        backendPublicUrl: 'https://api.sinipo.art',
        cloudinaryCloudName: 'sinipo-demo',
        cloudinaryApiKey: 'demo-key',
        cloudinaryApiSecret: 'demo-secret',
        cloudinaryFolder: 'sinipo-live'
      },
      homepage: {},
      seo: {}
    })
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.success, true);
  assert.equal(updateResponse.body.data.media.uploadStorage, 'cloudinary');
  assert.equal(updateResponse.body.data.media.cloudinaryFolder, 'sinipo-live');

  const getResponse = await requestJson(serverHandle.baseUrl, '/api/admin/settings', {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.success, true);
  assert.equal(getResponse.body.data.media.backendPublicUrl, 'https://api.sinipo.art');
  assert.equal(getResponse.body.data.media.cloudinaryCloudName, 'sinipo-demo');
});
