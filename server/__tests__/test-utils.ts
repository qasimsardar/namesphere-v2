import { db } from '../db';
import { users, userCredentials, identities } from '@shared/schema';
import type { User, Identity, UserCredentials, InsertIdentity } from '@shared/schema';
import { hashPassword } from '../replitAuth';
import { nanoid } from 'nanoid';
import request from 'supertest';
import type { Express } from 'express';
import { expect } from '@jest/globals';

// Test data generators
export const generateTestUser = (overrides: Partial<User> = {}): User => ({
  id: `test-user-${nanoid(8)}`,
  email: `test-${nanoid(8)}@example.com`,
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: null,
  authProvider: 'local',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const generateTestCredentials = (userId: string, overrides: Partial<UserCredentials> = {}): UserCredentials => ({
  id: `test-cred-${nanoid(8)}`,
  userId,
  username: `testuser${nanoid(6)}`,
  passwordHash: '', // Will be set properly in createTestUser
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const generateTestIdentity = (userId: string, overrides: Partial<InsertIdentity> = {}): InsertIdentity => ({
  personalName: 'Test Identity',
  context: 'work',
  otherNames: ['Test', 'Tester'],
  pronouns: 'they/them',
  title: 'Software Engineer',
  avatarUrl: 'https://example.com/avatar.jpg',
  socialLinks: { github: 'https://github.com/testuser' },
  isPrimary: false,
  isDiscoverable: true,
  ...overrides
});

// Database helpers
export const createTestUser = async (userOverrides: Partial<User> = {}, credentialsOverrides: { username?: string, password?: string } = {}): Promise<{ user: User, credentials: UserCredentials }> => {
  const userData = generateTestUser(userOverrides);
  
  // Insert user
  const [user] = await db.insert(users).values(userData).returning();
  
  // Create credentials if it's a local user
  if (user.authProvider === 'local') {
    const password = credentialsOverrides.password || 'testpassword123';
    const passwordHash = await hashPassword(password);
    
    const credentialsData = generateTestCredentials(user.id, {
      username: credentialsOverrides.username,
      passwordHash
    });
    
    const [credentials] = await db.insert(userCredentials).values(credentialsData).returning();
    return { user, credentials };
  }
  
  // For OAuth users, return empty credentials
  return { user, credentials: {} as UserCredentials };
};

export const createTestIdentity = async (userId: string, identityOverrides: Partial<InsertIdentity> = {}): Promise<Identity> => {
  const identityData = generateTestIdentity(userId, identityOverrides);
  const [identity] = await db.insert(identities).values({ ...identityData, userId }).returning();
  return identity;
};

// Authentication helpers for testing
export const loginTestUser = async (app: Express, username: string, password: string): Promise<request.Agent> => {
  const agent = request.agent(app);
  
  await agent
    .post('/api/login/local')
    .send({ username, password })
    .expect(200);
    
  return agent;
};

export const createAuthenticatedTestUser = async (app: Express, userOverrides: Partial<User> = {}, credentialsOverrides: { username?: string, password?: string } = {}): Promise<{ user: User, credentials: UserCredentials, agent: request.Agent }> => {
  const { user, credentials } = await createTestUser(userOverrides, credentialsOverrides);
  const agent = await loginTestUser(app, credentials.username, credentialsOverrides.password || 'testpassword123');
  
  return { user, credentials, agent };
};

// Cleanup helpers
export const cleanupTestData = async (): Promise<void> => {
  // Clean up in reverse order of dependencies
  await db.execute(`DELETE FROM audit_logs WHERE user_id LIKE 'test-%'`);
  await db.execute(`DELETE FROM identities WHERE user_id LIKE 'test-%'`);
  await db.execute(`DELETE FROM user_credentials WHERE user_id LIKE 'test-%'`);
  await db.execute(`DELETE FROM users WHERE id LIKE 'test-%'`);
};

// Assert helpers
export const expectErrorResponse = (response: request.Response, statusCode: number, messageContains?: string) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('message');
  if (messageContains) {
    expect(response.body.message).toContain(messageContains);
  }
};

export const expectSuccessResponse = (response: request.Response, statusCode: number = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toBeDefined();
};

// Mock data sets
export const CONTEXTS = ['work', 'gaming', 'social', 'legal'] as const;

export const SAMPLE_SOCIAL_LINKS = {
  github: 'https://github.com/testuser',
  linkedin: 'https://linkedin.com/in/testuser',
  twitter: 'https://twitter.com/testuser'
};