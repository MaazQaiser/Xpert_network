import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XpertLogo } from './XpertLogo';

describe('XpertLogo', () => {
  it('names the mark when it stands alone', () => {
    render(<XpertLogo />);
    expect(screen.getByRole('img', { name: 'Xpert Network' })).toBeInTheDocument();
  });

  it('hides the mark behind the visible wordmark', () => {
    render(<XpertLogo wordmark suffix="Admin" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Xpert Network')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
