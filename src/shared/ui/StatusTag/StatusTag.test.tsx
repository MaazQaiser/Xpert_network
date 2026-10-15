import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { expectNoAxeViolations } from '@/test/axe';
import { StatusTag } from './StatusTag';

describe('StatusTag', () => {
  it('pairs colour with an icon and a text label', async () => {
    const { container } = render(<StatusTag tone="success" label="Covered" />);
    expect(screen.getByText('Covered')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    await expectNoAxeViolations(container);
  });
});
