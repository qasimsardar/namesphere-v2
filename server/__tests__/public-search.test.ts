import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { registerRoutes } from '../routes';
import express from 'express';
import { 
  createTestUser, 
  createTestIdentity, 
  createAuthenticatedTestUser,
  expectErrorResponse, 
  expectSuccessResponse, 
  cleanupTestData,
  CONTEXTS
} from './test-utils';

describe('Public Search Endpoints', () => {
  let app: Express;

  beforeAll(async () => {
    app = express();
    await registerRoutes(app);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/public/identities/search', () => {
    test('should search discoverable identities by context', async () => {
      // Create users with discoverable identities
      const { user: user1 } = await createTestUser();
      const { user: user2 } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app); // For authentication

      await createTestIdentity(user1.id, {
        personalName: 'John Engineer',
        context: 'work',
        title: 'Software Engineer',
        isDiscoverable: true
      });

      await createTestIdentity(user2.id, {
        personalName: 'Jane Developer',
        context: 'work', 
        title: 'Senior Developer',
        isDiscoverable: true
      });

      // Create non-discoverable identity (should not appear in search)
      await createTestIdentity(user1.id, {
        personalName: 'Private Identity',
        context: 'work',
        isDiscoverable: false
      });

      const response = await agent
        .get('/api/public/identities/search?context=work');

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('identities');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body.identities).toHaveLength(2);
      expect(response.body.identities.some((id: any) => id.personalName === 'John Engineer')).toBe(true);
      expect(response.body.identities.some((id: any) => id.personalName === 'Jane Developer')).toBe(true);
      expect(response.body.identities.some((id: any) => id.personalName === 'Private Identity')).toBe(false);
    });

    test('should search by query string', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'Alice Engineer',
        context: 'work',
        title: 'Software Engineer',
        isDiscoverable: true
      });

      await createTestIdentity(user.id, {
        personalName: 'Bob Designer',
        context: 'work',
        title: 'UX Designer', 
        isDiscoverable: true
      });

      const response = await agent
        .get('/api/public/identities/search?context=work&q=engineer');

      expectSuccessResponse(response);
      expect(response.body.identities).toHaveLength(1);
      expect(response.body.identities[0]).toHaveProperty('personalName', 'Alice Engineer');
    });

    test('should search in other names', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'Robert Smith',
        otherNames: ['Bob', 'Bobby'],
        context: 'social',
        isDiscoverable: true
      });

      const response = await agent
        .get('/api/public/identities/search?context=social&q=bobby');

      expectSuccessResponse(response);
      expect(response.body.identities).toHaveLength(1);
      expect(response.body.identities[0]).toHaveProperty('personalName', 'Robert Smith');
    });

    test('should search in title field', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'John Doe',
        context: 'work',
        title: 'Senior Software Architect',
        isDiscoverable: true
      });

      const response = await agent
        .get('/api/public/identities/search?context=work&q=architect');

      expectSuccessResponse(response);
      expect(response.body.identities).toHaveLength(1);
      expect(response.body.identities[0]).toHaveProperty('title', 'Senior Software Architect');
    });

    test('should filter by context only', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'Work Identity',
        context: 'work',
        isDiscoverable: true
      });

      await createTestIdentity(user.id, {
        personalName: 'Gaming Identity', 
        context: 'gaming',
        isDiscoverable: true
      });

      // Search work context only
      const workResponse = await agent
        .get('/api/public/identities/search?context=work');

      expectSuccessResponse(workResponse);
      expect(workResponse.body.identities).toHaveLength(1);
      expect(workResponse.body.identities[0]).toHaveProperty('context', 'work');

      // Search gaming context only  
      const gamingResponse = await agent
        .get('/api/public/identities/search?context=gaming');

      expectSuccessResponse(gamingResponse);
      expect(gamingResponse.body.identities).toHaveLength(1);
      expect(gamingResponse.body.identities[0]).toHaveProperty('context', 'gaming');
    });

    test('should respect limit parameter', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      // Create 5 identities
      for (let i = 0; i < 5; i++) {
        await createTestIdentity(user.id, {
          personalName: `Identity ${i}`,
          context: 'work',
          isDiscoverable: true
        });
      }

      const response = await agent
        .get('/api/public/identities/search?context=work&limit=3');

      expectSuccessResponse(response);
      expect(response.body.identities).toHaveLength(3);
      expect(response.body).toHaveProperty('hasMore', true);
    });

    test('should reject missing context', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .get('/api/public/identities/search');

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject invalid context', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .get('/api/public/identities/search?context=invalid');

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject invalid limit', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .get('/api/public/identities/search?context=work&limit=100');

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/public/identities/search?context=work');

      expectErrorResponse(response, 401, 'Unauthorized');
    });

    test('should return empty results when no matches', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .get('/api/public/identities/search?context=work&q=nonexistent');

      expectSuccessResponse(response);
      expect(response.body.identities).toHaveLength(0);
      expect(response.body).toHaveProperty('hasMore', false);
    });
  });

  describe('GET /api/public/identities/:id', () => {
    test('should return public identity details', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      const identity = await createTestIdentity(user.id, {
        personalName: 'Public Identity',
        context: 'work',
        title: 'Software Engineer',
        pronouns: 'they/them',
        socialLinks: { github: 'https://github.com/testuser' },
        isDiscoverable: true
      });

      const response = await agent
        .get(`/api/public/identities/${identity.id}`);

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('id', identity.id);
      expect(response.body).toHaveProperty('personalName', 'Public Identity');
      expect(response.body).toHaveProperty('context', 'work');
      expect(response.body).toHaveProperty('title', 'Software Engineer');
      expect(response.body).toHaveProperty('pronouns', 'they/them');
      expect(response.body).toHaveProperty('socialLinks');
      expect(response.body.socialLinks).toHaveProperty('github');
      
      // Should not include private fields
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body).not.toHaveProperty('isDiscoverable');
      expect(response.body).not.toHaveProperty('createdAt');
      expect(response.body).not.toHaveProperty('updatedAt');
    });

    test('should reject access to non-discoverable identity', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      const identity = await createTestIdentity(user.id, {
        personalName: 'Private Identity',
        isDiscoverable: false
      });

      const response = await agent
        .get(`/api/public/identities/${identity.id}`);

      expectErrorResponse(response, 404, 'Identity not found');
    });

    test('should reject non-existent identity', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .get('/api/public/identities/non-existent-id');

      expectErrorResponse(response, 404, 'Identity not found');
    });

    test('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/public/identities/some-id');

      expectErrorResponse(response, 401, 'Unauthorized');
    });
  });

  describe('Content Negotiation', () => {
    test('should return JSON by default', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'Test Identity',
        context: 'work',
        isDiscoverable: true
      });

      const response = await agent
        .get('/api/public/identities/search?context=work');

      expectSuccessResponse(response);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('identities');
    });

    test('should return CSV when requested', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'Test Identity',
        context: 'work',
        isDiscoverable: true
      });

      const response = await agent
        .get('/api/public/identities/search?context=work')
        .set('Accept', 'text/csv');

      expectSuccessResponse(response);
      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(typeof response.text).toBe('string');
      expect(response.text).toContain('personalName');
      expect(response.text).toContain('Test Identity');
    });

    test('should return XML when requested', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'Test Identity',
        context: 'work',
        isDiscoverable: true
      });

      const response = await agent
        .get('/api/public/identities/search?context=work')
        .set('Accept', 'application/xml');

      expectSuccessResponse(response);
      expect(response.headers['content-type']).toMatch(/application\/xml/);
      expect(typeof response.text).toBe('string');
      expect(response.text).toContain('<?xml version="1.0"');
      expect(response.text).toContain('<identities>');
      expect(response.text).toContain('Test Identity');
    });

    test('should return JSON:API when requested', async () => {
      const { user } = await createTestUser();
      const { agent } = await createAuthenticatedTestUser(app);

      await createTestIdentity(user.id, {
        personalName: 'Test Identity',
        context: 'work',
        isDiscoverable: true
      });

      const response = await agent
        .get('/api/public/identities/search?context=work')
        .set('Accept', 'application/vnd.api+json');

      expectSuccessResponse(response);
      expect(response.headers['content-type']).toMatch(/application\/vnd\.api\+json/);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('links');
      expect(response.body).toHaveProperty('meta');
    });
  });
});