// src/services/s3Service.ts
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'my-app-bucket';
const MAX_SIZE_BYTES = parseInt(process.env.MAX_S3_IMAGE_SIZE_BYTES || '5242880', 10); // Default 5MB

class S3Service {
  /**
   * Upload a profile picture to S3 or local storage based on size
   * @param userId User ID
   * @param base64Image Base64 encoded image
   * @param fileType Original file type (e.g., 'image/jpeg')
   * @returns Object with image URL and storage type
   */
  async uploadProfilePicture(userId: string, base64Image: string, fileType: string): Promise<{ url: string, storageType: 'local' | 's3' }> {
    try {
      // Extract image data from base64 string
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Process image to reduce size
      const processedBuffer = await this.processImage(buffer);
      
      // Check if image size exceeds the max allowed for S3
      if (processedBuffer.length > MAX_SIZE_BYTES) {
        // Store locally
        return this.storeImageLocally(userId, processedBuffer, fileType);
      } else {
        // Store in S3
        return this.storeImageInS3(userId, processedBuffer, fileType);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw new Error('Failed to upload profile picture');
    }
  }

  /**
   * Process an image to optimize its size
   * @param imageBuffer Original image buffer
   * @returns Processed image buffer
   */
  private async processImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Resize image to maximum dimensions of 1200x1200 and optimize
      return await sharp(imageBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      return imageBuffer; // Return original image if processing fails
    }
  }

  /**
   * Store an image in S3
   * @param userId User ID
   * @param imageBuffer Image buffer
   * @param fileType File type
   * @returns Object with image URL and storage type
   */
  private async storeImageInS3(userId: string, imageBuffer: Buffer, fileType: string): Promise<{ url: string, storageType: 's3' }> {
    const fileExtension = this.getFileExtension(fileType);
    const key = `profile-pictures/user_${userId}/profile${fileExtension}`;
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: fileType,
    };
    
    const uploadResult = await s3.upload(params).promise();
    
    return {
      url: uploadResult.Location,
      storageType: 's3'
    };
  }

  /**
   * Store an image locally
   * @param userId User ID
   * @param imageBuffer Image buffer
   * @param fileType File type
   * @returns Object with image URL and storage type
   */
  private async storeImageLocally(userId: string, imageBuffer: Buffer, fileType: string): Promise<{ url: string, storageType: 'local' }> {
    const fileExtension = this.getFileExtension(fileType);
    const dirPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'profile-pictures', `user_${userId}`);
    const fileName = `profile${fileExtension}`;
    const filePath = path.join(dirPath, fileName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(filePath, imageBuffer);
    
    // Return the path that would be accessible from the web
    const url = `/uploads/profile-pictures/user_${userId}/${fileName}`;
    
    return {
      url,
      storageType: 'local'
    };
  }

  /**
   * Get file extension from file type
   * @param fileType File type (e.g., 'image/jpeg')
   * @returns File extension with dot (e.g., '.jpg')
   */
  private getFileExtension(fileType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    };
    
    return extensions[fileType] || '.jpg';
  }

  /**
   * Delete an image from S3
   * @param imageUrl Image URL to delete
   * @returns Success status
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract the key from the URL
      const key = imageUrl.split(BUCKET_NAME + '/')[1];
      
      if (!key) {
        // This might be a local file
        if (imageUrl.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', '..', 'public', imageUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return true;
        }
        throw new Error('Invalid image URL');
      }
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: key
      };
      
      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
 * Upload a document to S3
 * @param folder Folder to store the document in
 * @param id Entity ID (user, ngo, etc.)
 * @param documentType Type of document
 * @param base64Document Base64 encoded document
 * @param fileType Original file type
 * @returns Object with document URL and storage type
 */
async uploadDocument(
  folder: string, 
  id: string, 
  documentType: string, 
  base64Document: string, 
  fileType: string
): Promise<{ url: string, storageType: 's3' | 'local' }> {
  try {
    const base64Data = base64Document.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileExtension = this.getFileExtension(fileType);
    
    // Process the document if it's an image
    let documentBuffer = buffer;
    if (fileType.startsWith('image/')) {
      documentBuffer = await this.processImage(buffer);
    }
    
    // Check if document size exceeds the max allowed for S3
    if (documentBuffer.length > MAX_SIZE_BYTES) {
      // Store locally if too large
      return this.storeDocumentLocally(folder, id, documentType, documentBuffer, fileExtension);
    } else {
      // Store in S3
      const key = `${folder}/${id}/${documentType}${fileExtension}`;
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: documentBuffer,
        ContentType: fileType,
        ACL: 'private' // Documents should be private by default
      };
      
      const uploadResult = await s3.upload(params).promise();
      
      return {
        url: uploadResult.Location,
        storageType: 's3'
      };
    }
  } catch (error) {
    console.error(`Error uploading ${folder} document:`, error);
    throw new Error(`Failed to upload ${folder} document`);
  }
}

/**
 * Store a document locally when too large for S3
 * @param folder Folder to store the document in
 * @param id Entity ID
 * @param documentType Type of document
 * @param documentBuffer Document buffer
 * @param fileExtension File extension
 * @returns Object with document URL and storage type
 */
private async storeDocumentLocally(
  folder: string,
  id: string,
  documentType: string,
  documentBuffer: Buffer,
  fileExtension: string
): Promise<{ url: string, storageType: 'local' }> {
  const dirPath = path.join(__dirname, '..', '..', 'public', 'uploads', folder, id);
  const fileName = `${documentType}${fileExtension}`;
  const filePath = path.join(dirPath, fileName);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Write the file
  fs.writeFileSync(filePath, documentBuffer);
  
  // Return the path that would be accessible from the web
  const url = `/uploads/${folder}/${id}/${fileName}`;
  
  return {
    url,
    storageType: 'local'
  };
}
}

export default new S3Service();