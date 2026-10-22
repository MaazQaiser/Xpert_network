import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { expectNoAxeViolations } from '@/test/axe';
import { getOverrides, resetOverrides } from '../../model/overrides';
import { DesignSystemView } from './DesignSystemView';

function renderView() {
  return render(
    <ThemeProvider>
      <DesignSystemView />
    </ThemeProvider>,
  );
}

describe('DesignSystemView', () => {
  beforeEach(() => resetOverrides());

  it('edits a colour token for the current theme and can reset it', async () => {
    const user = userEvent.setup();
    const { container } = renderView();

    expect(screen.getByRole('heading', { level: 1, name: 'Design system' })).toBeInTheDocument();
    const coloursPanel = screen.getAllByRole('tabpanel', { hidden: true })[0];
    const field = within(coloursPanel).getByLabelText('Button primary value');
    await user.clear(field);
    await user.type(field, '#123456{Enter}');

    expect(getOverrides().light['--cds-button-primary']).toBe('#123456');
    expect(screen.getByRole('button', { name: /Export changes \(1\)/ })).toBeInTheDocument();

    await user.click(within(coloursPanel).getByRole('button', { name: 'Reset Button primary' }));
    expect(getOverrides().light).toEqual({});
    await expectNoAxeViolations(container);
  });

  it('shows the type scale and the component gallery', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('tab', { name: 'Typography' }));
    expect(screen.getByText('heading-05')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Components' }));
    expect(screen.getByRole('heading', { name: 'Buttons' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Xpert Network components' })).toBeInTheDocument();
  });
});
