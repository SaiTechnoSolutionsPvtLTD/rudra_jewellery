/**
 * Fast client-side image compressor & resizer
 * Downsamples high-res camera/phone photos to max 800px and 82% quality
 * Ensures ultra-fast upload, tiny storage, and instant rendering on all pages
 */
export function compressImageFile(file, maxDimension = 800, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(null);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // High-quality downsampling smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const isPng = file.type === 'image/png';
        const mime = isPng ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(mime, quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
