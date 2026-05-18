/**
 * Code2Doc 品牌 Logo 组件
 */
'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Code2Doc Logo"
    >
      <rect width="32" height="32" rx="7" fill="#3B82F6" />
      {/* 左花括号 */}
      <path
        d="M12 6 C8 6 8 10 8 10 L8 22 C8 22 8 26 12 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* 右花括号 */}
      <path
        d="M20 6 C24 6 24 10 24 10 L24 22 C24 22 24 26 20 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* 文档横线 */}
      <line
        x1="12.5"
        y1="12"
        x2="19.5"
        y2="12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.95"
      />
      <line
        x1="12.5"
        y1="16"
        x2="19.5"
        y2="16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.95"
      />
      <line
        x1="12.5"
        y1="20"
        x2="17"
        y2="20"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.95"
      />
    </svg>
  );
}
