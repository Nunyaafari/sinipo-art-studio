import test from 'node:test';
import assert from 'node:assert/strict';
import { initializePayment, verifyPayment } from '../src/controllers/paymentController.js';
import { updateOrderStatus } from '../src/controllers/orderController.js';
import { createAuthenticatedAdminRequest, createMockRequest, createMockResponse } from './helpers/http.js';
import { resetPersistentState } from './helpers/state.js';
import {
  getAdminAuditLogsState,
  getArtworksState,
  getStorefrontSettingsState
} from '../src/storage/persistentState.js';

test.beforeEach(() => {
  resetPersistentState();
});

test.after(() => {
  resetPersistentState();
});

test('payment initialization and verification use server-calculated totals and preserve frame selection', async () => {
  const product = getArtworksState().find((item) => item.productType !== 'fashion' && item.inStock !== false);
  assert.ok(product, 'expected an in-stock artwork test fixture');

  getStorefrontSettingsState().payment.paymentMode = 'test';

  const initReq = createMockRequest({
    method: 'POST',
    originalUrl: '/api/payment/initialize',
    body: {
      email: 'buyer@example.com',
      customerInfo: {
        firstName: 'Buyer',
        lastName: 'Example',
        phone: '+2330000000',
        address: '1 Art Street',
        city: 'Accra',
        country: 'Ghana'
      },
      items: [
        {
          productId: product.id,
          quantity: 1,
          frameColor: 'Black'
        }
      ]
    }
  });
  const initRes = createMockResponse();

  await initializePayment(initReq, initRes);

  assert.equal(initRes.statusCode, 200);
  assert.equal(initRes.body.success, true);
  assert.equal(initRes.body.data.mode, 'mock');
  assert.ok(initRes.body.data.reference);

  const verifyReq = createMockRequest({
    method: 'GET',
    originalUrl: `/api/payment/verify/${initRes.body.data.reference}`,
    params: {
      reference: initRes.body.data.reference
    }
  });
  const verifyRes = createMockResponse();

  await verifyPayment(verifyReq, verifyRes);

  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.body.success, true);
  assert.equal(verifyRes.body.data.order.status, 'paid');
  assert.equal(verifyRes.body.data.order.items[0].artwork.frameColor, 'Black');
  assert.equal(
    verifyRes.body.data.order.amount,
    verifyRes.body.data.order.subtotal + verifyRes.body.data.order.shipping + verifyRes.body.data.order.taxAmount - verifyRes.body.data.order.discountAmount
  );
});

test('admin order lifecycle updates status and records audit entries', async () => {
  const product = getArtworksState().find((item) => item.productType !== 'fashion' && item.inStock !== false);
  assert.ok(product, 'expected an in-stock artwork test fixture');

  getStorefrontSettingsState().payment.paymentMode = 'test';

  const initReq = createMockRequest({
    method: 'POST',
    originalUrl: '/api/payment/initialize',
    body: {
      email: 'buyer@example.com',
      customerInfo: {
        firstName: 'Buyer',
        lastName: 'Example',
        phone: '+2330000000',
        address: '1 Art Street',
        city: 'Accra',
        country: 'Ghana'
      },
      items: [{ productId: product.id, quantity: 1 }]
    }
  });
  const initRes = createMockResponse();
  await initializePayment(initReq, initRes);

  const verifyReq = createMockRequest({
    method: 'GET',
    originalUrl: `/api/payment/verify/${initRes.body.data.reference}`,
    params: { reference: initRes.body.data.reference }
  });
  const verifyRes = createMockResponse();
  await verifyPayment(verifyReq, verifyRes);

  const statusReq = createAuthenticatedAdminRequest({
    method: 'PATCH',
    originalUrl: `/api/orders/${initRes.body.data.reference}/status`,
    params: { reference: initRes.body.data.reference },
    body: { status: 'shipped' }
  });
  const statusRes = createMockResponse();

  await updateOrderStatus(statusReq, statusRes);

  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.body.data.status, 'shipped');

  const auditLog = getAdminAuditLogsState().find((entry) => entry.action === 'order.status.update');
  assert.ok(auditLog);
  assert.equal(auditLog.targetId, initRes.body.data.reference);
});
