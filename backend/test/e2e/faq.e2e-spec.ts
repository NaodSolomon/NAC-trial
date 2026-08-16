import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('FAQ entries (e2e)', () => {
  let context: E2eTestContext;
  let superAdmin: TestSession;
  let editor: TestSession;
  let finance: TestSession;

  const draft = (overrides: Record<string, unknown> = {}) => ({
    translationKey: `faq-${Math.random().toString(36).slice(2, 10)}`,
    languageCode: 'en',
    question: 'What support does the center provide?',
    answer: 'Therapy, family guidance and community inclusion programmes.',
    category: 'Services',
    ...overrides,
  });

  async function createFaq(session: TestSession, overrides: Record<string, unknown> = {}) {
    const response = await request(context.app.getHttpServer())
      .post('/api/v1/admin/faqs')
      .set('Authorization', session.authorization)
      .send(draft(overrides))
      .expect(201);
    return response.body.data;
  }

  beforeAll(async () => {
    context = await createE2eTestContext();
    superAdmin = await authenticatedSession(
      context.app,
      context.actors.superAdmin.email,
      E2E_PASSWORD,
    );
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
    finance = await authenticatedSession(context.app, context.actors.finance.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('protects administrative FAQ routes by authentication and role', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/faqs').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/faqs')
      .set('Authorization', finance.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/faqs')
      .set('Authorization', editor.authorization)
      .expect(200);
  });

  it('keeps a draft out of the public listing until it is published', async () => {
    const created = await createFaq(editor, { question: 'Is this entry still a draft?' });
    expect(created.status).toBe('DRAFT');

    await request(context.app.getHttpServer())
      .get('/api/v1/public/faqs?languageCode=en')
      .expect(200)
      .expect(({ body }) => {
        const questions = body.data.items.map((item: { question: string }) => item.question);
        expect(questions).not.toContain('Is this entry still a draft?');
      });

    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/faqs/${created.id}/publish`)
      .set('Authorization', editor.authorization)
      .expect(201);

    await request(context.app.getHttpServer())
      .get('/api/v1/public/faqs?languageCode=en')
      .expect(200)
      .expect(({ body }) => {
        const questions = body.data.items.map((item: { question: string }) => item.question);
        expect(questions).toContain('Is this entry still a draft?');
      });
  });

  it('never exposes authorship or workflow fields publicly', async () => {
    const created = await createFaq(editor, { question: 'Who wrote this entry?' });
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/faqs/${created.id}/publish`)
      .set('Authorization', editor.authorization)
      .expect(201);

    await request(context.app.getHttpServer())
      .get('/api/v1/public/faqs?languageCode=en')
      .expect(200)
      .expect(({ body }) => {
        for (const item of body.data.items) {
          expect(Object.keys(item).sort()).toEqual(['answer', 'category', 'id', 'question']);
        }
      });
  });

  it('rejects a duplicate translation for the same language', async () => {
    const translationKey = 'duplicate-translation-key';
    await createFaq(editor, { translationKey });

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/faqs')
      .set('Authorization', editor.authorization)
      .send(draft({ translationKey }))
      .expect(409);
  });

  it('allows the same translation key in the other language', async () => {
    const translationKey = 'shared-translation-key';
    await createFaq(editor, { translationKey, languageCode: 'en' });

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/faqs')
      .set('Authorization', editor.authorization)
      .send(draft({ translationKey, languageCode: 'am', question: 'ማዕከሉ ምን ድጋፍ ይሰጣል?' }))
      .expect(201);
  });

  it('returns published entries in the configured display order', async () => {
    const first = await createFaq(editor, { question: 'Ordered question one' });
    const second = await createFaq(editor, { question: 'Ordered question two' });
    for (const entry of [first, second]) {
      await request(context.app.getHttpServer())
        .post(`/api/v1/admin/faqs/${entry.id}/publish`)
        .set('Authorization', editor.authorization)
        .expect(201);
    }

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/faqs/reorder')
      .set('Authorization', editor.authorization)
      .send({
        entries: [
          { id: second.id, sortOrder: 0 },
          { id: first.id, sortOrder: 1 },
        ],
      })
      .expect(201)
      .expect(({ body }) => expect(body.data.reordered).toBe(2));

    await request(context.app.getHttpServer())
      .get('/api/v1/public/faqs?languageCode=en')
      .expect(200)
      .expect(({ body }) => {
        const questions = body.data.items.map((item: { question: string }) => item.question);
        expect(questions.indexOf('Ordered question two')).toBeLessThan(
          questions.indexOf('Ordered question one'),
        );
      });
  });

  it('filters the public listing by category', async () => {
    const entry = await createFaq(editor, {
      question: 'Where is the center located?',
      category: 'Visiting',
    });
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/faqs/${entry.id}/publish`)
      .set('Authorization', editor.authorization)
      .expect(201);

    await request(context.app.getHttpServer())
      .get('/api/v1/public/faqs?languageCode=en&category=Visiting')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.items.length).toBeGreaterThan(0);
        for (const item of body.data.items) expect(item.category).toBe('Visiting');
      });

    await request(context.app.getHttpServer())
      .get('/api/v1/public/faqs/categories?languageCode=en')
      .expect(200)
      .expect(({ body }) => expect(body.data).toContain('Visiting'));
  });

  it('restricts deletion to a super administrator', async () => {
    const entry = await createFaq(editor, { question: 'Can an editor delete this?' });

    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/faqs/${entry.id}`)
      .set('Authorization', editor.authorization)
      .expect(403);

    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/faqs/${entry.id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);

    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/faqs/${entry.id}`)
      .set('Authorization', editor.authorization)
      .expect(404);
  });

  it('validates the submitted payload', async () => {
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/faqs')
      .set('Authorization', editor.authorization)
      .send({ translationKey: 'x', languageCode: 'fr', question: '', answer: '' })
      .expect(400);
  });
});
