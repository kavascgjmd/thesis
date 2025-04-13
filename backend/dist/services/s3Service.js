"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/s3Service.ts
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Configure AWS
aws_sdk_1.default.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});
const s3 = new aws_sdk_1.default.S3();
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
    uploadProfilePicture(userId, base64Image, fileType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Extract image data from base64 string
                const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                // Process image to reduce size
                const processedBuffer = yield this.processImage(buffer);
                // Check if image size exceeds the max allowed for S3
                if (processedBuffer.length > MAX_SIZE_BYTES) {
                    // Store locally
                    return this.storeImageLocally(userId, processedBuffer, fileType);
                }
                else {
                    // Store in S3
                    return this.storeImageInS3(userId, processedBuffer, fileType);
                }
            }
            catch (error) {
                console.error('Error uploading profile picture:', error);
                throw new Error('Failed to upload profile picture');
            }
        });
    }
    /**
     * Process an image to optimize its size
     * @param imageBuffer Original image buffer
     * @returns Processed image buffer
     */
    processImage(imageBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Resize image to maximum dimensions of 1200x1200 and optimize
                return yield (0, sharp_1.default)(imageBuffer)
                    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            }
            catch (error) {
                console.error('Error processing image:', error);
                return imageBuffer; // Return original image if processing fails
            }
        });
    }
    /**
     * Store an image in S3
     * @param userId User ID
     * @param imageBuffer Image buffer
     * @param fileType File type
     * @returns Object with image URL and storage type
     */
    storeImageInS3(userId, imageBuffer, fileType) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExtension = this.getFileExtension(fileType);
            const key = `profile-pictures/user_${userId}/profile${fileExtension}`;
            const params = {
                Bucket: BUCKET_NAME,
                Key: key,
                Body: imageBuffer,
                ContentType: fileType,
            };
            const uploadResult = yield s3.upload(params).promise();
            return {
                url: uploadResult.Location,
                storageType: 's3'
            };
        });
    }
    /**
     * Store an image locally
     * @param userId User ID
     * @param imageBuffer Image buffer
     * @param fileType File type
     * @returns Object with image URL and storage type
     */
    storeImageLocally(userId, imageBuffer, fileType) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExtension = this.getFileExtension(fileType);
            const dirPath = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'profile-pictures', `user_${userId}`);
            const fileName = `profile${fileExtension}`;
            const filePath = path_1.default.join(dirPath, fileName);
            // Create directory if it doesn't exist
            if (!fs_1.default.existsSync(dirPath)) {
                fs_1.default.mkdirSync(dirPath, { recursive: true });
            }
            // Write the file
            fs_1.default.writeFileSync(filePath, imageBuffer);
            // Return the path that would be accessible from the web
            const url = `/uploads/profile-pictures/user_${userId}/${fileName}`;
            return {
                url,
                storageType: 'local'
            };
        });
    }
    /**
     * Get file extension from file type
     * @param fileType File type (e.g., 'image/jpeg')
     * @returns File extension with dot (e.g., '.jpg')
     */
    getFileExtension(fileType) {
        const extensions = {
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
    deleteImage(imageUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Extract the key from the URL
                const key = imageUrl.split(BUCKET_NAME + '/')[1];
                if (!key) {
                    // This might be a local file
                    if (imageUrl.startsWith('/uploads/')) {
                        const filePath = path_1.default.join(__dirname, '..', '..', 'public', imageUrl);
                        if (fs_1.default.existsSync(filePath)) {
                            fs_1.default.unlinkSync(filePath);
                        }
                        return true;
                    }
                    throw new Error('Invalid image URL');
                }
                const params = {
                    Bucket: BUCKET_NAME,
                    Key: key
                };
                yield s3.deleteObject(params).promise();
                return true;
            }
            catch (error) {
                console.error('Error deleting image:', error);
                return false;
            }
        });
    }
    /**
     * Upload a document to S3
     * @param folder Folder to store the document in
     * @param id Entity ID (user, ngo, etc.)
     * @param documentType Type of document
     * @param base64Document Base64 encoded document
     * @param fileType Original file type
     * @returns Document URL
     */
    uploadDocument(folder, id, documentType, base64Document, fileType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const base64Data = base64Document.replace(/^data:.*?;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const fileExtension = this.getFileExtension(fileType);
                const key = `${folder}/${id}/${documentType}${fileExtension}`;
                const params = {
                    Bucket: BUCKET_NAME,
                    Key: key,
                    Body: buffer,
                    ContentType: fileType,
                    ACL: 'private' // Documents should be private by default
                };
                const uploadResult = yield s3.upload(params).promise();
                return uploadResult.Location;
            }
            catch (error) {
                console.error(`Error uploading ${folder} document:`, error);
                throw new Error(`Failed to upload ${folder} document`);
            }
        });
    }
}
exports.default = new S3Service();
