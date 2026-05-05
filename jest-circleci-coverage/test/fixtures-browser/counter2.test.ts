import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './counter';

describe('Counter (second suite)', () => {
  it('increments twice when clicked twice', async () => {
    const user = userEvent.setup();
    render(React.createElement(Counter));

    expect(screen.getByLabelText('count')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: /increment/i }));
    await user.click(screen.getByRole('button', { name: /increment/i }));
    expect(screen.getByLabelText('count')).toHaveTextContent('2');
  });
});
