import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { registerRoutes } from '../routes';
import express from 'express';
import { 
  createTestUser, 
  createTestIdentity, 
  createAuthenticatedTestUser,
  generateTestIdentity,
  expectErrorResponse, 
  expectSuccessResponse, 
  cleanupTestData,
  CONTEXTS,
  SAMPLE_SOCIAL_LINKS
} from './test-utils';
import type { Identity } from '@shared/schema';

describe('Identity Management Endpoints', () => {
  let app: Express;

  beforeAll(async () => {
    app = express();
    await registerRoutes(app);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/identities', () => {
    test('should return all identities for authenticated user', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      
      // Create test identities
      await createTestIdentity(user.id, { context: 'work', personalName: 'Work Identity' });
      await createTestIdentity(user.id, { context: 'social', personalName: 'Social Identity' });

      const response = await agent
        .get('/api/identities');

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('identities');
      expect(response.body.identities).toHaveLength(2);
      expect(response.body.identities.some((id: Identity) => id.personalName === 'Work Identity')).toBe(true);
      expect(response.body.identities.some((id: Identity) => id.personalName === 'Social Identity')).toBe(true);
    });

    test('should filter identities by context', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      
      await createTestIdentity(user.id, { context: 'work', personalName: 'Work Identity' });
      await createTestIdentity(user.id, { context: 'social', personalName: 'Social Identity' });

      const response = await agent
        .get('/api/identities?context=work');

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('identities');
      expect(response.body.identities).toHaveLength(1);
      expect(response.body.identities[0]).toHaveProperty('personalName', 'Work Identity');
      expect(response.body.identities[0]).toHaveProperty('context', 'work');
    });

    test('should return primary identity when no context filter', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      
      await createTestIdentity(user.id, { context: 'work', personalName: 'Work Identity', isPrimary: false });
      await createTestIdentity(user.id, { context: 'social', personalName: 'Primary Identity', isPrimary: true });

      const response = await agent
        .get('/api/identities');

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('identities');
      expect(response.body).toHaveProperty('primary');
      expect(response.body.primary).toHaveProperty('personalName', 'Primary Identity');
      expect(response.body.primary).toHaveProperty('isPrimary', true);
    });

    test('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/identities');

      expectErrorResponse(response, 401, 'Unauthorized');
    });

    test('should return empty array for user with no identities', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .get('/api/identities');

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('identities');
      expect(response.body.identities).toHaveLength(0);
    });
  });

  describe('POST /api/identities', () => {
    test('should create new identity with valid data', async () => {
      const { agent } = await createAuthenticatedTestUser(app);
      
      const identityData = generateTestIdentity('dummy-id', {
        personalName: 'New Identity',
        context: 'work',
        title: 'Software Engineer',
        pronouns: 'they/them',
        socialLinks: SAMPLE_SOCIAL_LINKS
      });

      const response = await agent
        .post('/api/identities')
        .send(identityData);

      expectSuccessResponse(response, 201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('personalName', 'New Identity');
      expect(response.body).toHaveProperty('context', 'work');
      expect(response.body).toHaveProperty('title', 'Software Engineer');
      expect(response.body).toHaveProperty('socialLinks');
      expect(response.body.socialLinks).toEqual(SAMPLE_SOCIAL_LINKS);
    });

    test('should create primary identity and unset previous primary', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      
      // Create existing primary identity
      await createTestIdentity(user.id, { personalName: 'Old Primary', isPrimary: true });

      const newIdentityData = generateTestIdentity('dummy-id', {
        personalName: 'New Primary',
        isPrimary: true
      });

      const response = await agent
        .post('/api/identities')
        .send(newIdentityData);

      expectSuccessResponse(response, 201);
      expect(response.body).toHaveProperty('isPrimary', true);

      // Verify old primary is no longer primary
      const allIdentitiesResponse = await agent
        .get('/api/identities');

      const oldPrimary = allIdentitiesResponse.body.identities.find((id: Identity) => id.personalName === 'Old Primary');
      expect(oldPrimary).toHaveProperty('isPrimary', false);
    });

    test('should reject invalid context', async () => {
      const { agent } = await createAuthenticatedTestUser(app);
      
      const identityData = generateTestIdentity('dummy-id', {
        context: 'invalid-context' as any
      });

      const response = await agent
        .post('/api/identities')
        .send(identityData);

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject missing required fields', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .post('/api/identities')
        .send({
          context: 'work'
          // Missing personalName
        });

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/identities')
        .send(generateTestIdentity('dummy-id'));

      expectErrorResponse(response, 401, 'Unauthorized');
    });
  });

  describe('GET /api/identities/:id', () => {
    test('should return specific identity for owner', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      const identity = await createTestIdentity(user.id, { personalName: 'Test Identity' });

      const response = await agent
        .get(`/api/identities/${identity.id}`);

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('id', identity.id);
      expect(response.body).toHaveProperty('personalName', 'Test Identity');
    });

    test('should reject access to other user\'s identity', async () => {
      const { user: user1 } = await createTestUser();
      const identity = await createTestIdentity(user1.id, { personalName: 'User1 Identity' });
      
      const { agent: user2Agent } = await createAuthenticatedTestUser(app);

      const response = await user2Agent
        .get(`/api/identities/${identity.id}`);

      expectErrorResponse(response, 404, 'Identity not found');
    });

    test('should reject non-existent identity', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .get('/api/identities/non-existent-id');

      expectErrorResponse(response, 404, 'Identity not found');
    });
  });

  describe('PUT /api/identities/:id', () => {
    test('should update identity with valid data', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      const identity = await createTestIdentity(user.id, { 
        personalName: 'Original Name',
        title: 'Original Title'
      });

      const updateData = {
        personalName: 'Updated Name',
        title: 'Updated Title',
        pronouns: 'she/her'
      };

      const response = await agent
        .put(`/api/identities/${identity.id}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('personalName', 'Updated Name');
      expect(response.body).toHaveProperty('title', 'Updated Title');
      expect(response.body).toHaveProperty('pronouns', 'she/her');
    });

    test('should handle partial updates', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      const identity = await createTestIdentity(user.id, { 
        personalName: 'Original Name',
        title: 'Original Title'
      });

      const response = await agent
        .put(`/api/identities/${identity.id}`)
        .send({ title: 'New Title Only' });

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('personalName', 'Original Name'); // Unchanged
      expect(response.body).toHaveProperty('title', 'New Title Only'); // Changed
    });

    test('should reject invalid data', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      const identity = await createTestIdentity(user.id);

      const response = await agent
        .put(`/api/identities/${identity.id}`)
        .send({ context: 'invalid-context' });

      expectErrorResponse(response, 400, 'Validation');
    });

    test('should reject access to other user\'s identity', async () => {
      const { user: user1 } = await createTestUser();
      const identity = await createTestIdentity(user1.id);
      
      const { agent: user2Agent } = await createAuthenticatedTestUser(app);

      const response = await user2Agent
        .put(`/api/identities/${identity.id}`)
        .send({ personalName: 'Hacked Name' });

      expectErrorResponse(response, 404, 'Identity not found');
    });
  });

  describe('DELETE /api/identities/:id', () => {
    test('should delete identity', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      const identity1 = await createTestIdentity(user.id, { personalName: 'Identity 1' });
      const identity2 = await createTestIdentity(user.id, { personalName: 'Identity 2' });

      const response = await agent
        .delete(`/api/identities/${identity1.id}`);

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('message');

      // Verify identity is deleted
      const getResponse = await agent
        .get(`/api/identities/${identity1.id}`);

      expectErrorResponse(getResponse, 404);

      // Verify other identity still exists
      const otherResponse = await agent
        .get(`/api/identities/${identity2.id}`);

      expectSuccessResponse(otherResponse);
    });

    test('should reject deleting last remaining identity', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      const identity = await createTestIdentity(user.id, { personalName: 'Last Identity' });

      const response = await agent
        .delete(`/api/identities/${identity.id}`);

      expectErrorResponse(response, 400, 'Cannot delete');
    });

    test('should reject access to other user\'s identity', async () => {
      const { user: user1 } = await createTestUser();
      const identity = await createTestIdentity(user1.id);
      
      const { agent: user2Agent } = await createAuthenticatedTestUser(app);

      const response = await user2Agent
        .delete(`/api/identities/${identity.id}`);

      expectErrorResponse(response, 404, 'Identity not found');
    });
  });

  describe('POST /api/identities/:id/set-primary', () => {
    test('should set identity as primary', async () => {
      const { user, agent } = await createAuthenticatedTestUser(app);
      const identity1 = await createTestIdentity(user.id, { personalName: 'Identity 1', isPrimary: true });
      const identity2 = await createTestIdentity(user.id, { personalName: 'Identity 2', isPrimary: false });

      const response = await agent
        .post(`/api/identities/${identity2.id}/set-primary`);

      expectSuccessResponse(response);
      expect(response.body).toHaveProperty('isPrimary', true);

      // Verify old primary is no longer primary
      const oldPrimaryResponse = await agent
        .get(`/api/identities/${identity1.id}`);

      expect(oldPrimaryResponse.body).toHaveProperty('isPrimary', false);
    });

    test('should reject setting non-existent identity as primary', async () => {
      const { agent } = await createAuthenticatedTestUser(app);

      const response = await agent
        .post('/api/identities/non-existent-id/set-primary');

      expectErrorResponse(response, 404, 'Identity not found');
    });

    test('should reject access to other user\'s identity', async () => {
      const { user: user1 } = await createTestUser();
      const identity = await createTestIdentity(user1.id);
      
      const { agent: user2Agent } = await createAuthenticatedTestUser(app);

      const response = await user2Agent
        .post(`/api/identities/${identity.id}/set-primary`);

      expectErrorResponse(response, 404, 'Identity not found');
    });
  });
});