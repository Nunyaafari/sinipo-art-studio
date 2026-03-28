export const createMockRequest = (overrides = {}) => {
  const headers = overrides.headers || {};

  return {
    body: {},
    params: {},
    query: {},
    headers,
    method: 'GET',
    originalUrl: '/',
    ip: '127.0.0.1',
    get(headerName) {
      return headers[headerName.toLowerCase()] || headers[headerName] || null;
    },
    ...overrides
  };
};

export const createMockAdminUser = (overrides = {}) => ({
  id: 1,
  email: 'admin@sinipo.art',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  authMethod: 'jwt',
  ...overrides
});

export const createAuthenticatedAdminRequest = (overrides = {}) => {
  const headers = {
    authorization: 'Bearer test-admin-token',
    'user-agent': 'node-test',
    ...(overrides.headers || {})
  };

  return createMockRequest({
    ...overrides,
    headers,
    adminUser: overrides.adminUser || createMockAdminUser()
  });
};

export const createMockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
});
