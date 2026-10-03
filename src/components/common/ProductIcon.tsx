import React, { useState } from 'react';

interface ProductIconProps {
  categoryId?: string;
  imagePath?: string;
  productName?: string;
  className?: string;
  size?: number;
}

export const ProductIcon: React.FC<ProductIconProps> = ({ 
  categoryId = 'CAT-SKIN', 
  imagePath, 
  productName, 
  className = 'w-10 h-10', 
  size = 40 
}) => {
  const [imageError, setImageError] = useState(false);

  if (imagePath && !imageError) {
    return (
      <div 
        className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0 shadow-2xs ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={imagePath}
          alt={productName || 'Product'}
          className="w-full h-full object-contain p-0.5"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  switch (categoryId) {
    case 'CAT-HAIR':
      return (
        <div className={`flex items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-100/80 ${className}`}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4" />
            <path d="m4.93 10.93 1.41 1.41" />
            <path d="M2 18h2" />
            <path d="M20 18h2" />
            <path d="m19.07 10.93-1.41 1.41" />
            <path d="M22 22H2" />
            <path d="M8 22v-4a4 4 0 0 1 8 0v4" />
            <circle cx="12" cy="11" r="3" />
          </svg>
        </div>
      );
    case 'CAT-SKIN':
      return (
        <div className={`flex items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100/80 ${className}`}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        </div>
      );
    case 'CAT-SOAP':
      return (
        <div className={`flex items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-100/80 ${className}`}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="12" x="3" y="6" rx="4" />
            <path d="M7 10h10" />
            <path d="M7 14h5" />
          </svg>
        </div>
      );
    case 'CAT-FACEWASH':
      return (
        <div className={`flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100/80 ${className}`}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6" />
            <path d="M12 3v5" />
            <rect width="12" height="13" x="6" y="8" rx="2" />
            <path d="M10 13h4" />
            <path d="M12 11v4" />
          </svg>
        </div>
      );
    case 'CAT-HAIROIL':
      return (
        <div className={`flex items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-100/80 ${className}`}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
          </svg>
        </div>
      );
    case 'CAT-SUNSCREEN':
    default:
      return (
        <div className={`flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/80 ${className}`}>
          <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </div>
      );
  }
};
