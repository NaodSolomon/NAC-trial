import type { Language } from '@/lib/i18n';

export interface PublicResource {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  languageCode: Language;
  status: 'PUBLISHED';
  downloadCount: number;
}

export interface ResourceDownloadResult {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  downloadCount: number;
}
