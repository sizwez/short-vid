
/**
 * Generates a thumbnail image from a video file at a specific time.
 * @param file The video file
 * @param seekTime Time in seconds to capture (default 1s)
 * @returns A Blob of the generated thumbnail image (image/jpeg)
 */
export const generateVideoThumbnail = (file: File, seekTime: number = 1): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const url = URL.createObjectURL(file);

    video.src = url;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to the requested time
      video.currentTime = Math.min(seekTime, video.duration);
    };

    video.onseeked = () => {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, 'image/jpeg', 0.8);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Video loading error'));
    };
  });
};
