import React, { useState, useCallback } from 'react';
import { useIntersectionObserver } from '../../hooks/usePerformance';

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = '/api/placeholder/400/400',
  quality = 80,
  loading = 'lazy',
  ...props
}) => {
  const [imageState, setImageState] = useState({
    loaded: false,
    error: false,
    src: placeholder
  });

  const [setRef, isIntersecting, hasIntersected] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  const handleLoad = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      loaded: true,
      error: false
    }));
  }, []);

  const handleError = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      error: true,
      loaded: false,
      src: placeholder
    }));
  }, [placeholder]);

  // Load actual image when in viewport
  React.useEffect(() => {
    if (hasIntersected && !imageState.loaded && !imageState.error) {
      setImageState(prev => ({
        ...prev,
        src: src
      }));
    }
  }, [hasIntersected, src, imageState.loaded, imageState.error]);

  return (
    <div 
      ref={setRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      <img
        src={imageState.src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          transition-opacity duration-300
          ${imageState.loaded ? 'opacity-100' : 'opacity-70'}
          ${imageState.error ? 'opacity-50' : ''}
        `}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        {...props}
      />
      
      {/* Loading overlay */}
      {!imageState.loaded && !imageState.error && hasIntersected && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Error overlay */}
      {imageState.error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-sm text-center">
            <div className="text-2xl mb-2">🖼️</div>
            <div>Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;