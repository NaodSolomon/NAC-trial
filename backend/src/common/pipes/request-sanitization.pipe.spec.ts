import { BadRequestException } from '@nestjs/common';
import { RequestSanitizationPipe } from './request-sanitization.pipe';

describe('RequestSanitizationPipe', () => {
  const pipe = new RequestSanitizationPipe();

  it('rejects executable CMS content', () => {
    expect(() => pipe.transform({ content: '<script>alert(1)</script>' })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ content: '<img src=x onerror=alert(1)>' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects control characters while preserving ordinary Unicode text', () => {
    expect(() => pipe.transform({ title: 'Unsafe\u0000title' })).toThrow(BadRequestException);
    expect(pipe.transform({ title: 'የኦቲዝም ግንዛቤ' })).toEqual({ title: 'የኦቲዝም ግንዛቤ' });
  });
});
