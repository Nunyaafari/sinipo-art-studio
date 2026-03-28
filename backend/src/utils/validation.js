export const createHttpError = (statusCode, message, meta = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, meta);
  return error;
};

export const hasValue = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
};

export const normalizeString = (value, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

export const normalizeEmail = (value) => normalizeString(value).toLowerCase();

export const assertRequiredFields = (source, fields) => {
  const missing = fields.filter(({ key }) => !hasValue(source?.[key]));

  if (missing.length > 0) {
    throw createHttpError(
      400,
      `Missing required fields: ${missing.map((field) => field.label || field.key).join(', ')}`
    );
  }
};

export const assertValidEmail = (value, message = 'Invalid email format') => {
  const normalizedEmail = normalizeEmail(value);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw createHttpError(400, message);
  }

  return normalizedEmail;
};

export const assertObject = (value, fieldName, options = {}) => {
  const { allowArray = false } = options;
  const isObject = typeof value === 'object' && value !== null;
  const isValidObject = allowArray ? isObject : isObject && !Array.isArray(value);

  if (!isValidObject) {
    throw createHttpError(400, `${fieldName} must be a valid object`);
  }

  return value;
};

export const assertNonEmptyArray = (value, fieldName) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw createHttpError(400, `${fieldName} must include at least one item`);
  }

  return value;
};

export const assertAllowedValue = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    throw createHttpError(400, `${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return value;
};

export const assertMinLength = (value, minLength, message) => {
  const normalizedValue = typeof value === 'string' ? value : '';

  if (normalizedValue.length < minLength) {
    throw createHttpError(400, message);
  }

  return normalizedValue;
};

export const parseNumberField = (value, fieldName, options = {}) => {
  const {
    integer = false,
    min,
    max,
    required = true,
    defaultValue
  } = options;

  if (!hasValue(value)) {
    if (!required) {
      return defaultValue;
    }

    throw createHttpError(400, `${fieldName} is required`);
  }

  const parsed = integer ? Number.parseInt(value, 10) : Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw createHttpError(400, `${fieldName} must be a valid ${integer ? 'integer' : 'number'}`);
  }

  if (min !== undefined && parsed < min) {
    throw createHttpError(400, `${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && parsed > max) {
    throw createHttpError(400, `${fieldName} must be at most ${max}`);
  }

  return parsed;
};
