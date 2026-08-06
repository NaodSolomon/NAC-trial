import { ArgumentsHost, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs the route template rather than a sensitive newsletter path value', () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const send = jest.fn();
    const status = jest.fn(() => ({ send }));
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'DELETE',
          url: '/api/v1/admin/newsletter/subscriber%40example.org',
          routeOptions: { url: '/api/v1/admin/newsletter/:email' },
        }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    new HttpExceptionFilter().catch(new Error('Database unavailable'), host);

    expect(error).toHaveBeenCalledWith(
      'DELETE /api/v1/admin/newsletter/:email failed with 500',
      expect.any(String),
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain('subscriber');
    expect(status).toHaveBeenCalledWith(500);
  });
});
