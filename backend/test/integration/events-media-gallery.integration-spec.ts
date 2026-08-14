import { eq } from 'drizzle-orm';
import {
  galleryItems,
  mediaAssets,
  mediaTranslations,
  storageDeletionOutbox,
} from '../../src/database/schema';
import { DrizzleEventRepository } from '../../src/modules/events/repositories/drizzle-event.repository';
import { DrizzleGalleryRepository } from '../../src/modules/gallery/repositories/drizzle-gallery.repository';
import { DrizzleMediaRepository } from '../../src/modules/media/repositories/drizzle-media.repository';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin, pageCriteria } from '../helpers/repository-fixtures.helper';

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('Event, media, and gallery repositories (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let eventRepository: DrizzleEventRepository;
  let mediaRepository: DrizzleMediaRepository;
  let galleryRepository: DrizzleGalleryRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    eventRepository = new DrizzleEventRepository(context.db);
    mediaRepository = new DrizzleMediaRepository(context.db);
    galleryRepository = new DrizzleGalleryRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('persists published events and enforces one RSVP per email and event', async () => {
    const event = await eventRepository.create(
      {
        slug: 'awareness-day',
        title: 'Autism Awareness Day',
        description: 'Community awareness event.',
        startDate: new Date('2027-04-01T09:00:00.000Z'),
        endDate: new Date('2027-04-01T12:00:00.000Z'),
        location: 'Addis Ababa',
        rsvpEnabled: true,
        status: 'PUBLISHED',
        languageCode: 'en',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    await expect(eventRepository.findPublicBySlug('awareness-day', 'en')).resolves.toMatchObject({
      id: event.id,
    });

    const rsvp = {
      eventId: event.id,
      name: 'Event Visitor',
      email: 'rsvp@integration.test',
      attendees: 2,
    };
    await eventRepository.createRsvp(rsvp);
    await expectPostgresError(eventRepository.createRsvp(rsvp), '23505');
    await expect(eventRepository.allRsvps(event.id)).resolves.toHaveLength(1);
  });

  it('enforces valid event date ranges in PostgreSQL', async () => {
    await expectPostgresError(
      eventRepository.create(
        {
          slug: 'invalid-dates',
          title: 'Invalid Event',
          description: 'The database must reject this event.',
          startDate: new Date('2027-05-01T12:00:00.000Z'),
          endDate: new Date('2027-05-01T11:00:00.000Z'),
          location: 'Addis Ababa',
          createdBy: ACTOR_ID,
        },
        ACTOR_ID,
      ),
      '23514',
    );
  });

  it('persists media metadata and localized translations atomically', async () => {
    const media = await mediaRepository.create(
      {
        objectKey: 'integration/images/therapy.webp',
        publicUrl: 'http://minio.test/integration/images/therapy.webp',
        originalName: 'therapy.webp',
        mimeType: 'image/webp',
        sizeBytes: 1024,
        type: 'IMAGE',
        uploadedBy: ACTOR_ID,
      },
      {
        languageCode: 'en',
        altText: 'A child participating in a therapy activity',
        caption: 'Therapy activity',
      },
      ACTOR_ID,
    );

    await expect(
      mediaRepository.list({ ...pageCriteria, type: 'IMAGE', search: 'therapy' }),
    ).resolves.toMatchObject({
      data: [
        expect.objectContaining({
          id: media.id,
          translations: [expect.objectContaining({ languageCode: 'en' })],
        }),
      ],
      meta: { total: 1 },
    });
    expect(await context.db.select().from(mediaTranslations)).toHaveLength(1);
  });

  it('enforces media object-key and translation uniqueness', async () => {
    const media = await mediaRepository.create(
      {
        objectKey: 'integration/images/unique.webp',
        publicUrl: 'http://minio.test/integration/images/unique.webp',
        originalName: 'unique.webp',
        mimeType: 'image/webp',
        sizeBytes: 512,
        type: 'IMAGE',
        uploadedBy: ACTOR_ID,
      },
      { languageCode: 'en', altText: 'Unique image' },
      ACTOR_ID,
    );

    await expectPostgresError(
      context.db.insert(mediaAssets).values({
        objectKey: 'integration/images/unique.webp',
        publicUrl: 'http://minio.test/duplicate.webp',
        originalName: 'duplicate.webp',
        mimeType: 'image/webp',
        sizeBytes: 512,
        type: 'IMAGE',
        uploadedBy: ACTOR_ID,
      }),
      '23505',
    );
    await expectPostgresError(
      context.db.insert(mediaTranslations).values({
        mediaId: media.id,
        languageCode: 'en',
        altText: 'Duplicate translation',
      }),
      '23505',
    );
  });

  it('atomically deletes media metadata, audits, and enqueues object cleanup', async () => {
    const media = await mediaRepository.create(
      {
        objectKey: 'integration/images/delete-me.webp',
        publicUrl: 'http://minio.test/integration/images/delete-me.webp',
        originalName: 'delete-me.webp',
        mimeType: 'image/webp',
        sizeBytes: 512,
        type: 'IMAGE',
        uploadedBy: ACTOR_ID,
      },
      null,
      ACTOR_ID,
    );

    await expect(mediaRepository.deleteAndEnqueueStorageCleanup(media.id, ACTOR_ID)).resolves.toBe(
      true,
    );
    expect(await context.db.select().from(mediaAssets).where(eq(mediaAssets.id, media.id))).toEqual(
      [],
    );
    expect(await context.db.select().from(storageDeletionOutbox)).toEqual([
      expect.objectContaining({ objectKey: media.objectKey, status: 'PENDING' }),
    ]);
  });

  it('joins gallery metadata to media and removes both transactionally', async () => {
    const media = await mediaRepository.create(
      {
        objectKey: 'integration/gallery/community.webp',
        publicUrl: 'http://minio.test/integration/gallery/community.webp',
        originalName: 'community.webp',
        mimeType: 'image/webp',
        sizeBytes: 2048,
        type: 'IMAGE',
        uploadedBy: ACTOR_ID,
      },
      null,
      ACTOR_ID,
    );
    const item = await galleryRepository.create(
      {
        mediaId: media.id,
        title: 'Community Event',
        altText: 'Families attending a community event',
        languageCode: 'en',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );

    await expect(
      galleryRepository.list({ ...pageCriteria, languageCode: 'en', type: 'IMAGE' }),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: item.id, mediaUrl: media.publicUrl })],
    });
    await expectPostgresError(
      context.db.insert(galleryItems).values({
        mediaId: media.id,
        title: 'Duplicate',
        altText: 'Duplicate media',
        languageCode: 'am',
        createdBy: ACTOR_ID,
      }),
      '23505',
    );

    await expectPostgresError(
      galleryRepository.deleteAndEnqueueStorageCleanup(
        item.id,
        '75dd6b23-5410-4df8-a596-45f6aa1aa111',
      ),
      '23503',
    );
    expect(
      await context.db.select().from(galleryItems).where(eq(galleryItems.id, item.id)),
    ).toHaveLength(1);
    expect(
      await context.db.select().from(mediaAssets).where(eq(mediaAssets.id, media.id)),
    ).toHaveLength(1);
    expect(await context.db.select().from(storageDeletionOutbox)).toEqual([]);

    await expect(galleryRepository.deleteAndEnqueueStorageCleanup(item.id, ACTOR_ID)).resolves.toBe(
      true,
    );
    expect(await context.db.select().from(mediaAssets).where(eq(mediaAssets.id, media.id))).toEqual(
      [],
    );
    expect(await context.db.select().from(storageDeletionOutbox)).toEqual([
      expect.objectContaining({ objectKey: media.objectKey, status: 'PENDING', attempts: 0 }),
    ]);
  });
});
