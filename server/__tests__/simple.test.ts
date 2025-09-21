import { describe, test, expect } from '@jest/globals';

describe('Simple Test', () => {
  test('should run a basic test without any imports', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
  });

  test('should test basic string operations', () => {
    const str = 'test';
    expect(str.toUpperCase()).toBe('TEST');
    expect(str.length).toBe(4);
  });
});