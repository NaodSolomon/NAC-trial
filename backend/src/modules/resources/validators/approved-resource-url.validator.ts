import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isApprovedResourceUrl', async: false })
export class ApprovedResourceUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    try {
      const candidate = new URL(value);
      if (!['http:', 'https:'].includes(candidate.protocol) || candidate.username || candidate.password) {
        return false;
      }

      return approvedStorageBases().some((base) => belongsToBase(candidate, base));
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'fileUrl must be an HTTP(S) URL under the configured storage public URL or MinIO bucket';
  }
}

export function IsApprovedResourceUrl(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: ApprovedResourceUrlConstraint,
    });
  };
}

function approvedStorageBases(): URL[] {
  const endpoint = (process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000').replace(/\/+$/, '');
  const bucket = process.env.STORAGE_BUCKET ?? 'nehemiah-media';
  const publicUrl =
    process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/nehemiah-media';

  return [...new Set([publicUrl, `${endpoint}/${bucket}`])].map((value) => new URL(value));
}

function belongsToBase(candidate: URL, base: URL): boolean {
  if (candidate.origin !== base.origin) return false;
  const prefix = base.pathname.replace(/\/+$/, '');
  return candidate.pathname === prefix || candidate.pathname.startsWith(`${prefix}/`);
}
