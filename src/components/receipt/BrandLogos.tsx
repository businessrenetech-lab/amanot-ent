import React from 'react';
import { DEFAULT_BRAND_LOGOS } from '../../data/brandLogos';

interface LogoProps {
  isMonochrome?: boolean;
  className?: string;
}

/**
 * KONKA Brand Logo (Uses high-resolution logo from user assets)
 */
export const KonkaLogo: React.FC<LogoProps> = ({ isMonochrome = true, className = 'h-8' }) => {
  const src = DEFAULT_BRAND_LOGOS['konka'];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {src ? (
        <img
          src={src}
          alt="KONKA"
          className="h-7 w-auto object-contain max-h-[30px]"
          style={{ filter: isMonochrome ? 'grayscale(100%) contrast(150%)' : 'none' }}
        />
      ) : (
        <span className="font-black text-sm text-black">KONKA</span>
      )}
      <span
        style={{ color: isMonochrome ? '#000000' : '#1e293b', fontSize: '8.5px', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.2px' }}
      >
        LED TV, FRIDGE & HOME APPLIANCES
      </span>
    </div>
  );
};

/**
 * GREE Brand Logo (Uses high-resolution logo from user assets)
 */
export const GreeLogo: React.FC<LogoProps> = ({ isMonochrome = true, className = 'h-8' }) => {
  const src = DEFAULT_BRAND_LOGOS['gree'];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {src ? (
        <img
          src={src}
          alt="GREE"
          className="h-7 w-auto object-contain max-h-[30px]"
          style={{ filter: isMonochrome ? 'grayscale(100%) contrast(150%)' : 'none' }}
        />
      ) : (
        <span className="font-black text-sm text-black">GREE</span>
      )}
      <span
        style={{ color: isMonochrome ? '#000000' : '#1e293b', fontSize: '8.5px', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.2px' }}
      >
        AIR CONDITIONERS & FRIDGE
      </span>
    </div>
  );
};

/**
 * HAIKO Brand Logo (Uses high-resolution logo from user assets)
 */
export const HaikoLogo: React.FC<LogoProps> = ({ isMonochrome = true, className = 'h-8' }) => {
  const src = DEFAULT_BRAND_LOGOS['haiko'];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {src ? (
        <img
          src={src}
          alt="HAIKO"
          className="h-7 w-auto object-contain max-h-[30px]"
          style={{ filter: isMonochrome ? 'grayscale(100%) contrast(150%)' : 'none' }}
        />
      ) : (
        <span className="font-black text-sm text-black">HAIKO</span>
      )}
      <span
        style={{ color: isMonochrome ? '#000000' : '#1e293b', fontSize: '8.5px', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.2px' }}
      >
        LED TV, AIR CONDITIONERS & FRIDGE
      </span>
    </div>
  );
};

/**
 * HAIER Brand Logo (official wordmark, cropped from the HBL price lists)
 */
export const HaierLogo: React.FC<LogoProps> = ({ isMonochrome = true, className = 'h-8' }) => {
  const src = DEFAULT_BRAND_LOGOS['haier'];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {src ? (
        <img
          src={src}
          alt="Haier"
          className="h-9 w-auto object-contain max-h-[40px]"
          style={{ filter: isMonochrome ? 'grayscale(100%) contrast(150%)' : 'none' }}
        />
      ) : (
        <span className="font-black text-lg" style={{ color: isMonochrome ? '#000000' : '#005AAA' }}>Haier</span>
      )}
      <span
        style={{ color: isMonochrome ? '#000000' : '#1e293b', fontSize: '8.5px', fontWeight: 800, marginTop: '2px', letterSpacing: '-0.2px' }}
      >
        EXCLUSIVE SHOWROOM
      </span>
    </div>
  );
};

/**
 * Electro Mart & Amanat Emblem Logo
 */
export const ElectroMartEmblem: React.FC<LogoProps> = ({ isMonochrome = true, className = 'w-10 h-10' }) => {
  const brandColor = isMonochrome ? '#000000' : '#1E3A8A';

  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={brandColor} strokeWidth="5" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={brandColor} strokeWidth="2" strokeDasharray="4 2" />
      {/* Outer 'e' curve */}
      <path
        d="M 30 50 C 30 35 42 25 58 25 C 70 25 78 32 78 42 L 30 42 C 30 60 42 68 58 68 C 68 68 74 63 76 56 L 86 58 C 82 72 70 80 56 80 C 38 80 30 65 30 50 Z"
        fill={brandColor}
      />
      {/* Inner letterform */}
      <path
        d="M 45 30 L 55 30 L 68 65 L 58 65 L 53 52 L 42 52 L 39 65 L 30 65 Z M 44 44 L 50 44 L 47 35 Z"
        fill={brandColor}
      />
    </svg>
  );
};
