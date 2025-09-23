import React, { useState, useEffect } from 'react';
import { Activity, Zap, Clock, Database } from 'lucide-react';

const PerformanceMonitor = ({ enabled = false }) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    apiCalls: 0,
    cacheHits: 0,
    memoryUsage: 0
  });
  
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let observer;
    if (typeof PerformanceObserver !== 'undefined') {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.includes('React')) {
            setMetrics(prev => ({
              ...prev,
              renderTime: entry.duration
            }));
          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });
    }

    // Memory usage monitoring
    const memoryInterval = setInterval(() => {
      if (performance.memory) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(performance.memory.usedJSHeapSize / 1048576) // MB
        }));
      }
    }, 2000);

    return () => {
      if (observer) observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Performance Monitor"
      >
        <Activity className="w-5 h-5" />
      </button>

      {/* Performance panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-xl border border-white/20 min-w-[250px]">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="font-medium text-sm">Performance Metrics</h3>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Render Time:
              </span>
              <span className={`font-mono ${metrics.renderTime > 16 ? 'text-red-400' : 'text-green-400'}`}>
                {metrics.renderTime.toFixed(1)}ms
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                Memory:
              </span>
              <span className={`font-mono ${metrics.memoryUsage > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                {metrics.memoryUsage}MB
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>API Calls:</span>
              <span className="font-mono text-blue-400">{metrics.apiCalls}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Cache Hits:</span>
              <span className="font-mono text-green-400">{metrics.cacheHits}</span>
            </div>
          </div>
          
          {/* Performance tips */}
          <div className="mt-3 pt-2 border-t border-white/20">
            <div className="text-xs text-gray-300">
              {metrics.renderTime > 16 && (
                <div className="text-red-400">⚠️ Slow render detected</div>
              )}
              {metrics.memoryUsage > 100 && (
                <div className="text-yellow-400">⚠️ High memory usage</div>
              )}
              {metrics.renderTime <= 16 && metrics.memoryUsage <= 50 && (
                <div className="text-green-400">✅ Performance good</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PerformanceMonitor;