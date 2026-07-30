import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  it('uses a status selected dynamically by the controller', async () => {
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as ExecutionContext;
    const next = {
      handle: () => {
        response.statusCode = 503;
        return of({ status: 'unavailable' });
      },
    } as CallHandler;

    await expect(
      firstValueFrom(new TransformInterceptor().intercept(context, next)),
    ).resolves.toMatchObject({
      success: false,
      statusCode: 503,
      data: { status: 'unavailable' },
    });
  });
});
