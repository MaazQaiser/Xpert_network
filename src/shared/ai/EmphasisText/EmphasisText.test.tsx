import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { EmphasisText } from './EmphasisText';

describe('EmphasisText', () => {
  it('bolds names and counts, and colours the key count', () => {
    const { container } = render(
      <p>
        <EmphasisText text="[[3 new projects]] came in, [[!2 to confirm]]. Start with **PRJ-1042**." />
      </p>,
    );
    expect(container.textContent).toBe(
      '3 new projects came in, 2 to confirm. Start with PRJ-1042.',
    );
    const bold = [...container.querySelectorAll('strong')];
    expect(bold.map((b) => b.textContent)).toEqual(['3 new projects', '2 to confirm', 'PRJ-1042']);
    expect(bold[0]?.className).not.toMatch(/key/);
    expect(bold[1]?.className).toMatch(/key/);
  });

  it('never renders markup from the text', () => {
    const { container } = render(<EmphasisText text="<b>not bold</b> **bold**" />);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>not bold</b> bold');
  });
});
