import React, { useState, useEffect } from 'react';

interface SecureImageProps {
  imagePath: string;
  productCode: string;
  className?: string;
  alt?: string;
}

const SecureImage: React.FC<SecureImageProps> = ({ 
  imagePath, 
  productCode, 
  className = "", 
  alt = "Product image" 
}) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get nonce from either urbanaPublic (frontend) or urbanaAdmin (admin)
        const nonce = (window as any).urbanaPublic?.nonce || (window as any).urbanaAdmin?.nonce || '';
        
        const response = await fetch('/wp-json/urbana/v1/image-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce,
          },
          body: JSON.stringify({
            image_path: imagePath
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
          // Handle the secure base64 image data response
          if (data.image_data) {
            setSignedUrl(data.image_data); // Use base64 data URL
          } else if (data.imageData) {
            setSignedUrl(data.imageData); // Legacy format support
          } else {
            // Fallback to a placeholder image or error message
            setSignedUrl('data:image/png;base64,PLACEHOLDER_BASE64');
            console.warn('No image data in response, using placeholder');
          }
        } else {
          throw new Error(data.message || 'Failed to get image');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (imagePath) {
      fetchSignedUrl();
    }
  }, [imagePath, productCode]);

  if (loading) {
    return (
      <div className={`${className} bg-gray-100 animate-pulse flex items-center justify-center`}>
        <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-400">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`${className} bg-orange-100 border-2 border-orange-300 flex items-center justify-center`}>
        <svg width="16" height="16" viewBox="0 0 24 24" className="text-orange-600">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => {
        setError('Image load failed');
      }}
    />
  );
};

export default SecureImage;
