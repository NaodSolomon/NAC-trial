import { requireDedicatedTestDatabase } from '../helpers/test-database-safety.helper';

describe('Integration database safety', () => {
  it('accepts an explicitly named test database', () => {
    expect(
      requireDedicatedTestDatabase(
        'postgresql://nehemiah_test:password@localhost:5434/nehemiah_test',
      ),
    ).toContain('/nehemiah_test');
  });

  it('refuses development and production database names', () => {
    expect(() =>
      requireDedicatedTestDatabase('postgresql://user:password@localhost/nehemiah'),
    ).toThrow('not explicitly named for testing');
    expect(() =>
      requireDedicatedTestDatabase('postgresql://user:password@localhost/nehemiah_production'),
    ).toThrow('not explicitly named for testing');
  });
});
