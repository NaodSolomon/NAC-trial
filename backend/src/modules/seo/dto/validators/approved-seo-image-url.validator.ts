import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isApprovedSeoImageUrl', async: false })
export class ApprovedSeoImageUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null) return true;
    if (typeof value !== 'string') return false;

    try {
      const candidate = new URL(value);
      if (candidate.username || candidate.password) return false;
      if (candidate.protocol === 'https:') return true;
      if (candidate.protocol !== 'http:') return false;

      return localMinioBases().some((base) => belongsToBase(candidate, base));
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'imageUrl must use HTTPS or an approved local MinIO storage URL';
  }
}

export function IsApprovedSeoImageUrl(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: ApprovedSeoImageUrlConstraint,
    });
  };
}

function localMinioBases(): URL[] {
  const endpoint = (process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000').replace(/\/+$/, '');
  const bucket = process.env.STORAGE_BUCKET ?? 'nehemiah-media';
  const publicUrl = process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/nehemiah-media';

  return [...new Set([publicUrl, `${endpoint}/${bucket}`])]
    .map((value) => new URL(value))
    .filter(
      (url) =>
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', 'minio'].includes(url.hostname.toLowerCase()),
    );
}

function belongsToBase(candidate: URL, base: URL): boolean {
  if (candidate.origin !== base.origin) return false;
  const prefix = base.pathname.replace(/\/+$/, '');
  return candidate.pathname === prefix || candidate.pathname.startsWith(`${prefix}/`);
}
