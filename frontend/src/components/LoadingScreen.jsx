import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-[#313338] flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Đang tải...</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 