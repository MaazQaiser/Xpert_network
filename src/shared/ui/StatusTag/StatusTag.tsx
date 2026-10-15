'use client';

import { Tag } from '@carbon/react';
import {
  CheckmarkFilled,
  CircleDash,
  ErrorFilled,
  InProgress,
  InformationFilled,
  WarningAltFilled,
} from '@carbon/icons-react';
import type { ComponentType } from 'react';

export type StatusTone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'error';

const TONES: Record<
  StatusTone,
  { type: 'gray' | 'blue' | 'purple' | 'green' | 'warm-gray' | 'red'; icon: ComponentType }
> = {
  neutral: { type: 'gray', icon: CircleDash },
  info: { type: 'blue', icon: InformationFilled },
  progress: { type: 'purple', icon: InProgress },
  success: { type: 'green', icon: CheckmarkFilled },
  warning: { type: 'warm-gray', icon: WarningAltFilled },
  error: { type: 'red', icon: ErrorFilled },
};

export type StatusTagProps = {
  tone: StatusTone;
  label: string;
  size?: 'sm' | 'md';
};

/** Status is never colour alone: tone colour + icon + text (DESIGN_SYSTEM §4.1). */
export function StatusTag({ tone, label, size = 'md' }: StatusTagProps) {
  const { type, icon } = TONES[tone];
  return (
    <Tag type={type} size={size} renderIcon={icon}>
      {label}
    </Tag>
  );
}
