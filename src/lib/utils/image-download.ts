import fs from 'fs';
import path from 'path';
import https from 'https';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

/**
 * Purpose: Download image from URL and save to local filesystem.
 * Params:
 *   - imageUrl: string — The image URL to download.
 *   - productId: string — Product ID for folder structure.
 *   - filename: string — Filename to save as.
 * Returns:
 *   - Promise<string> — Local file path relative to public folder.
 * Throws:
 *   - Error — When download fails or file system error.
 */
export async function downloadImage(
  imageUrl: string,
  productId: string,
  filename: string
): Promise<string> {
  const productDir = path.join(process.cwd(), 'public', 'assets', 'products', productId);
  
  // Create directory if not exists
  if (!fs.existsSync(productDir)) {
    fs.mkdirSync(productDir, { recursive: true });
  }

  const filePath = path.join(productDir, filename);
  const relativePath = `/assets/products/${productId}/${filename}`;

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    return relativePath;
  }

  return new Promise((resolve, reject) => {
    https.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(relativePath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => {}); 
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Purpose: Download multiple images with delay to avoid rate limiting.
 * Params:
 *   - imageUrls: string[] — Array of image URLs.
 *   - productId: string — Product ID for folder structure.
 *   - delayMs: number — Delay between downloads in milliseconds (default: 500ms).
 * Returns:
 *   - Promise<string[]> — Array of local file paths.
 * Throws:
 *   - Error — When any download fails.
 */
export async function downloadImages(
  imageUrls: string[],
  productId: string,
  delayMs: number = 500
): Promise<string[]> {
  const localPaths: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const filename = `image-${i + 1}.${getImageExtension(imageUrl)}`;

    try {
      const localPath = await downloadImage(imageUrl, productId, filename);
      localPaths.push(localPath);

      // Add delay between downloads to avoid rate limiting
      if (i < imageUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to download image ${i + 1}:`, error);
      // Continue with other images even if one fails
    }
  }

  return localPaths;
}

/**
 * Purpose: Extract file extension from image URL.
 * Params:
 *   - url: string — Image URL.
 * Returns:
 *   - string — File extension (jpg, png, webp, etc.).
 */
function getImageExtension(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Purpose: Clean up product images folder.
 * Params:
 *   - productId: string — Product ID.
 * Returns:
 *   - Promise<void> — Resolves when cleanup is complete.
 */
export async function cleanupProductImages(productId: string): Promise<void> {
  const productDir = path.join(process.cwd(), 'public', 'assets', 'products', productId);
  
  if (fs.existsSync(productDir)) {
    fs.rmSync(productDir, { recursive: true, force: true });
  }
}
