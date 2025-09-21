import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { registerRoutes } from '../routes';
import express from 'express';
import { createTestUser, expectErrorResponse, expectSuccessResponse, cleanupTestData } from './test-utils';

describe('Authentication Endpoints', () => {
  let app: Express;

  beforeAll(async () => {
    app = express();
    await registerRoutes(app);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/register', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        username: `testuser${Date.now()}`,
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
        email: `test${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expectSuccessResponse(response, 201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        username: `testuser${Date.now()}`,
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject registration with mismatched passwords', async () => {
      const userData = {
        username: `testuser${Date.now()}`,
        password: 'testpassword123',
        confirmPassword: 'differentpassword',
        email: `test${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expectErrorResponse(response, 400, 'match');
    });

    test('should reject registration with short password', async () => {
      const userData = {
        username: `testuser${Date.now()}`,
        password: '123',
        confirmPassword: '123',
        email: `test${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject registration with duplicate username', async () => {
      const username = `testuser${Date.now()}`;
      const userData = {
        username,
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
        email: `test${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User'
      };

      // First registration should succeed
      await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      // Second registration with same username should fail
      const duplicateData = {
        ...userData,
        email: `test2${Date.now()}@example.com`
      };

      const response = await request(app)
        .post('/api/register')
        .send(duplicateData);

      expectErrorResponse(response, 409, 'already exists');
    });
  });

  describe('POST /api/login/local', () => {
    test('should login with valid credentials', async () => {
      const password = 'testpassword123';
      const { credentials } = await createTestUser({}, { password });

      const response = await request(app)
        .post('/api/login/local')
        .send({
          username: credentials.username,
          password
        });

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    test('should reject login with invalid username', async () => {
      const response = await request(app)
        .post('/api/login/local')
        .send({
          username: 'nonexistentuser',
          password: 'testpassword123'
        });

      expectErrorResponse(response, 401, 'Invalid username or password');
    });

    test('should reject login with invalid password', async () => {
      const { credentials } = await createTestUser();

      const response = await request(app)
        .post('/api/login/local')
        .send({
          username: credentials.username,
          password: 'wrongpassword'
        });

      expectErrorResponse(response, 401, 'Invalid username or password');
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/login/local')
        .send({});

      expectErrorResponse(response, 400, 'Validation');
    });
  });

  describe('GET /api/auth/user', () => {
    test('should return user data when authenticated', async () => {
      const password = 'testpassword123';
      const { credentials } = await createTestUser({}, { password });

      // Login first
      const agent = request.agent(app);
      await agent
        .post('/api/login/local')
        .send({
          username: credentials.username,
          password
        })
        .expect(200);

      // Get user data
      const response = await agent
        .get('/api/auth/user');

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('authProvider', 'local');
    });

    test('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/user');

      expectErrorResponse(response, 401, 'Unauthorized');
    });
  });

  describe('POST /api/logout', () => {
    test('should logout authenticated user', async () => {
      const password = 'testpassword123';
      const { credentials } = await createTestUser({}, { password });

      // Login first
      const agent = request.agent(app);
      await agent
        .post('/api/login/local')
        .send({
          username: credentials.username,
          password
        })
        .expect(200);

      // Logout
      const response = await agent
        .post('/api/logout');

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');

      // Verify user is logged out
      const userResponse = await agent
        .get('/api/auth/user');

      expectErrorResponse(userResponse, 401, 'Unauthorized');
    });
  });
});