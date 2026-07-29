import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const DANGEROUS_HTML = /<\s*script\b|on[a-z]+\s*=|javascript\s*:/i;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

@Injectable()
export class RequestSanitizationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    this.inspect(value);
    return value;
  }

  private inspect(value: unknown, key?: string): void {
    if (typeof value === 'string') {
      if (CONTROL_CHARACTERS.test(value)) {
        throw new BadRequestException('Request contains unsupported control characters');
      }
      if ((key === 'content' || key === 'metadata') && DANGEROUS_HTML.test(value)) {
        throw new BadRequestException('Request contains unsafe executable content');
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => this.inspect(entry, key));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [childKey, childValue] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(childKey)) {
        throw new BadRequestException('Request contains a forbidden object key');
      }
      this.inspect(childValue, childKey);
    }
  }
}
