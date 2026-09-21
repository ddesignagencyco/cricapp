import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface MediaUploadResult {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: 'image' | 'video';
  duration: number | null;
  thumbnailUrl: string | null;
}

export function galleryDurationLimit(
  type: 'image' | 'short' | 'video',
): number | null {
  return type === 'short' ? 30 : type === 'video' ? 60 : null;
}

export function isGalleryDurationAllowed(
  type: 'image' | 'short' | 'video',
  duration: number | null,
): boolean {
  const limit = galleryDurationLimit(type);
  return limit === null || (duration !== null && duration <= limit);
}

@Injectable()
export class MediaService {
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    this.configured = Boolean(cloudName && apiKey && apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<MediaUploadResult> {
    return this.upload(file, {
      folder: 'cricapp/articles',
      resourceType: 'image',
    });
  }

  async uploadGalleryMedia(
    file: Express.Multer.File,
    type: 'image' | 'short' | 'video',
    purpose: 'gallery' | 'editorial' = 'gallery',
  ): Promise<MediaUploadResult> {
    const resourceType = type === 'image' ? 'image' : 'video';
    const folder =
      purpose === 'editorial'
        ? 'cricapp/articles'
        : `cricapp/gallery/${type}`;
    const uploaded = await this.upload(file, {
      folder,
      resourceType,
    });

    const maxDuration = galleryDurationLimit(type);
    if (!isGalleryDurationAllowed(type, uploaded.duration)) {
      await this.destroy(uploaded.publicId, resourceType).catch(() => undefined);
      throw new BadRequestException(
        `${type === 'short' ? 'Shorts' : 'Videos'} must be ${maxDuration} seconds or less`,
      );
    }
    return uploaded;
  }

  async destroy(
    publicId: string,
    resourceType: 'image' | 'video',
  ): Promise<void> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured on the API server',
      );
    }
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  }

  private async upload(
    file: Express.Multer.File,
    options: {
      folder: string;
      resourceType: 'image' | 'video';
    },
  ): Promise<MediaUploadResult> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured on the API server',
      );
    }

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: options.resourceType,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary returned no upload result'));
            return;
          }
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });

    return {
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      resourceType: options.resourceType,
      duration:
        options.resourceType === 'video' &&
        typeof uploaded.duration === 'number'
          ? uploaded.duration
          : null,
      thumbnailUrl:
        options.resourceType === 'video'
          ? cloudinary.url(uploaded.public_id, {
              resource_type: 'video',
              format: 'jpg',
              secure: true,
              transformation: [{ start_offset: 0 }],
            })
          : null,
    };
  }
}
