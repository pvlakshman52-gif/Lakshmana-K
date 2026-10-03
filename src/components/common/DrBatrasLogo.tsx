import React from 'react';

interface DrBatrasLogoProps {
  className?: string;
  isCollapsed?: boolean;
}

export const DrBatrasLogo: React.FC<DrBatrasLogoProps> = ({ className = '', isCollapsed = false }) => {
  if (isCollapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md border border-slate-100">
          <div className="flex items-center">
            <span className="bg-[#e11d2a] text-white text-xs font-black px-1 py-0.5 rounded-l leading-none">
              Dr
            </span>
            <span className="text-[#00529b] text-xs font-black px-1 py-0.5 leading-none">
              B
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Dr Batra's Official Badge Container */}
      <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100/90 flex flex-col items-center justify-center shrink-0">
        <div className="flex items-center tracking-tight">
          <span className="bg-[#e11d2a] text-white text-xs font-black px-1.5 py-0.5 rounded-sm shadow-2xs leading-none">
            Dr
          </span>
          <span className="text-[#00529b] text-sm font-black pl-1 tracking-tight leading-none">
            Batra's
          </span>
          <span className="text-[#e11d2a] text-sm font-black leading-none">®</span>
        </div>
        <div className="w-full h-[1.5px] bg-[#00529b] my-0.5"></div>
        <span className="text-[8px] font-bold text-[#00529b] tracking-wider uppercase leading-none">
          Hair &amp; Skin Clinic
        </span>
      </div>
    </div>
  );
};
