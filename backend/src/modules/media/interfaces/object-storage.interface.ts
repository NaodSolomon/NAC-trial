export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface StoredObjectInput {
  objectKey: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectStorage {
  put(input: StoredObjectInput): Promise<void>;
  delete(objectKey: string): Promise<void>;
  publicUrl(objectKey: string): string;
}
