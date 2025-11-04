import React from 'react';

const LoadingSkeleton = ({ type = 'card', count = 1, className = '' }) => {
  const skeletons = {
    card: (
      <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-white/10 animate-skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4 animate-skeleton" />
              <div className="h-3 bg-white/10 rounded w-1/2 animate-skeleton" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded w-full animate-skeleton" />
          <div className="h-3 bg-white/10 rounded w-5/6 animate-skeleton" />
        </div>
      </div>
    ),
    
    table: (
      <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl overflow-hidden ${className}`}>
        <div className="p-6 border-b border-white/10">
          <div className="h-6 bg-white/10 rounded w-1/4 animate-skeleton" />
        </div>
        <div className="divide-y divide-white/10">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 animate-skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/3 animate-skeleton" />
                <div className="h-3 bg-white/10 rounded w-1/4 animate-skeleton" />
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded bg-white/10 animate-skeleton" />
                <div className="w-8 h-8 rounded bg-white/10 animate-skeleton" />
                <div className="w-8 h-8 rounded bg-white/10 animate-skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    
    stats: (
      <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-white/10 animate-skeleton" />
          <div className="w-6 h-6 rounded bg-white/10 animate-skeleton" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded w-2/3 animate-skeleton" />
          <div className="h-8 bg-white/10 rounded w-full animate-skeleton" />
          <div className="h-2 bg-white/10 rounded w-1/2 animate-skeleton" />
        </div>
      </div>
    ),
    
    list: (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-white/10 animate-skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-2/3 animate-skeleton" />
              <div className="h-3 bg-white/10 rounded w-1/2 animate-skeleton" />
            </div>
          </div>
        ))}
      </div>
    ),
    
    text: (
      <div className={`space-y-2 ${className}`}>
        <div className="h-4 bg-white/10 rounded w-full animate-skeleton" />
        <div className="h-4 bg-white/10 rounded w-5/6 animate-skeleton" />
        <div className="h-4 bg-white/10 rounded w-4/6 animate-skeleton" />
      </div>
    )
  };

  const SkeletonComponent = skeletons[type] || skeletons.card;

  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="animate-fade-in">
          {SkeletonComponent}
        </div>
      ))}
    </>
  );
};

export default LoadingSkeleton;
