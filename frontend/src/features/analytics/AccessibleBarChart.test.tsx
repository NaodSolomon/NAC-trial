import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccessibleBarChart } from './AccessibleBarChart';

describe('AccessibleBarChart', () => {
  it('pairs the decorative bars with a visible textual data table', () => {
    render(
      <AccessibleBarChart
        title="Top pages"
        description="Page-view totals"
        data={[
          { label: '/', value: 12 },
          { label: '/about', value: 5 },
        ]}
      />,
    );

    expect(screen.getByRole('table', { name: 'Top pages data table' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '/about' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '5' })).toBeInTheDocument();
  });
});
