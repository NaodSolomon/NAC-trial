import { fireEvent, render, screen } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ContactForm } from '@/features/contact/components/ContactForm';
import { browserApiClient } from '@/lib/api/browser-client';

const apiUrl = 'http://localhost:8000/api/v1';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW-backed request behavior', () => {
  it('renders loading and success while preventing a duplicate contact request', async () => {
    let requests = 0;
    server.use(
      http.post(`${apiUrl}/public/contact`, async () => {
        requests += 1;
        await delay(500);
        return HttpResponse.json({ success: true, data: { status: 'submitted' } }, { status: 201 });
      }),
    );
    render(<ContactForm language="en" />);
    fillContactForm();
    const submit = screen.getByRole('button', { name: 'Send message' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(await screen.findByRole('button', { name: /Sending/ })).toBeDisabled();
    expect(await screen.findByRole('status')).toHaveTextContent('Your message was sent');
    expect(requests).toBe(1);
  });

  it('renders a controlled availability error', async () => {
    server.use(
      http.post(`${apiUrl}/public/contact`, () =>
        HttpResponse.json({ message: 'Unavailable' }, { status: 503 }),
      ),
    );
    render(<ContactForm language="en" />);
    fillContactForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
  });

  it('maps a wrong-role response to the shared forbidden error', async () => {
    server.use(
      http.get(`${apiUrl}/admin/settings`, () =>
        HttpResponse.json({ message: 'Forbidden resource' }, { status: 403 }),
      ),
    );
    await expect(browserApiClient.get('/admin/settings')).rejects.toMatchObject({
      kind: 'AUTHORIZATION',
      status: 403,
    });
  });
});

function fillContactForm() {
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'MSW Family' } });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'msw-family@nehemiah.test' },
  });
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Please share the available family support information.' },
  });
}
