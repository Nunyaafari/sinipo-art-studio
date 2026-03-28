import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getUsersState, savePersistentState } from '../storage/persistentState.js';
import {
  assertMinLength,
  assertRequiredFields,
  assertValidEmail,
  normalizeEmail,
  normalizeString
} from '../utils/validation.js';

dotenv.config();

const users = getUsersState();
const DEFAULT_JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const isProductionEnvironment = process.env.NODE_ENV === 'production';
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET !== DEFAULT_JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (isProductionEnvironment) {
    throw new Error('JWT_SECRET must be configured in production.');
  }

  console.warn('JWT_SECRET is not configured. Using an ephemeral development secret for this process.');
  return `dev-jwt-${uuidv4()}`;
})();
const getSafeUserId = (user) => {
  const parsed = Number.parseInt(user?.id, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};
const DEFAULT_FIREBASE_WEB_API_KEY = 'AIzaSyBVW6_VxOrMt0gVbDExj8I1SWubk1Crntw';
const SOCIAL_PROVIDER_MAP = {
  google: 'google.com',
  facebook: 'facebook.com'
};
const getSafePasswordHash = (user) => (typeof user?.password === 'string' ? user.password : '');
const findUserByEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  return users.find((user) => normalizeEmail(user?.email) === normalizedEmail) || null;
};
const findUserIndexById = (userId) => users.findIndex((user) => getSafeUserId(user) === Number.parseInt(userId, 10));
const getNextUserId = () => Math.max(0, ...users.map((user) => getSafeUserId(user))) + 1;
const getSafeUsers = () => users.filter((user) => normalizeEmail(user?.email));
const getAdminCount = () => users.filter((user) => user?.role === 'admin').length;

const JWT_EXPIRES_IN = '7d';
const getFirebaseWebApiKey = () =>
  process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_WEB_API_KEY;

const splitDisplayName = (displayName = '') => {
  const [firstName = '', ...rest] = normalizeString(displayName).split(' ').filter(Boolean);

  return {
    firstName,
    lastName: rest.join(' ')
  };
};

const createAuthResponse = (user, message) => {
  const token = generateToken(user.id);
  const { password: _, verificationToken: __, ...userWithoutSensitiveData } = user;

  return {
    success: true,
    message,
    data: {
      user: userWithoutSensitiveData,
      token
    }
  };
};

const verifyFirebaseIdentityToken = async (provider, idToken) => {
  const normalizedProvider = SOCIAL_PROVIDER_MAP[provider];
  if (!normalizedProvider) {
    throw Object.assign(new Error('Unsupported social login provider'), { statusCode: 400 });
  }

  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw Object.assign(new Error('A social identity token is required'), { statusCode: 400 });
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${getFirebaseWebApiKey()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken: idToken.trim() })
    }
  );

  const payload = await response.json().catch(() => ({}));
  const account = Array.isArray(payload?.users) ? payload.users[0] : null;

  if (!response.ok || !account) {
    throw Object.assign(new Error('Unable to verify the social sign-in session'), { statusCode: 401 });
  }

  const providerInfo = Array.isArray(account.providerUserInfo)
    ? account.providerUserInfo.find((entry) => entry?.providerId === normalizedProvider)
    : null;

  if (!providerInfo && account?.providerUserInfo?.length) {
    throw Object.assign(new Error('This social account is linked to a different provider'), {
      statusCode: 401
    });
  }

  const email = assertValidEmail(account.email, 'A verified email is required for social sign-in');
  const displayName = providerInfo?.displayName || account.displayName || '';
  const parsedName = splitDisplayName(displayName);

  return {
    email,
    emailVerified: account.emailVerified !== false,
    firebaseUid: account.localId || providerInfo?.rawId || null,
    firstName: parsedName.firstName || normalizeString(account.firstName),
    lastName: parsedName.lastName || normalizeString(account.lastName),
    providerId: normalizedProvider,
    providerAccountId: providerInfo?.rawId || account.localId || null
  };
};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT Token
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// User Registration
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    assertRequiredFields(req.body, [
      { key: 'email', label: 'email' },
      { key: 'password', label: 'password' },
      { key: 'firstName', label: 'firstName' },
      { key: 'lastName', label: 'lastName' }
    ]);

    const normalizedEmail = assertValidEmail(email);
    assertMinLength(password, 8, 'Password must be at least 8 characters long');

    // Check if user already exists
    const existingUser = findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw Object.assign(new Error('User with this email already exists'), { statusCode: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      id: getNextUserId(),
      email: normalizedEmail,
      password: hashedPassword,
      firstName: normalizeString(firstName),
      lastName: normalizeString(lastName),
      role: 'user',
      isVerified: false,
      verificationToken: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    savePersistentState();

    res.status(201).json(createAuthResponse(newUser, 'User registered successfully'));

  } catch (error) {
    console.error('Registration error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Registration failed' : error.message,
      message: error.message
    });
  }
};

// User Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    assertRequiredFields(req.body, [
      { key: 'email', label: 'email' },
      { key: 'password', label: 'password' }
    ]);
    const normalizedEmail = assertValidEmail(email);

    // Find user
    const user = findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check password
    const passwordHash = getSafePasswordHash(user);
    if (!passwordHash) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    savePersistentState();

    res.json(createAuthResponse(user, 'Login successful'));

  } catch (error) {
    console.error('Login error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Login failed' : error.message,
      message: error.message
    });
  }
};

export const getBootstrapStatus = async (_req, res) => {
  const adminCount = getAdminCount();

  res.json({
    success: true,
    data: {
      requiresAdminSetup: adminCount === 0,
      adminCount,
      userCount: getSafeUsers().length
    }
  });
};

export const bootstrapAdmin = async (req, res) => {
  try {
    if (getAdminCount() > 0) {
      return res.status(409).json({
        error: 'Admin setup is already complete'
      });
    }

    const { email, password, firstName, lastName } = req.body;
    assertRequiredFields(req.body, [
      { key: 'email', label: 'email' },
      { key: 'password', label: 'password' },
      { key: 'firstName', label: 'firstName' },
      { key: 'lastName', label: 'lastName' }
    ]);

    const normalizedEmail = assertValidEmail(email);
    assertMinLength(password, 8, 'Password must be at least 8 characters long');

    const existingUser = findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        error: 'A user with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const timestamp = new Date().toISOString();

    const adminUser = {
      id: getNextUserId(),
      email: normalizedEmail,
      password: hashedPassword,
      firstName: normalizeString(firstName),
      lastName: normalizeString(lastName),
      role: 'admin',
      isVerified: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    users.push(adminUser);
    savePersistentState();

    return res.status(201).json(createAuthResponse(adminUser, 'Admin account created successfully'));
  } catch (error) {
    console.error('Admin bootstrap error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: statusCode === 500 ? 'Admin setup failed' : error.message,
      message: error.message
    });
  }
};

export const socialLogin = async (req, res) => {
  try {
    const { provider, idToken } = req.body;
    const socialAccount = await verifyFirebaseIdentityToken(provider, idToken);
    const existingUser = findUserByEmail(socialAccount.email);
    const timestamp = new Date().toISOString();

    let user;

    if (existingUser) {
      existingUser.firstName = existingUser.firstName || socialAccount.firstName || 'Customer';
      existingUser.lastName = existingUser.lastName || socialAccount.lastName || provider;
      existingUser.isVerified = socialAccount.emailVerified || existingUser.isVerified;
      existingUser.socialProvider = socialAccount.providerId;
      existingUser.socialProviderAccountId = socialAccount.providerAccountId;
      existingUser.firebaseUid = socialAccount.firebaseUid;
      existingUser.lastLogin = timestamp;
      existingUser.updatedAt = timestamp;
      user = existingUser;
    } else {
      user = {
        id: getNextUserId(),
        email: socialAccount.email,
        password: null,
        firstName: socialAccount.firstName || 'Customer',
        lastName: socialAccount.lastName || (provider === 'google' ? 'Google' : 'Facebook'),
        role: 'user',
        isVerified: socialAccount.emailVerified,
        socialProvider: socialAccount.providerId,
        socialProviderAccountId: socialAccount.providerAccountId,
        firebaseUid: socialAccount.firebaseUid,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLogin: timestamp
      };

      users.push(user);
    }

    savePersistentState();

    res.json(createAuthResponse(user, `${provider === 'google' ? 'Google' : 'Facebook'} login successful`));
  } catch (error) {
    console.error('Social login error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Social login failed' : error.message,
      message: error.message
    });
  }
};

// Get Current User Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = users.find((candidate) => getSafeUserId(candidate) === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Return user data (without password)
    const { password: _, verificationToken: __, ...userWithoutSensitiveData } = user;

    res.json({
      success: true,
      data: userWithoutSensitiveData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
};

// Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phone, address, city, country } = req.body;

    const userIndex = findUserIndexById(userId);
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update user data
    const updatedUser = {
      ...users[userIndex],
      firstName: firstName || users[userIndex].firstName,
      lastName: lastName || users[userIndex].lastName,
      phone: phone || users[userIndex].phone,
      address: address || users[userIndex].address,
      city: city || users[userIndex].city,
      country: country || users[userIndex].country,
      updatedAt: new Date().toISOString()
    };

    users[userIndex] = updatedUser;
    savePersistentState();

    // Return updated user (without password)
    const { password: _, verificationToken: __, ...userWithoutSensitiveData } = updatedUser;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userWithoutSensitiveData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long'
      });
    }

    const userIndex = findUserIndexById(userId);
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[userIndex].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    users[userIndex].password = hashedNewPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    savePersistentState();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: error.message
    });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    const user = findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update user with reset token
    const userIndex = findUserIndexById(user.id);
    users[userIndex].resetPasswordToken = resetToken;
    users[userIndex].resetPasswordExpires = resetExpires.toISOString();
    users[userIndex].updatedAt = new Date().toISOString();
    savePersistentState();

    // In production, send email with reset link
    // For now, just return success message
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
      // In development, include the reset token
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to process password reset',
      message: error.message
    });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long'
      });
    }

    const userIndex = users.findIndex(u => 
      u.resetPasswordToken === token && 
      new Date(u.resetPasswordExpires) > new Date()
    );

    if (userIndex === -1) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user
    users[userIndex].password = hashedPassword;
    users[userIndex].resetPasswordToken = null;
    users[userIndex].resetPasswordExpires = null;
    users[userIndex].updatedAt = new Date().toISOString();
    savePersistentState();

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: error.message
    });
  }
};

// Verify Email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    const userIndex = users.findIndex((user) => user?.verificationToken === token);
    if (userIndex === -1) {
      return res.status(400).json({
        error: 'Invalid verification token'
      });
    }

    // Update user
    users[userIndex].isVerified = true;
    users[userIndex].verificationToken = null;
    users[userIndex].updatedAt = new Date().toISOString();
    savePersistentState();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Failed to verify email',
      message: error.message
    });
  }
};

// Resend Verification Email
export const resendVerification = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userIndex = findUserIndexById(userId);
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (users[userIndex].isVerified) {
      return res.status(400).json({
        error: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = uuidv4();
    users[userIndex].verificationToken = verificationToken;
    users[userIndex].updatedAt = new Date().toISOString();
    savePersistentState();

    // In production, send verification email
    res.json({
      success: true,
      message: 'Verification email sent',
      // In development, include the token
      ...(process.env.NODE_ENV === 'development' && { verificationToken })
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Failed to resend verification',
      message: error.message
    });
  }
};

// Logout (client-side token removal, but we can track it)
export const logout = async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just return success and let the client remove the token
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
};

// Get User Statistics (for admin)
export const getUserStats = async (req, res) => {
  try {
    const safeUsers = getSafeUsers();
    const stats = {
      total: safeUsers.length,
      verified: safeUsers.filter((user) => user.isVerified).length,
      unverified: safeUsers.filter((user) => !user.isVerified).length,
      admins: safeUsers.filter((user) => user.role === 'admin').length,
      regularUsers: safeUsers.filter((user) => user.role === 'user').length
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics',
      message: error.message
    });
  }
};

// Export users for use in other modules
export const getUserById = (userId) =>
  users.find((user) => getSafeUserId(user) === Number.parseInt(userId, 10)) || null;

export const getUserByEmail = (email) => {
  return findUserByEmail(email);
};

export const updateUserRecord = (userId, updates) => {
  const userIndex = findUserIndexById(userId);
  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  savePersistentState();

  return users[userIndex];
};

export { users, verifyToken };
