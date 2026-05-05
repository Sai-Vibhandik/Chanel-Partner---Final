import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../middlewares/error.middleware.js';

// Configure Cloudinary - load config from env
const getCloudinaryConfig = () => ({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * @desc    Upload chat attachment (images, videos, documents)
 * @route   POST /api/upload/chat
 * @access  Private
 */
export const uploadChatAttachment = async (req, res, next) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      // Return a mock response if Cloudinary is not configured
      console.warn('Cloudinary not configured, returning mock URL');
      return res.status(200).json({
        success: true,
        message: 'File uploaded (mock)',
        data: {
          url: `https://via.placeholder.com/400x300?text=${encodeURIComponent(req.files?.file?.name || 'File')}`,
          publicId: `mock_${Date.now()}`,
          resourceType: 'image',
          format: 'jpg',
          size: req.files?.file?.size || 0
        }
      });
    }

    // Configure Cloudinary
    cloudinary.config(getCloudinaryConfig());

    if (!req.files || !req.files.file) {
      throw new ApiError(400, 'Please upload a file');
    }

    const file = req.files.file;

    // Determine resource type based on mimetype
    let resourceType = 'auto';
    if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'channel-partner-portal/chat',
      resource_type: resourceType,
      max_file_size: 10 * 1024 * 1024 // 10MB limit
    });

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        size: result.bytes
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
};

/**
 * @desc    Upload document (KYC, agreements, etc.)
 * @route   POST /api/upload/document
 * @access  Private
 */
export const uploadDocument = async (req, res, next) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('Cloudinary not configured, returning mock URL');
      return res.status(200).json({
        success: true,
        message: 'File uploaded (mock)',
        data: {
          url: `https://via.placeholder.com/400x300?text=${encodeURIComponent(req.files?.file?.name || 'Document')}`,
          publicId: `mock_${Date.now()}`,
          resourceType: 'raw',
          format: 'pdf',
          size: req.files?.file?.size || 0
        }
      });
    }

    // Configure Cloudinary
    cloudinary.config(getCloudinaryConfig());

    if (!req.files || !req.files.file) {
      throw new ApiError(400, 'Please upload a file');
    }

    const file = req.files.file;
    const folder = req.body.folder || 'documents';

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ApiError(400, 'Only images and PDF files are allowed');
    }

    // Upload to Cloudinary
    // For PDFs and documents, use attachment: false to allow inline viewing in browser
    const uploadOptions = {
      folder: `channel-partner-portal/${folder}`,
      resource_type: 'auto'
    };

    // Set attachment: false for PDFs so they can be viewed inline in browser
    if (file.mimetype === 'application/pdf') {
      uploadOptions.attachment = false;
    }

    const result = await cloudinary.uploader.upload(file.tempFilePath, uploadOptions);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        size: result.bytes
      }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    next(error);
  }
};

/**
 * @desc    Upload image
 * @route   POST /api/upload/image
 * @access  Private
 */
export const uploadImage = async (req, res, next) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('Cloudinary not configured, returning mock URL');
      return res.status(200).json({
        success: true,
        message: 'Image uploaded (mock)',
        data: {
          url: `https://via.placeholder.com/400x300?text=${encodeURIComponent(req.files?.file?.name || 'Image')}`,
          publicId: `mock_${Date.now()}`,
          width: 400,
          height: 300,
          format: 'jpg'
        }
      });
    }

    // Configure Cloudinary
    cloudinary.config(getCloudinaryConfig());

    if (!req.files || !req.files.file) {
      throw new ApiError(400, 'Please upload a file');
    }

    const file = req.files.file;
    const folder = req.body.folder || 'images';

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ApiError(400, 'Only image files are allowed');
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: `channel-partner-portal/${folder}`,
      resource_type: 'image'
    });

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    next(error);
  }
};

/**
 * @desc    Delete file from Cloudinary
 * @route   DELETE /api/upload/:publicId
 * @access  Private
 */
export const deleteFile = async (req, res, next) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(200).json({
        success: true,
        message: 'File deleted (mock)'
      });
    }

    // Configure Cloudinary
    cloudinary.config(getCloudinaryConfig());

    const { publicId } = req.params;

    if (!publicId) {
      throw new ApiError(400, 'Public ID is required');
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'not found') {
      throw new ApiError(404, 'File not found');
    }

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};