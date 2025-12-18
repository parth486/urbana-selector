import React, { useState, useEffect } from 'react';

interface SecureImageProps {
  imagePath: string;
  productCode: string;
  className?: string;
  alt?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

const SecureImage: React.FC<SecureImageProps> = ({ 
  imagePath, 
  productCode, 
  className = "", 
  alt = "Product image",
  onClick: onImageClick,
}) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [loadMethod, setLoadMethod] = useState<string>('');
  const debugMode = (window as any).urbanaDebugMode || (window as any).urbanaAdmin?.debugMode || (window as any).urbanaPublic?.debugMode || false;

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        setError('');
        setLoadMethod('');
        
        // Get nonce (debug mode is determined above)
        const nonce = (window as any).urbanaAdmin?.nonce || (window as any).urbanaPublic?.nonce || '';
        
        if ( debugMode ) {
          console.log(`[SecureImage] Fetching: ${imagePath}`, { productCode, nonce: nonce ? 'present' : 'missing', debugMode });
        }
        
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
        if (debugMode) {
          console.log(`[SecureImage] Response for ${imagePath}:`, { 
            method: data.method, 
            success: data.success, 
            hasImageUrl: !!data.image_url, 
            hasImageData: !!data.image_data,
            error: data.error,
            message: data.message
          });
        }
        
        if (data.success) {
          // Handle presigned URL response (preferred method)
          if (data.method === 'presigned_url' && data.image_url) {
            if (debugMode) console.log('✅ Using presigned URL method (instant loading from DO)');
            setLoadMethod('presigned_url');
            setSignedUrl(data.image_url); // Use presigned URL directly
          }
          // Handle base64 fallback response
          else if (data.method === 'base64_fallback' && data.image_data) {
            if (debugMode) console.log('⚠️ Using base64 fallback method (slower, full data transfer)');
            setLoadMethod('base64_fallback');
            setSignedUrl(data.image_data); // Use base64 data URL
          }
          // Legacy format support
          else if (data.image_data) {
            if (debugMode) console.log('⚠️ Using legacy base64 format');
            setLoadMethod('base64_legacy');
            setSignedUrl(data.image_data); // Use base64 data URL
          } else if (data.imageData) {
            if (debugMode) console.log('⚠️ Using legacy imageData format');
            setLoadMethod('imageData_legacy');
            setSignedUrl(data.imageData); // Legacy format support
          } else {
            // Fallback to error state - will show SVG icon
            if (debugMode) console.error('No image URL or data received from server');
            throw new Error('No image URL or data received');
          }
        } else if (data.use_svg_icon) {
          // Server explicitly requested fallback to SVG icon
          if (debugMode) console.warn('Server requested SVG icon fallback:', data.error);
          setLoadMethod('svg_fallback');
          setError('Failed to load image - using SVG icon instead');
        } else {
          throw new Error(data.error || data.message || 'Failed to get image');
        }
      } catch (err: any) {
        if (debugMode) console.error(`[SecureImage] Fetch error for ${imagePath}:`, err.message, err);
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
      <div className={`${className} bg-orange-100 border-2 border-orange-300 flex items-center justify-center relative group`} title={error || 'Image failed to load'}>
        <svg width="16" height="16" viewBox="0 0 24 24" className="text-orange-600">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {/* Show error tooltip on hover in debug mode */}
        {debugMode && error && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            {error.substring(0, 50)}...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group h-full">
      <img
        src={signedUrl}
        alt={alt}
        className={className}
        onClick={(e) => {
          if ((window as any).urbanaDebugMode) console.log('[DataBuilder SecureImage] image clicked', imagePath);
          if (onImageClick) onImageClick(e);
        }}
        title={debugMode && loadMethod ? `Loaded via: ${loadMethod}` : ''}
        onError={() => {
          setError('Image load failed');
        }}
      />
      {debugMode && loadMethod && (
        <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded opacity-70 group-hover:opacity-100 transition-opacity font-semibold" title={`Method: ${loadMethod}`}>
          {loadMethod === 'presigned_url' ? '🔗 URL' : loadMethod === 'base64_fallback' ? '📦 B64' : '⚠️'}
        </div>
      )}
    </div>
  );
};

export default SecureImage;