// Utility functions for image upload and management
// Google Drive integration for company logos

// Convert file to base64 for temporary storage/preview
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

// Validate image file type and size
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Поддерживаются только изображения (JPEG, PNG, GIF, WebP)' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'Размер файла не должен превышать 5MB' };
  }

  return { isValid: true };
};

// Cloudinary integration for image uploads
export const uploadToCloudinary = async (file: File, fileName: string): Promise<string> => {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary настройки не найдены в переменных окружения');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('public_id', fileName.replace(/\.[^/.]+$/, '')); // Remove extension
    formData.append('folder', 'company_logos');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Ошибка загрузки в Cloudinary');
    }

    const result = await response.json();
    return result.secure_url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(error.message || 'Ошибка при загрузке изображения');
  }
};

// Legacy function for backward compatibility
export const uploadToGoogleDrive = uploadToCloudinary;

// Generate optimized filename for company logos
export const generateLogoFileName = (companyName: string, originalFileName: string): string => {
  const timestamp = Date.now();
  const extension = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
  const sanitizedCompanyName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
    
  return `company_logo_${sanitizedCompanyName}_${timestamp}.${extension}`;
};

// Optimize image URL for display (handles Cloudinary, Google Drive, and other URLs)
export const optimizeImageUrl = (url: string): string => {
  if (!url) return '';
  
  // If it's already a Cloudinary URL, return as is
  if (url.includes('cloudinary.com')) {
    return url;
  }
  
  // If it's a Google Drive sharing link, convert to direct image URL
  const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  
  if (match && match[1]) {
    // Convert to direct image URL
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  
  return url;
};
