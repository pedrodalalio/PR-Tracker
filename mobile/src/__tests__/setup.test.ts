describe('Test Setup', () => {
  it('should run tests correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have Jest matchers available', () => {
    expect('hello').toMatch(/hello/);
    expect([1, 2, 3]).toHaveLength(3);
    expect({ name: 'test' }).toHaveProperty('name');
  });
});