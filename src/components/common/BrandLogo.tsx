import React from 'react';
import { useApp } from '../../context/AppContext';

interface BrandLogoProps {
  brand: string;
  /** Tailwind height class for the logo image, e.g. 'h-6', 'h-8'. */
  heightClass?: string;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Force a light plate behind the logo (useful on dark surfaces). */
  plate?: boolean;
}

/**
 * Resolves a product brand to its uploaded logo (settings.brandLogos, keyed by
 * lowercased brand name) and renders it as an image. Falls back to a styled text
 * badge when no logo is configured — so unknown brands still look intentional.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  brand,
  heightClass = 'h-6',
  className = '',
  plate = true
}) => {
  const { settings } = useApp();
  const logos = settings.brandLogos || {};
  const src = brand ? logos[brand.trim().toLowerCase()] : undefined;

  if (src) {
    return (
      <span
        className={`inline-flex items-center justify-center ${
          plate ? 'bg-white rounded-md px-1.5 py-0.5 border border-slate-200/60 shadow-2xs' : ''
        } ${className}`}
        title={brand}
      >
        <img src={src} alt={brand} className={`${heightClass} w-auto object-contain`} />
      </span>
    );
  }

  // Text fallback
  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase tracking-tight text-slate-700 bg-slate-100 rounded px-2 py-0.5 text-[10px] ${className}`}
      title={brand}
    >
      {brand}
    </span>
  );
};
