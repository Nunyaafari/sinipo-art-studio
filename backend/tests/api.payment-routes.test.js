import test from 'node:test';
import assert from 'node:assert/strict';
import { resetPersistentState } from './helpers/state.js';
import { requestJson, startTestServerOrSkip } from './helpers/server.js';

test('payment initialize route rejects incomplete checkout payloads', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const response = await requestJson(serverHandle.baseUrl, '/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'checkout@example.com',
      items: [],
      customerInfo: {
        firstName: 'Route',
        lastName: 'Tester'
      }
    })
  });

  assert.equal(response.status, 400);
  assert.ok(
    response.body.error.includes('items') ||
      response.body.error.includes('address') ||
      response.body.error.includes('phone')
  );
});

test('payment initialize route creates a mock order for a valid checkout payload', async (t) => {
  resetPersistentState();
  const serverHandle = await startTestServerOrSkip(t);
  if (!serverHandle) {
    return;
  }

  t.after(async () => {
    await serverHandle.close();
    resetPersistentState();
  });

  const catalogResponse = await requestJson(serverHandle.baseUrl, '/api/shopping/products');
  assert.equal(catalogResponse.status, 200);
  assert.equal(catalogResponse.body.success, true);

  const product = catalogResponse.body.data.find((item) => item.inStock !== false) || catalogResponse.body.data[0];
  assert.ok(product);

  const paymentResponse = await requestJson(serverHandle.baseUrl, '/api/payment/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'checkout@example.com',
      items: [
        {
          productId: product.id,
          quantity: 1,
          frameColor: product.frameColor
        }
      ],
      customerInfo: {
        firstName: 'Route',
        lastName: 'Tester',
        email: 'checkout@example.com',
        phone: '+233555000111',
        address: '123 Test Street',
        city: 'Accra',
        country: 'Ghana'
      }
    })
  });

  assert.equal(paymentResponse.status, 200);
  assert.equal(paymentResponse.body.success, true);
  assert.equal(paymentResponse.body.data.mode, 'mock');
  assert.ok(paymentResponse.body.data.reference);
});
