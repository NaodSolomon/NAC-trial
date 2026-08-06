import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { SecureLoggingInterceptor } from './secure-logging.interceptor';

function context(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/api/v1/public/events?languageCode=en' }),
    }),
  } as unknown as ExecutionContext;
}

const handler: CallHandler = { handle: () => of({ data: [] }) };

describe('SecureLoggingInterceptor', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not log an unsampled fast successful request', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(110);
    const interceptor = new SecureLoggingInterceptor(0, 750);

    await lastValueFrom(interceptor.intercept(context(), handler));

    expect(log).not.toHaveBeenCalled();
  });

  it('aggregates slow requests without including the query string', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(900)
      .mockReturnValueOnce(900)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(2_800)
      .mockReturnValueOnce(2_800);
    const interceptor = new SecureLoggingInterceptor(0, 750);

    await lastValueFrom(interceptor.intercept(context(), handler));
    await lastValueFrom(interceptor.intercept(context(), handler));

    expect(warn).toHaveBeenCalledWith(
      'Slow HTTP requests windowMs=1900 count=2 maxDurationMs=800 latest=GET /api/v1/public/events',
    );
  });
});
