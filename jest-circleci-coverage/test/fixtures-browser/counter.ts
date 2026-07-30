import React from 'react';

export function Counter() {
  const [count, setCount] = React.useState(0);

  return React.createElement(
    'div',
    null,
    React.createElement('div', { 'aria-label': 'count' }, String(count)),
    React.createElement(
      'button',
      { type: 'button', onClick: () => setCount((c) => c + 1) },
      'Increment',
    ),
  );
}
