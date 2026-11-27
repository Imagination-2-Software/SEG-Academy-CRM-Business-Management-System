import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface UploadedFileDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StorageUploadResult {
  storageKey: string;
  bucket: string;
  mimeType: string;
  fileSizeBytes: number;
  originalName: string;
  etag?: string;
}

export interface FileValidationResult {
  detectedMime: string;
  extension: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

// Maximum allowed size: 10 Megabytes (10 * 1024 * 1024 bytes)
export const MAX_KYC_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly accessKey: string;
  private readonly secretKey: string;

  constructor() {
    this.bucket = process.env.STORAGE_BUCKET || 'seg-crm-documents';
    this.endpoint = (process.env.STORAGE_ENDPOINT || '').replace(/\/$/, '');
    this.accessKey = process.env.STORAGE_ACCESS_KEY || '';
    this.secretKey = process.env.STORAGE_SECRET_KEY || '';
  }

  /**
   * Inspects magic bytes (file signature) to detect actual content type.
   * Prevents MIME spoofing and malicious file extension masquerading.
   */
  validateFileSignature(buffer: Buffer): FileValidationResult {
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException('Invalid or empty file payload.');
    }

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { detectedMime: 'application/pdf', extension: 'pdf' };
    }

    // PNG magic bytes: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47)
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { detectedMime: 'image/png', extension: 'png' };
    }

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    if (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { detectedMime: 'image/jpeg', extension: 'jpg' };
    }

    throw new BadRequestException(
      'Unsupported or corrupted file type. Only authentic PDF, JPEG, and PNG files are accepted.',
    );
  }

  /**
   * Validates file size, extension, MIME type, and magic bytes.
   */
  validateFile(file: UploadedFileDto): FileValidationResult {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded.');
    }

    if (file.size > MAX_KYC_FILE_SIZE || file.buffer.length > MAX_KYC_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds the maximum limit of ${MAX_KYC_FILE_SIZE / (1024 * 1024)}MB.`,
      );
    }

    // Check extension
    const originalExt = (file.originalname || '').split('.').pop()?.toLowerCase();
    if (!originalExt || !ALLOWED_EXTENSIONS.has(originalExt)) {
      throw new BadRequestException(
        `Invalid file extension .${originalExt || 'unknown'}. Allowed extensions: .pdf, .jpg, .jpeg, .png`,
      );
    }

    // Check declared MIME
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Invalid MIME type '${file.mimetype}'. Allowed types: application/pdf, image/jpeg, image/png`,
      );
    }

    // Check file signature / magic bytes
    const verified = this.validateFileSignature(file.buffer);

    // Verify declared MIME matches detected MIME (allowing jpeg/jpg equivalence)
    if (
      verified.detectedMime !== file.mimetype &&
      !(verified.detectedMime === 'image/jpeg' && (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg'))
    ) {
      throw new BadRequestException(
        `File content mismatch. Declared MIME '${file.mimetype}' does not match detected binary signature '${verified.detectedMime}'.`,
      );
    }

    return verified;
  }

  /**
   * Generates a collision-resistant, non-guessable storage path.
   * Format: students/{studentId}/kyc/{timestamp}_{cryptoRandom}.{ext}
   */
  generateStorageKey(studentId: string, ext: string): string {
    const timestamp = Date.now();
    const entropy = crypto.randomBytes(8).toString('hex');
    return `students/${studentId}/kyc/${timestamp}_${entropy}.${ext}`;
  }

  // In-memory cache for simulated storage when running in development/test without live Supabase storage
  private simulatedStorage = new Map<string, { buffer: Buffer; mimeType: string }>();

  /**
   * Stores binary file in Supabase Storage bucket.
   * If credentials are dummy/placeholder or in test environment, simulates storage write cleanly.
   */
  async uploadFile(
    file: UploadedFileDto,
    studentId: string,
  ): Promise<StorageUploadResult> {
    const validation = this.validateFile(file);
    const storageKey = this.generateStorageKey(studentId, validation.extension);

    // If live Supabase Storage credentials are configured, execute upload via REST API
    const isLiveConfig =
      this.endpoint &&
      !this.endpoint.includes('[YOUR-PROJECT-REF]') &&
      this.secretKey &&
      !this.secretKey.includes('placeholder');

    if (isLiveConfig) {
      try {
        const uploadUrl = `${this.endpoint}/object/${this.bucket}/${storageKey}`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            apikey: this.secretKey,
            'Content-Type': validation.detectedMime,
            'x-upsert': 'false',
          },
          body: file.buffer,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          this.logger.error(`Supabase storage upload failed (${res.status}): ${errText}`);
          throw new InternalServerErrorException(
            `Failed to upload document to secure storage (${res.status}).`,
          );
        }
      } catch (err: any) {
        if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
          throw err;
        }
        this.logger.error(`Storage provider communication error: ${err.message}`, err.stack);
        throw new InternalServerErrorException('Error connecting to storage provider.');
      }
    } else {
      // In development / local testing without live Supabase storage credentials,
      // cache the buffer in simulated storage and record the validated storageKey.
      this.simulatedStorage.set(storageKey, {
        buffer: file.buffer,
        mimeType: validation.detectedMime,
      });
      this.logger.log(
        `Document upload simulated for student ${studentId}: key=${storageKey}, size=${file.size} bytes`,
      );
    }

    return {
      storageKey,
      bucket: this.bucket,
      mimeType: validation.detectedMime,
      fileSizeBytes: file.size,
      originalName: file.originalname,
    };
  }

  /**
   * Retrieves binary document buffer from Supabase Storage bucket or local simulator.
   */
  async getFile(storageKey: string): Promise<{ buffer: Buffer; mimeType: string }> {
    // Validate storageKey against path traversal attacks
    if (!storageKey || storageKey.includes('..') || storageKey.startsWith('/') || storageKey.startsWith('\\')) {
      throw new BadRequestException('Invalid storage key.');
    }

    const isLiveConfig =
      this.endpoint &&
      !this.endpoint.includes('[YOUR-PROJECT-REF]') &&
      this.secretKey &&
      !this.secretKey.includes('placeholder');

    if (isLiveConfig) {
      try {
        const downloadUrl = `${this.endpoint}/object/authenticated/${this.bucket}/${storageKey}`;
        const res = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            apikey: this.secretKey,
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new BadRequestException('Requested file not found in storage.');
          }
          throw new InternalServerErrorException(`Failed to retrieve file from storage (${res.status}).`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const mimeType = res.headers.get('content-type') || 'application/octet-stream';
        return { buffer: Buffer.from(arrayBuffer), mimeType };
      } catch (err: any) {
        if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
          throw err;
        }
        this.logger.error(`Storage retrieval error: ${err.message}`);
        throw new InternalServerErrorException('Error connecting to storage provider.');
      }
    } else {
      // Return from simulated storage
      const entry = this.simulatedStorage.get(storageKey);
      if (!entry) {
        // Return synthetic buffer conforming to file extension if not found in memory
        const ext = storageKey.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') {
          return {
            buffer: Buffer.from('%PDF-1.4\n%synthetic document stream\n%%EOF'),
            mimeType: 'application/pdf',
          };
        } else if (ext === 'png') {
          return {
            buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            mimeType: 'image/png',
          };
        } else {
          return {
            buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
            mimeType: 'image/jpeg',
          };
        }
      }
      return entry;
    }
  }

  /**
   * Generates a signed, time-limited direct access URL for private Supabase bucket.
   */
  async createSignedUrl(storageKey: string, expiresInSeconds = 900): Promise<string | null> {
    const isLiveConfig =
      this.endpoint &&
      !this.endpoint.includes('[YOUR-PROJECT-REF]') &&
      this.secretKey &&
      !this.secretKey.includes('placeholder');

    if (isLiveConfig) {
      try {
        const signUrl = `${this.endpoint}/object/sign/${this.bucket}/${storageKey}`;
        const res = await fetch(signUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            apikey: this.secretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: expiresInSeconds }),
        });

        if (res.ok) {
          const json: any = await res.json();
          if (json.signedURL) {
            return `${this.endpoint}${json.signedURL}`;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to create remote signed URL: ${err.message}`);
      }
    }
    return null;
  }

  /**
   * Deletes a file from the bucket (used for compensation/cleanup on DB failure).
   */
  async deleteFile(storageKey: string): Promise<void> {
    this.simulatedStorage.delete(storageKey);
    const isLiveConfig =
      this.endpoint &&
      !this.endpoint.includes('[YOUR-PROJECT-REF]') &&
      this.secretKey &&
      !this.secretKey.includes('placeholder');

    if (isLiveConfig) {
      try {
        const deleteUrl = `${this.endpoint}/object/${this.bucket}/${storageKey}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            apikey: this.secretKey,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to clean up storage key ${storageKey}: ${err.message}`);
      }
    }
  }
}
