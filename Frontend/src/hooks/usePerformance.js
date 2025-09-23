import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCache } from '../utils/apiCache';

// Custom hook for data fetching with caching and loading states
export const useApiData = (apiCall, dependencies = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);
  
  const {
    enabled = true,
    refetchInterval = 0,
    staleTime = 5 * 60 * 1000, // 5 minutes
    retry = 3,
    retryDelay = 1000
  } = options;

  const retryCount = useRef(0);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled) return;

    // Check if data is still fresh
    const now = Date.now();
    if (!isRetry && data && (now - lastFetch) < staleTime) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      setLastFetch(now);
      retryCount.current = 0;
    } catch (err) {
      setError(err);
      
      // Retry logic
      if (retryCount.current < retry) {
        retryCount.current++;
        setTimeout(() => {
          fetchData(true);
        }, retryDelay * retryCount.current);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall, enabled, data, lastFetch, staleTime, retry, retryDelay]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [...dependencies, fetchData]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval > 0) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, fetchData]);

  // Manual refetch
  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale: data && (Date.now() - lastFetch) > staleTime
  };
};

// Hook for debounced values
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttled callbacks
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

// Hook for intersection observer (lazy loading)
export const useIntersectionObserver = (options = {}) => {
  const [ref, setRef] = useState(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(ref);

    return () => {
      if (ref) {
        observer.unobserve(ref);
      }
    };
  }, [ref, hasIntersected, options]);

  return [setRef, isIntersecting, hasIntersected];
};

// Hook for local storage with sync
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Dispatch custom event for cross-tab sync
      window.dispatchEvent(new CustomEvent('localStorage', {
        detail: { key, value: valueToStore }
      }));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };

    window.addEventListener('localStorage', handleStorageChange);
    return () => window.removeEventListener('localStorage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
};

// Hook for optimistic updates
export const useOptimisticUpdate = (initialData, updateFn) => {
  const [data, setData] = useState(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousData = useRef(initialData);

  const update = useCallback(async (optimisticData, apiCall) => {
    previousData.current = data;
    setData(optimisticData);
    setIsUpdating(true);

    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (error) {
      // Rollback on error
      setData(previousData.current);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [data]);

  return [data, update, isUpdating];
};

// Hook for infinite scrolling
export const useInfiniteScroll = (fetchMore, hasMore = true) => {
  const [isFetching, setIsFetching] = useState(false);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore) return;
    
    setIsFetching(true);
    try {
      await fetchMore();
    } catch (error) {
      console.error('Error fetching more data:', error);
    } finally {
      setIsFetching(false);
    }
  }, [fetchMore, hasMore, isFetching]);

  return [loadMore, isFetching];
};