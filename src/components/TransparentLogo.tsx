import { useEffect, useState } from 'react';

interface TransparentLogoProps {
  src: string;
  alt: string;
  className?: string;
  threshold?: number;
}

export function TransparentLogo({
  src,
  alt,
  className = '',
  threshold = 30,
}: TransparentLogoProps) {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    // If image is already a transparent PNG or data URL, render directly
    if (src.endsWith('.png') || src.startsWith('data:image/png')) {
      setProcessedSrc(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Sample corner background color
        const bgR = (data[0] + data[(canvas.width - 1) * 4] + data[(canvas.height - 1) * canvas.width * 4]) / 3;
        const bgG = (data[1] + data[(canvas.width - 1) * 4 + 1] + data[(canvas.height - 1) * canvas.width * 4 + 1]) / 3;
        const bgB = (data[2] + data[(canvas.width - 1) * 4 + 2] + data[(canvas.height - 1) * canvas.width * 4 + 2]) / 3;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Euclidean distance from background color
          const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          if (dist < threshold) {
            data[i + 3] = 0;
          } else if (dist < threshold + 25) {
            // Feathered alpha transition for smooth anti-aliased edges
            data[i + 3] = Math.round(255 * ((dist - threshold) / 25));
          }
        }

        ctx.putImageData(imageData, 0, 0);
        setProcessedSrc(canvas.toDataURL('image/png'));
      } catch (err) {
        setProcessedSrc(src);
      }
    };
    img.src = src;
  }, [src, threshold]);

  return <img src={processedSrc} alt={alt} className={className} />;
}
