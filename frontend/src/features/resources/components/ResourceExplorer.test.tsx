import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceExplorer } from './ResourceExplorer';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('@/lib/api/browser-client', () => ({ browserApiClient: { get: apiGet } }));

const resources = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    title: 'Family guide',
    description: 'Practical information for families.',
    fileName: 'family-guide.pdf',
    fileUrl: 'https://files.example.org/family-guide.pdf',
    mimeType: 'application/pdf',
    languageCode: 'en' as const,
    status: 'PUBLISHED' as const,
    downloadCount: 2,
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    title: 'Activity notes',
    description: 'A text activity.',
    fileName: 'activity.txt',
    fileUrl: 'https://files.example.org/activity.txt',
    mimeType: 'text/plain',
    languageCode: 'en' as const,
    status: 'PUBLISHED' as const,
    downloadCount: 0,
  },
];

describe('ResourceExplorer', () => {
  beforeEach(() => {
    apiGet.mockReset();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('filters locally without contacting the download endpoint', () => {
    render(<ResourceExplorer initialResources={resources} language="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(screen.getByText('Family guide')).toBeInTheDocument();
    expect(screen.queryByText('Activity notes')).not.toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('coalesces rapid duplicate download clicks into one counted request', async () => {
    let completeRequest!: (value: unknown) => void;
    apiGet.mockReturnValue(new Promise((resolve) => (completeRequest = resolve)));
    render(<ResourceExplorer initialResources={[resources[0]]} language="en" />);

    const download = screen.getByRole('button', { name: 'Download' });
    fireEvent.click(download);
    fireEvent.click(download);
    expect(apiGet).toHaveBeenCalledTimes(1);

    completeRequest({ ...resources[0], downloadCount: 3 });
    await waitFor(() => expect(screen.getByText('3 downloads')).toBeInTheDocument());
  });

  it('shows a meaningful empty state', () => {
    render(<ResourceExplorer initialResources={[]} language="en" />);
    expect(screen.getByRole('status')).toHaveTextContent('Resources will be added soon');
  });
});
