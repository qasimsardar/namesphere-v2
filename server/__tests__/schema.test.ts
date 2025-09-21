import { describe, test, expect } from '@jest/globals';
import { insertIdentitySchema, registerSchema, loginSchema } from '../../shared/schema';

describe('Schema Validation', () => {
  describe('insertIdentitySchema', () => {
    test('should validate valid identity data', () => {
      const validData = {
        personalName: 'John Doe',
        context: 'work',
        otherNames: ['John', 'Johnny'],
        pronouns: 'he/him',
        title: 'Software Engineer',
        avatarUrl: 'https://example.com/avatar.jpg',
        socialLinks: { github: 'https://github.com/johndoe' },
        isPrimary: false,
        isDiscoverable: true
      };

      const result = insertIdentitySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.personalName).toBe('John Doe');
        expect(result.data.context).toBe('work');
      }
    });

    test('should reject invalid context', () => {
      const invalidData = {
        personalName: 'John Doe',
        context: 'invalid-context'
      };

      const result = insertIdentitySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject missing required fields', () => {
      const invalidData = {
        context: 'work'
        // missing personalName
      };

      const result = insertIdentitySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    test('should validate valid registration data', () => {
      const validData = {
        username: 'testuser',
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject password mismatch', () => {
      const invalidData = {
        username: 'testuser',
        password: 'password1',
        confirmPassword: 'password2',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    test('should validate valid login data', () => {
      const validData = {
        username: 'testuser',
        password: 'testpassword123'
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject missing username', () => {
      const invalidData = {
        password: 'testpassword123'
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});