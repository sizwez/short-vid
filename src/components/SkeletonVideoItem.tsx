import React from 'react';

const SkeletonVideoItem: React.FC = () => {
  return (
    <div className="relative h-screen snap-start flex items-center justify-center bg-black overflow-hidden">
      {/* Background Pulse */}
      <div className="absolute inset-0 bg-white/5 animate-pulse" />

      {/* Side Action Buttons Skeleton */}
      <div className="absolute bottom-28 right-4 flex flex-col items-center gap-6">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full skeleton-pulse" />
        
        {/* Buttons */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full skeleton-pulse" />
            <div className="w-6 h-3 rounded skeleton-pulse mt-1" />
          </div>
        ))}
      </div>

      {/* Video Info Overlay Skeleton */}
      <div className="absolute bottom-28 left-4 right-24 text-white">
        <div className="w-32 h-6 rounded skeleton-pulse mb-4" />
        <div className="w-full h-4 rounded skeleton-pulse mb-2" />
        <div className="w-3/4 h-4 rounded skeleton-pulse mb-4" />
        
        <div className="flex gap-2">
          <div className="w-16 h-4 rounded skeleton-pulse" />
          <div className="w-16 h-4 rounded skeleton-pulse" />
          <div className="w-16 h-4 rounded skeleton-pulse" />
        </div>

        <div className="mt-6 w-48 h-8 rounded-full skeleton-pulse opacity-50" />
      </div>
    </div>
  );
};

export default SkeletonVideoItem;
