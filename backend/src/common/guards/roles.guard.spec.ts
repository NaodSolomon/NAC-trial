import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(),
  } as unknown as ExecutionContext;

  it('allows routes that do not declare roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it('allows an administrator with an explicitly accepted role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SUPER_ADMIN']),
    } as unknown as Reflector;
    jest.spyOn(context, 'switchToHttp').mockReturnValue({
      getRequest: () => ({ user: { role: 'SUPER_ADMIN' } }),
    } as ReturnType<ExecutionContext['switchToHttp']>);

    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it('rejects an administrator without the required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SUPER_ADMIN']),
    } as unknown as Reflector;
    jest.spyOn(context, 'switchToHttp').mockReturnValue({
      getRequest: () => ({ user: { role: 'CONTENT_EDITOR' } }),
    } as ReturnType<ExecutionContext['switchToHttp']>);

    expect(() => new RolesGuard(reflector).canActivate(context)).toThrow(ForbiddenException);
  });
});
