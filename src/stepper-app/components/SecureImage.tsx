import React, { useState, useEffect } from 'react';

interface SecureImageProps {
  imagePath: string;
  productCode: string;
  className?: string;
  alt?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'auto';
}

const signedUrlCache = new Map<string, { url: string; method?: string }>();
const inflightRequests = new Map<string, Promise<{ url: string; method?: string }>>();

export async function prefetchImage(imagePath: string, productCode?: string) {
  if (!imagePath) return null;
  if (signedUrlCache.has(imagePath)) return signedUrlCache.get(imagePath)!;
  if (inflightRequests.has(imagePath)) return inflightRequests.get(imagePath)!;

  const promise = (async () => {
    const nonce = (window as any).urbanaPublic?.nonce || (window as any).urbanaAdmin?.nonce || '';
    const resp = await fetch('/wp-json/urbana/v1/image-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      body: JSON.stringify({ image_path: imagePath }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    if (data.success && data.method === 'presigned_url' && data.image_url) {
      const result = { url: data.image_url, method: 'presigned_url' };
      signedUrlCache.set(imagePath, result);
      inflightRequests.delete(imagePath);
      return result;
    }
    if (data.success && data.image_data) {
      const result = { url: data.image_data, method: data.method || 'base64' };
      signedUrlCache.set(imagePath, result);
      inflightRequests.delete(imagePath);
      return result;
    }
    inflightRequests.delete(imagePath);
    throw new Error(data.error || data.message || 'Failed to fetch image');
  })();

  inflightRequests.set(imagePath, promise);
  return promise;
}

const SecureImage: React.FC<SecureImageProps> = ({ 
  imagePath, 
  productCode, 
  className = "", 
  alt = "Product image",
  onClick: onImageClick,
  loading = 'lazy',
  fetchPriority = 'auto',
}) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState<string>('');
  const [loadMethod, setLoadMethod] = useState<string>('');
  const debugMode = (window as any).urbanaDebugMode || (window as any).urbanaAdmin?.debugMode || (window as any).urbanaPublic?.debugMode || false;

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setLoadingState(true);
        setError('');

        // Get nonce (debug mode is determined above)
        const nonce = (window as any).urbanaPublic?.nonce || (window as any).urbanaAdmin?.nonce || '';

        if (debugMode) console.log(`[SecureImage] Fetching: ${imagePath}`, { productCode, nonce: nonce ? 'present' : 'missing', debugMode });

        // Check cache or prefetch map
        try {
          const cached = signedUrlCache.get(imagePath);
          if (cached) {
            if (debugMode) console.log('[SecureImage] Using cached signed URL', imagePath);
            setLoadMethod(cached.method || 'cached');
            setSignedUrl(cached.url);
            return;
          }
          const fetched = await prefetchImage(imagePath, productCode);
          if (fetched) {
            if (debugMode) console.log('[SecureImage] Prefetch result', fetched);
            setLoadMethod(fetched.method || 'fetched');
            setSignedUrl(fetched.url);
            return;
          }
        } catch (err) {
          // fallthrough to explicit fetch attempt below if prefetch failed
          if (debugMode) console.warn('[SecureImage] prefetchImage failed, falling back to inline fetch', err);
        }

        const response = await fetch('/wp-json/urbana/v1/image-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce,
          },
          body: JSON.stringify({ image_path: imagePath }),
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
            signedUrlCache.set(imagePath, { url: data.image_url, method: 'presigned_url' });
          }
          // Handle base64 fallback response
          else if (data.method === 'base64_fallback' && data.image_data) {
            if (debugMode) console.log('⚠️ Using base64 fallback method (slower, full data transfer)');
            setLoadMethod('base64_fallback');
            setSignedUrl(data.image_data); // Use base64 data URL
            signedUrlCache.set(imagePath, { url: data.image_data, method: 'base64_fallback' });
          }
          // Legacy format support
          else if (data.image_data) {
            if (debugMode) console.log('⚠️ Using legacy base64 format');
            setLoadMethod('base64_legacy');
            setSignedUrl(data.image_data); // Use base64 data URL
            signedUrlCache.set(imagePath, { url: data.image_data, method: 'base64_legacy' });
          } else if (data.imageData) {
            if (debugMode) console.log('⚠️ Using legacy imageData format');
            setLoadMethod('imageData_legacy');
            setSignedUrl(data.imageData); // Legacy format support
            signedUrlCache.set(imagePath, { url: data.imageData, method: 'imageData_legacy' });
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
        setLoadingState(false);
      }
    };

    if (imagePath) {
      fetchSignedUrl();
    }
  }, [imagePath, productCode]);

  if (loadingState) {
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
        loading={loading}
        decoding="async"
        fetchpriority={fetchPriority}
        onClick={(e) => {
            const isDebug = (window as any).urbanaDebugMode || (window as any).urbanaAdmin?.debugMode || (window as any).urbanaPublic?.debugMode || false;
            if (isDebug) console.log('[SecureImage] image clicked', imagePath);
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
