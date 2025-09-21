import { beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Set test environment variable
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Ensure we have a test database URL
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for testing');
  }
  
  // Verify database connection
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ Test database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clean up test data in reverse order of dependencies
    await db.execute(sql`DELETE FROM audit_logs WHERE user_id LIKE 'test-%'`);
    await db.execute(sql`DELETE FROM identities WHERE user_id LIKE 'test-%'`);
    await db.execute(sql`DELETE FROM user_credentials WHERE user_id LIKE 'test-%'`);
    await db.execute(sql`DELETE FROM users WHERE id LIKE 'test-%'`);
    await db.execute(sql`DELETE FROM sessions WHERE sid LIKE 'test-%'`);
  } catch (error) {
    console.warn('Warning: Failed to clean up test data:', error);
  }
});

// Global teardown
afterAll(async () => {
  // Close database connection
  console.log('🧹 Cleaning up test environment');
});