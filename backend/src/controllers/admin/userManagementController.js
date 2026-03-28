import bcrypt from 'bcryptjs';
import { users } from '../authController.js';
import {
  getUserBucketValue,
  removeUserBucketValue,
  savePersistentState
} from '../../storage/persistentState.js';
import {
  assertAllowedValue,
  assertMinLength,
  assertRequiredFields,
  assertValidEmail,
  normalizeEmail,
  normalizeString
} from '../../utils/validation.js';

const MANAGED_ROLES = ['admin', 'manager', 'admin_viewer'];
const serializableUserFields = [
  'id',
  'email',
  'firstName',
  'lastName',
  'role',
  'isVerified',
  'phone',
  'address',
  'city',
  'country',
  'lastLogin',
  'createdAt',
  'updatedAt'
];

const getSafeUserId = (user) => {
  const parsed = Number.parseInt(user?.id, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const serializeUser = (user) =>
  serializableUserFields.reduce((result, field) => {
    result[field] = user?.[field] ?? null;
    return result;
  }, {});

const buildUserStats = (userList) => ({
  total: userList.length,
  verified: userList.filter((user) => user.isVerified).length,
  admins: userList.filter((user) => user.role === 'admin').length,
  managers: userList.filter((user) => user.role === 'manager').length,
  viewers: userList.filter((user) => user.role === 'admin_viewer').length
});

const getNextUserId = () => Math.max(0, ...users.map((user) => getSafeUserId(user))) + 1;

const findUserIndexById = (userId) =>
  users.findIndex((candidate) => getSafeUserId(candidate) === Number.parseInt(userId, 10));

const countAdmins = () => users.filter((user) => user.role === 'admin').length;

const getFilteredUsers = ({ search = '', role = 'all' } = {}) => {
  const normalizedSearch = normalizeString(search).toLowerCase();

  return users
    .filter((user) => MANAGED_ROLES.includes(user?.role))
    .filter((user) => normalizeEmail(user?.email))
    .filter((user) => {
      if (role !== 'all' && user.role !== role) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        user.email,
        user.firstName,
        user.lastName,
        `${user.firstName || ''} ${user.lastName || ''}`,
        user.role
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) => {
      const rightTime = new Date(right.createdAt || 0).getTime();
      const leftTime = new Date(left.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
};

export const getAdminUsers = async (req, res) => {
  try {
    const filteredUsers = getFilteredUsers({
      search: req.query.search,
      role: req.query.role
    });

    res.json({
      success: true,
      data: {
        users: filteredUsers.map(serializeUser),
        stats: buildUserStats(filteredUsers)
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      error: 'Failed to load users',
      message: error.message
    });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'admin_viewer', isVerified = true } = req.body;
    assertRequiredFields(req.body, [
      { key: 'email', label: 'email' },
      { key: 'password', label: 'password' },
      { key: 'firstName', label: 'firstName' },
      { key: 'lastName', label: 'lastName' }
    ]);

    const normalizedEmail = assertValidEmail(email);
    const normalizedRole = assertAllowedValue(role, MANAGED_ROLES, 'role');
    assertMinLength(password, 8, 'Password must be at least 8 characters long');

    const existingUser = users.find((candidate) => normalizeEmail(candidate?.email) === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        error: 'A user with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const timestamp = new Date().toISOString();
    const newUser = {
      id: getNextUserId(),
      email: normalizedEmail,
      password: passwordHash,
      firstName: normalizeString(firstName),
      lastName: normalizeString(lastName),
      role: normalizedRole,
      isVerified: Boolean(isVerified),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    users.push(newUser);
    savePersistentState();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: serializeUser(newUser)
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Failed to create user' : error.message,
      message: error.message
    });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userIndex = findUserIndexById(id);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const existingUser = users[userIndex];
    const nextEmail = req.body.email ? assertValidEmail(req.body.email) : existingUser.email;
    const nextRole = req.body.role
      ? assertAllowedValue(req.body.role, MANAGED_ROLES, 'role')
      : existingUser.role;

    const duplicateUser = users.find(
      (candidate) =>
        getSafeUserId(candidate) !== getSafeUserId(existingUser) &&
        normalizeEmail(candidate?.email) === nextEmail
    );

    if (duplicateUser) {
      return res.status(400).json({
        error: 'Another user already uses this email address'
      });
    }

    if (req.adminUser?.id === getSafeUserId(existingUser) && nextRole !== existingUser.role) {
      return res.status(400).json({
        error: 'You cannot change your own role from this screen'
      });
    }

    if (existingUser.role === 'admin' && nextRole !== 'admin' && countAdmins() <= 1) {
      return res.status(400).json({
        error: 'At least one admin account must remain'
      });
    }

    users[userIndex] = {
      ...existingUser,
      email: nextEmail,
      firstName: req.body.firstName !== undefined ? normalizeString(req.body.firstName) : existingUser.firstName,
      lastName: req.body.lastName !== undefined ? normalizeString(req.body.lastName) : existingUser.lastName,
      role: nextRole,
      isVerified: req.body.isVerified !== undefined ? Boolean(req.body.isVerified) : existingUser.isVerified,
      phone: req.body.phone !== undefined ? normalizeString(req.body.phone) : existingUser.phone,
      address: req.body.address !== undefined ? normalizeString(req.body.address) : existingUser.address,
      city: req.body.city !== undefined ? normalizeString(req.body.city) : existingUser.city,
      country: req.body.country !== undefined ? normalizeString(req.body.country) : existingUser.country,
      updatedAt: new Date().toISOString()
    };

    savePersistentState();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: serializeUser(users[userIndex])
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Failed to update user' : error.message,
      message: error.message
    });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userIndex = findUserIndexById(id);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const targetUser = users[userIndex];
    const targetUserId = getSafeUserId(targetUser);

    if (req.adminUser?.id === targetUserId) {
      return res.status(400).json({
        error: 'You cannot delete your own account from this screen'
      });
    }

    if (targetUser.role === 'admin' && countAdmins() <= 1) {
      return res.status(400).json({
        error: 'At least one admin account must remain'
      });
    }

    users.splice(userIndex, 1);

    ['userWishlists', 'userAddresses', 'userOrderHistory', 'userReviews', 'loyaltyPoints'].forEach((bucketName) => {
      const existingValue = getUserBucketValue(bucketName, targetUserId, null);
      if (existingValue !== null) {
        removeUserBucketValue(bucketName, targetUserId);
      }
    });

    savePersistentState();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    });
  }
};
