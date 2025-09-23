import React, { useState, useEffect, useCallback, useMemo } from 'react';

const VirtualScrollList = ({ 
  items = [], 
  itemHeight = 60, 
  containerHeight = 400,
  renderItem,
  overscan = 5,
  className = "",
  loadMore = null,
  hasMore = false,
  isLoading = false
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!items.length) return { start: 0, end: 0 };
    
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    return {
      start: Math.max(0, visibleStart - overscan),
      end: Math.min(items.length, visibleEnd + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Handle scroll with throttling
  const handleScroll = useCallback(
    throttle((e) => {
      const scrollTop = e.target.scrollTop;
      setScrollTop(scrollTop);
      
      // Load more when near bottom
      if (loadMore && hasMore && !isLoading) {
        const scrollBottom = scrollTop + containerHeight;
        const threshold = totalHeight - (itemHeight * 10); // Load when 10 items from bottom
        
        if (scrollBottom >= threshold) {
          loadMore();
        }
      }
    }, 16), // ~60fps
    [containerHeight, totalHeight, itemHeight, loadMore, hasMore, isLoading]
  );

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  // Calculate offset for visible items
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div 
      ref={setContainerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={item.id || index}
              style={{ 
                height: itemHeight,
                position: 'relative'
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div 
              className="flex items-center justify-center py-4"
              style={{ height: itemHeight }}
            >
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-400">Loading more...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Throttle utility
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

export default VirtualScrollList;