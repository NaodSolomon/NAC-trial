import { Injectable } from '@nestjs/common';
import { S3ObjectStorageService } from './s3-object-storage.service';

@Injectable()
export class MinioObjectStorageService extends S3ObjectStorageService {}
