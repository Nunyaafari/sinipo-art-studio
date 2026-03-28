import test from 'node:test';
import assert from 'node:assert/strict';
import { createArtwork, deleteArtwork, updateArtwork } from '../src/controllers/admin/artworkController.js';
import { patchMediaAsset, removeMediaAsset } from '../src/controllers/admin/mediaController.js';
import { createAuthenticatedAdminRequest, createMockResponse } from './helpers/http.js';
import { resetPersistentState } from './helpers/state.js';
import { getAdminAuditLogsState } from '../src/storage/persistentState.js';
import { registerMediaAsset } from '../src/utils/mediaAssets.js';

test.beforeEach(() => {
  resetPersistentState();
});

test.after(() => {
  resetPersistentState();
});

test('artwork create, update, and delete record audit trail entries', async () => {
  const createReq = createAuthenticatedAdminRequest({
    method: 'POST',
    originalUrl: '/api/admin/artworks',
    body: {
      title: 'Test Artwork',
      artist: 'Codex',
      price: '250',
      category: 'Abstract',
      style: 'Modern',
      size: 'Medium',
      dimensions: '24x36',
      frameColor: 'Gold',
      description: 'Created in test',
      image: '/uploads/test-artwork.jpg'
    }
  });
  const createRes = createMockResponse();

  await createArtwork(createReq, createRes);

  assert.equal(createRes.statusCode, 201);
  const createdId = createRes.body.data.id;

  const updateReq = createAuthenticatedAdminRequest({
    method: 'PUT',
    originalUrl: `/api/admin/artworks/${createdId}`,
    params: { id: String(createdId) },
    body: {
      title: 'Updated Test Artwork',
      price: '300',
      stockQuantity: '4'
    }
  });
  const updateRes = createMockResponse();

  await updateArtwork(updateReq, updateRes);

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.data.title, 'Updated Test Artwork');

  const deleteReq = createAuthenticatedAdminRequest({
    method: 'DELETE',
    originalUrl: `/api/admin/artworks/${createdId}`,
    params: { id: String(createdId) }
  });
  const deleteRes = createMockResponse();

  await deleteArtwork(deleteReq, deleteRes);

  assert.equal(deleteRes.statusCode, 200);

  const actions = getAdminAuditLogsState().slice(0, 3).map((entry) => entry.action);
  assert.deepEqual(actions, ['artwork.delete', 'artwork.update', 'artwork.create']);
});

test('media update and delete work through the controller and record audit logs', async () => {
  const asset = registerMediaAsset({
    url: '/uploads/test-media.jpg',
    type: 'general',
    title: 'Original title',
    altText: 'Original alt',
    source: 'test'
  });

  const patchReq = createAuthenticatedAdminRequest({
    method: 'PATCH',
    originalUrl: `/api/admin/media/${asset.id}`,
    params: { id: String(asset.id) },
    body: {
      title: 'Updated title',
      altText: 'Updated alt'
    }
  });
  const patchRes = createMockResponse();

  await patchMediaAsset(patchReq, patchRes);

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.data.title, 'Updated title');

  const deleteReq = createAuthenticatedAdminRequest({
    method: 'DELETE',
    originalUrl: `/api/admin/media/${asset.id}`,
    params: { id: String(asset.id) }
  });
  const deleteRes = createMockResponse();

  await removeMediaAsset(deleteReq, deleteRes);

  assert.equal(deleteRes.statusCode, 200);

  const mediaActions = getAdminAuditLogsState()
    .filter((entry) => entry.targetType === 'mediaAsset')
    .map((entry) => entry.action);

  assert.deepEqual(mediaActions.slice(0, 2), ['media.delete', 'media.update']);
});
