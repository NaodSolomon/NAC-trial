import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  passwordPolicyText,
  resetPasswordSchema,
} from './auth.schemas';

function messagesFor(schema: typeof resetPasswordSchema, value: unknown, path: string) {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path.join('.') === path)
    .map((issue) => issue.message);
}

describe('loginSchema', () => {
  it('accepts a normal credential pair', () => {
    expect(
      loginSchema.safeParse({ email: 'admin@example.org', password: 'StrongPassword123' }).success,
    ).toBe(true);
  });

  it('trims the address before judging it', () => {
    const result = loginSchema.safeParse({
      email: '  admin@example.org  ',
      password: 'StrongPassword123',
    });
    expect(result.success && result.data.email).toBe('admin@example.org');
  });

  it.each(['', 'admin', 'admin@', '@example.org', 'admin example.org'])(
    'rejects %o as an address',
    (email) => {
      expect(loginSchema.safeParse({ email, password: 'StrongPassword123' }).success).toBe(false);
    },
  );
});

describe('forgotPasswordSchema', () => {
  it('asks only for an address', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'admin@example.org' }).success).toBe(true);
  });
});

describe('resetPasswordSchema', () => {
  const valid = { newPassword: 'StrongPassword123', confirmPassword: 'StrongPassword123' };

  it('accepts a password meeting every rule', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['too short', 'Short1', 'Password must contain at least 12 characters.'],
    ['all lowercase', 'alllowercase123', 'Password must include an uppercase letter.'],
    ['all uppercase', 'ALLUPPERCASE123', 'Password must include a lowercase letter.'],
    ['without a digit', 'NoDigitsInHere', 'Password must include a number.'],
  ])('names the rule a password that is %s broke', (_label, newPassword, message) => {
    expect(
      messagesFor(
        resetPasswordSchema,
        { newPassword, confirmPassword: newPassword },
        'newPassword',
      ),
    ).toContain(message);
  });

  it('reports a mismatch on the confirmation rather than the new password', () => {
    const value = { newPassword: 'StrongPassword123', confirmPassword: 'DifferentPassword123' };
    expect(messagesFor(resetPasswordSchema, value, 'confirmPassword')).toEqual([
      'Passwords do not match.',
    ]);
    expect(messagesFor(resetPasswordSchema, value, 'newPassword')).toEqual([]);
  });

  it('states the policy in one place so the hint cannot drift from the rules', () => {
    // Every requirement the schema enforces should be described by the shared sentence.
    expect(passwordPolicyText).toMatch(/12 characters/);
    expect(passwordPolicyText).toMatch(/uppercase/i);
    expect(passwordPolicyText).toMatch(/lowercase/i);
    expect(passwordPolicyText).toMatch(/number/i);
  });
});
