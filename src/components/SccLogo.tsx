import React from 'react';

interface SccLogoProps {
  className?: string;
}

export const SccLogo: React.FC<SccLogoProps> = ({ className = 'h-7 w-auto' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="14 13 174 72"
      role="img"
      aria-label="SCC Logo"
      className={className}
    >
      {/* Pure transparent royal-blue SCC monogram (adapts cleanly in dark mode) */}
      <g fill="currentColor">
        {/* Stylized S with top and bottom horizontal swooshes */}
        <path d="M 186 15 L 54 15 C 32 15 21 25 21 37 C 21 48 33 54 50 55 C 60 56 64 59 62 64 C 60 69 52 71 38 71 L 20 71 L 16 83 L 168 83 L 173 74 L 64 74 C 73 70 78 63 78 56 C 78 46 66 42 47 41 C 37 40 34 37 35 32 C 37 27 45 25 60 25 L 181 25 Z" />

        {/* First italic C */}
        <path d="M 129 39 L 132 30 C 118 29 102 29 93 36 C 85 42 82 51 84 60 C 86 67 94 70 108 70 C 116 70 122 69 126 67 L 128 58 C 122 60 115 61 108 61 C 99 61 95 58 95 50 C 95 42 102 38 114 38 C 120 38 125 38 129 39 Z" />

        {/* Second italic C */}
        <path d="M 176 39 L 179 30 C 165 29 149 29 140 36 C 132 42 129 51 131 60 C 133 67 141 70 155 70 C 163 70 169 69 173 67 L 175 58 C 169 60 162 61 155 61 C 146 61 142 58 142 50 C 142 42 149 38 161 38 C 167 38 172 38 176 39 Z" />
      </g>
    </svg>
  );
};
