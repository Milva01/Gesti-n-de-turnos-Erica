import React from 'react';

interface ErikaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSlogan?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
}

export const ErikaLogo: React.FC<ErikaLogoProps> = ({
  className = '',
  size = 'lg',
  showSlogan = true,
  onClick,
  interactive = false,
}) => {
  // Height sizing
  const sizeClasses = {
    sm: 'h-10 sm:h-11',
    md: 'h-14 sm:h-16',
    lg: 'h-16 sm:h-20',
    xl: 'h-20 sm:h-24 md:h-28',
    '2xl': 'h-28 sm:h-36',
  }[size] || 'h-16 sm:h-20';

  return (
    <div
      onClick={onClick}
      role={interactive || onClick ? 'button' : undefined}
      tabIndex={interactive || onClick ? 0 : undefined}
      title={onClick ? 'Erika Valentini - Hacer clic para recargar página' : 'Erika Valentini - Estilo en tus cabellos'}
      className={`relative inline-flex items-center select-none ${
        onClick || interactive
          ? 'cursor-pointer group focus:outline-none'
          : ''
      } ${className}`}
    >
      {/* Ambient background glow for high distinction on dark themes */}
      <div className="absolute -inset-2 bg-gradient-to-r from-pink-600/20 via-rose-500/10 to-purple-600/15 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 pointer-events-none" />

      <svg
        viewBox="0 0 420 150"
        className={`${sizeClasses} w-auto transition-transform duration-300 group-hover:scale-[1.03] group-active:scale-[0.98] drop-shadow-lg`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
      >
        <defs>
          {/* Main vibrant magenta gradient matching original logo */}
          <linearGradient id="erikaMagentaGradient" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#ff2a85" />
            <stop offset="45%" stopColor="#f43f5e" />
            <stop offset="75%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#d91b6e" />
          </linearGradient>

          {/* Slogan gradient */}
          <linearGradient id="sloganGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>

          {/* Hair swoosh gradient */}
          <linearGradient id="swooshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.5" />
          </linearGradient>

          {/* Soft outer glow */}
          <filter id="erikaOuterGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#ec4899" floodOpacity="0.55" />
          </filter>
          
          <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Outer subtle decorative ring accent */}
        <circle
          cx="82"
          cy="60"
          r="48"
          fill="none"
          stroke="#ff2a85"
          strokeWidth="1.5"
          opacity="0.25"
          strokeDasharray="4 3"
        />

        {/* The Signature Magenta Circle framing 'erika' */}
        <circle
          cx="82"
          cy="60"
          r="46"
          fill="none"
          stroke="url(#erikaMagentaGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          filter="url(#erikaOuterGlow)"
        />

        {/* Pure white brand typography: 'erika' */}
        <text
          x="75"
          y="60"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Montserrat', 'Segoe UI', Roboto, sans-serif"
          fontSize="48"
          fontWeight="800"
          letterSpacing="-1.8px"
          fill="#ffffff"
          filter="url(#textShadow)"
        >
          erika
        </text>

        {/* Pure white brand typography: 'valentini' */}
        <text
          x="80"
          y="108"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Montserrat', 'Segoe UI', Roboto, sans-serif"
          fontSize="49"
          fontWeight="800"
          letterSpacing="-1.8px"
          fill="#ffffff"
          filter="url(#textShadow)"
        >
          valentini
        </text>

        {showSlogan && (
          <>
            {/* Elegant hair wave swoosh */}
            <path
              d="M 195 116 Q 260 106 365 119"
              fill="none"
              stroke="url(#swooshGrad)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Slogan: estilo en tus cabellos */}
            <text
              x="200"
              y="134"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              fontSize="16.5"
              fontWeight="400"
              letterSpacing="0.8px"
              fill="url(#sloganGrad)"
              className="tracking-wider"
            >
              estilo en tus cabellos
            </text>
          </>
        )}
      </svg>
    </div>
  );
};
