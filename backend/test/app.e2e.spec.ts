import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SignJWT } from 'jose';
import { getConnectionToken } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { AuthService as AuthServiceType } from '../src/auth/auth.service.js';

describe('API (e2e)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let auth: AuthServiceType;
  let alice: string;
  let bob: string;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    // Config reads process.env when the module is imported, so import only after pointing it at the in-memory server.
    process.env.MONGO_URI = mongo.getUri('memoriser_test');
    const { AppModule } = await import('../src/app.module.js');
    const { AuthService } = await import('../src/auth/auth.service.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0); // a single listening server, so parallel supertest calls do not race on ephemeral ports
    auth = app.get(AuthService);
    alice = await auth.sign('alice');
    bob = await auth.sign('bob');
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  describe('authentication', () => {
    it('serves health without a token', async () => {
      await http().get('/health').expect(200);
      await http().get('/api/v1/health').expect(200);
    });

    it('rejects missing, malformed and unsigned tokens', async () => {
      await http().get('/api/v1/vocabulary/me').expect(401);
      await http().get('/api/v1/vocabulary/me').set('Authorization', 'Bearer nope').expect(401);
      const forged = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"sub":"alice"}').toString('base64url')}.signature`;
      await http().get('/api/v1/vocabulary/me').set(as(forged)).expect(401);
    });

    it('rejects tokens signed with another secret and ignores x-user-id', async () => {
      const other = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('alice')
        .setIssuer('memoriser')
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode('another-secret-another-secret-another!'));
      await http().get('/api/v1/vocabulary/me').set(as(other)).expect(401);
      await http().get('/api/v1/vocabulary/me').set('x-user-id', 'alice').expect(401);
    });

    it('rejects an invalid Google credential', async () => {
      await http().post('/api/v1/auth/login').send({ credential: 'not-a-real-google-token' }).expect(401);
      await http().post('/api/v1/auth/login').send({}).expect(400);
    });
  });

  describe('vocabulary & collections', () => {
    let wordId: string;
    let inboxId: string;

    it('adds a word to the Inbox with a progress tracker', async () => {
      const res = await http()
        .post('/api/v1/vocabulary')
        .set(as(alice))
        .send({ word: 'ephemeral', definitions: ['short-lived'] })
        .expect(201);
      wordId = res.body.id;
      expect(res.body._id).toBeUndefined();
      expect(res.body.createdBy).toBe('alice');

      const overview = await http().get('/api/v1/learning/dashboard-overview').set(as(alice)).expect(200);
      expect(overview.body.stats).toMatchObject({ totalWords: 1, newCount: 1 });
      const inboxes = overview.body.collections.filter((c: any) => c.name === 'Inbox');
      expect(inboxes).toHaveLength(1);
      expect(inboxes[0].wordIds).toContain(wordId);
      inboxId = inboxes[0].id;
    });

    it('creates exactly one Inbox under concurrent first requests', async () => {
      const token = await auth.sign('carol');
      await Promise.all(Array.from({ length: 8 }, () => http().get('/api/v1/learning/dashboard-overview').set(as(token))));
      const res = await http().get('/api/v1/collections').set(as(token)).expect(200);
      expect(res.body.filter((c: any) => c.name === 'Inbox')).toHaveLength(1);
    });

    it('keeps users isolated', async () => {
      await http().get(`/api/v1/vocabulary/${wordId}`).set(as(bob)).expect(404);
      await http().put(`/api/v1/vocabulary/${wordId}`).set(as(bob)).send({ notes: 'hax' }).expect(404);
      await http().delete(`/api/v1/vocabulary/${wordId}`).set(as(bob)).expect(200);
      await http().post(`/api/v1/learning/${wordId}/review`).set(as(bob)).send({ grade: 5 }).expect(404);
      await http().put(`/api/v1/collections/${inboxId}`).set(as(bob)).send({ name: 'mine' }).expect(404);
      await http().post(`/api/v1/vocabulary?collectionId=${inboxId}`).set(as(bob)).send({ word: 'x' }).expect(404);
      await http().get(`/api/v1/vocabulary/${wordId}`).set(as(alice)).expect(200);
      expect((await http().get('/api/v1/vocabulary/me').set(as(bob))).body).toEqual([]);
    });

    it('rejects mass assignment and unknown fields', async () => {
      await http().post('/api/v1/vocabulary').set(as(alice)).send({ word: 'x', createdBy: 'bob' }).expect(400);
      await http().put(`/api/v1/vocabulary/${wordId}`).set(as(alice)).send({ createdBy: 'bob' }).expect(400);
      await http().post('/api/v1/collections').set(as(alice)).send({ name: 'c', userId: 'bob', wordIds: ['x'] }).expect(400);
    });

    it('answers 400 for malformed ids and grades', async () => {
      await http().get('/api/v1/vocabulary/not-an-id').set(as(alice)).expect(400);
      await http().post(`/api/v1/learning/${wordId}/review`).set(as(alice)).send({ grade: 9 }).expect(400);
      await http().post(`/api/v1/learning/${wordId}/review`).set(as(alice)).send({ grade: 'a' }).expect(400);
    });

    it('moves a word between collections', async () => {
      const col = (await http().post('/api/v1/collections').set(as(alice)).send({ name: 'Work' }).expect(201)).body;
      await http().put(`/api/v1/vocabulary/${wordId}?collectionId=${col.id}`).set(as(alice)).send({ notes: 'n' }).expect(200);
      const cols = (await http().get('/api/v1/collections').set(as(alice))).body;
      expect(cols.find((c: any) => c.id === col.id).wordIds).toEqual([wordId]);
      expect(cols.find((c: any) => c.id === inboxId).wordIds).toEqual([]);
    });

    it('ignores words the user does not own when setting collection words', async () => {
      const foreign = (await http().post('/api/v1/vocabulary').set(as(bob)).send({ word: 'secret' })).body.id;
      const col = (await http().get('/api/v1/collections').set(as(alice))).body[0];
      const res = await http().put(`/api/v1/collections/${col.id}/words`).set(as(alice)).send({ wordIds: [wordId, foreign] }).expect(200);
      expect(res.body.wordIds).toEqual([wordId]);
    });
  });

  describe('learning', () => {
    it('schedules reviews and keeps stats consistent', async () => {
      const token = await auth.sign('dave');
      const word = (await http().post('/api/v1/vocabulary').set(as(token)).send({ word: 'lucid' })).body;

      const due = await http().get('/api/v1/learning/today').set(as(token)).expect(200);
      expect(due.body).toHaveLength(1);
      expect(due.body[0].vocabulary.id).toBe(word.id);

      const reviewed = await http().post(`/api/v1/learning/${word.id}/review`).set(as(token)).send({ grade: 4 }).expect(200);
      expect(reviewed.body).toMatchObject({ state: 'LEARNING', successCount: 1, reviewCount: 1, algo: 'fsrs' });
      expect(reviewed.body.stability).toBeCloseTo(13.82, 1);

      expect((await http().get('/api/v1/learning/today').set(as(token))).body).toHaveLength(0);
      const { stats } = (await http().get('/api/v1/learning/dashboard-overview').set(as(token))).body;
      expect(stats).toMatchObject({ totalWords: 1, learningCount: 1, accuracyPercent: 100 });
    });

    it('summarises analytics', async () => {
      const token = await auth.sign('dave');
      const res = await http().get('/api/v1/analytics/summary?tz=Asia/Kolkata').set(as(token)).expect(200);
      expect(res.body.activity).toHaveLength(30);
      expect(res.body.activity[29]).toMatchObject({ reviews: 1, newWords: 1 });
      expect(res.body.confidence).toEqual({ high: 1, medium: 0, low: 0 }); // an Easy first review has a long interval
      expect(res.body.collections[0]).toMatchObject({ name: 'Inbox', wordCount: 1, accuracyPercent: 100 });
    });

    it('counts only words that exist, ignoring stale progress and collection entries', async () => {
      const token = await auth.sign('hana');
      await http().post('/api/v1/vocabulary').set(as(token)).send({ word: 'lucid', definitions: ['clear'] }).expect(201);
      await http().post('/api/v1/vocabulary').set(as(token)).send({ word: 'terse', definitions: ['brief'] }).expect(201);

      // Simulate leftovers from older versions: progress and collection ids for deleted words, one word untracked.
      const db = app.get<Connection>(getConnectionToken()).db!;
      const ghost = '0123456789abcdef01234567';
      await db.collection('user_word_progress').insertOne({ userId: 'hana', wordId: ghost, state: 'GRADUATED' });
      await db.collection('collections').updateOne({ userId: 'hana', name: 'Inbox' }, { $push: { wordIds: ghost } } as any);
      const terse = await db.collection('vocabulary').findOne({ createdBy: 'hana', word: 'terse' });
      await db.collection('user_word_progress').deleteOne({ userId: 'hana', wordId: String(terse!._id) });

      const summary = await http().get('/api/v1/analytics/summary').set(as(token)).expect(200);
      expect(summary.body.confidence).toEqual({ high: 0, medium: 0, low: 2 });
      expect(summary.body.collections[0]).toMatchObject({ name: 'Inbox', wordCount: 2 });

      const overview = await http().get('/api/v1/learning/dashboard-overview').set(as(token)).expect(200);
      expect(overview.body.stats).toMatchObject({ totalWords: 2, newCount: 2, graduatedCount: 0 });
    });
  });

  describe('deleting', () => {
    it('cascades from word to progress and collections', async () => {
      const token = await auth.sign('erin');
      const word = (await http().post('/api/v1/vocabulary').set(as(token)).send({ word: 'cascade' })).body;
      await http().delete(`/api/v1/vocabulary/${word.id}`).set(as(token)).expect(200);

      const { stats, collections } = (await http().get('/api/v1/learning/dashboard-overview').set(as(token))).body;
      expect(stats.totalWords).toBe(0);
      expect(stats.newCount).toBe(0);
      expect(collections[0].wordIds).toEqual([]);
    });

    it('deleting a collection deletes its words', async () => {
      const token = await auth.sign('frank');
      const col = (await http().post('/api/v1/collections').set(as(token)).send({ name: 'Temp' })).body;
      await http().post(`/api/v1/vocabulary?collectionId=${col.id}`).set(as(token)).send({ word: 'gone' }).expect(201);
      await http().delete(`/api/v1/collections/${col.id}`).set(as(token)).expect(200);
      expect((await http().get('/api/v1/vocabulary/me').set(as(token))).body).toEqual([]);
    });
  });

  describe('settings, streaks and review history', () => {
    const word = async (token: string, w: string, collectionId?: string) =>
      (await http().post(`/api/v1/vocabulary${collectionId ? `?collectionId=${collectionId}` : ''}`).set(as(token)).send({ word: w, definitions: ['x'] }).expect(201)).body;

    it('stores settings with sane defaults and validation', async () => {
      const token = await auth.sign('sam');
      const defaults = (await http().get('/api/v1/settings').set(as(token)).expect(200)).body;
      expect(defaults).toMatchObject({ dailyGoal: 20, reminderHour: null, pushEnabled: false, aiEnabled: false });

      const updated = await http().put('/api/v1/settings').set(as(token)).send({ dailyGoal: 5, reminderHour: 8, timezone: 'Asia/Kolkata' }).expect(200);
      expect(updated.body).toMatchObject({ dailyGoal: 5, reminderHour: 8, timezone: 'Asia/Kolkata' });
      expect((await http().put('/api/v1/settings').set(as(token)).send({ reminderHour: null }).expect(200)).body.reminderHour).toBeNull();
      await http().put('/api/v1/settings').set(as(token)).send({ dailyGoal: 0 }).expect(400);
      await http().put('/api/v1/settings').set(as(token)).send({ reminderHour: 24 }).expect(400);
    });

    it('tracks streaks, the daily goal and the year heatmap, and undoes a review', async () => {
      const token = await auth.sign('tess');
      await http().put('/api/v1/settings').set(as(token)).send({ dailyGoal: 3 }).expect(200);
      const w = await word(token, 'tenacious');
      let summary = (await http().get('/api/v1/analytics/summary').set(as(token)).expect(200)).body;
      expect(summary.streak).toEqual({ current: 0, longest: 0 });

      await http().post(`/api/v1/learning/${w.id}/review`).set(as(token)).send({ grade: 3, mode: 'typed' }).expect(200);
      summary = (await http().get('/api/v1/analytics/summary').set(as(token)).expect(200)).body;
      expect(summary.heatmap).toHaveLength(365);
      expect(summary.streak).toEqual({ current: 1, longest: 1 });
      expect(summary.today).toEqual({ reviews: 1, goal: 3 });

      const undone = await http().post(`/api/v1/learning/${w.id}/undo`).set(as(token)).expect(200);
      expect(undone.body).toMatchObject({ state: 'NEW', reviewCount: 0 });
      summary = (await http().get('/api/v1/analytics/summary').set(as(token)).expect(200)).body;
      expect(summary.today.reviews).toBe(0);
      await http().post(`/api/v1/learning/${w.id}/undo`).set(as(token)).expect(404);
    });

    it('offers interval previews, accepts offline reviews and never rewinds a newer review', async () => {
      const token = await auth.sign('uma');
      const w = await word(token, 'umbrage');
      const [card] = (await http().get('/api/v1/learning/today').set(as(token)).expect(200)).body;
      expect(card.intervals[1]).toBe(1);
      expect(card.intervals[4]).toBeGreaterThan(card.intervals[3]);

      await http().post(`/api/v1/learning/${w.id}/review`).set(as(token)).send({ grade: 3 }).expect(200);
      const stale = new Date(Date.now() - 3 * 86_400_000).toISOString();
      const res = await http().post(`/api/v1/learning/${w.id}/review`).set(as(token)).send({ grade: 1, at: stale }).expect(200);
      expect(res.body).toMatchObject({ reviewCount: 1, failureCount: 0 }); // the stale review didn't rewind the schedule
      await http().post(`/api/v1/learning/${w.id}/review`).set(as(token)).send({ grade: 3, mode: 'karaoke' }).expect(400);
    });

    it('lists progress and flags leeches', async () => {
      const token = await auth.sign('vera');
      const w = await word(token, 'vexing');
      expect((await http().get('/api/v1/learning/progress').set(as(token)).expect(200)).body[0]).toMatchObject({ wordId: w.id, state: 'NEW', leech: false });

      const db = app.get<Connection>(getConnectionToken()).db!;
      await db.collection('user_word_progress').updateOne({ userId: 'vera', wordId: w.id }, { $set: { lapses: 9 } });
      expect((await http().get('/api/v1/learning/progress').set(as(token))).body[0].leech).toBe(true);
      expect((await http().get('/api/v1/learning/dashboard-overview').set(as(token))).body.stats.leechCount).toBe(1);
      expect((await http().get('/api/v1/learning/today').set(as(token))).body[0].leech).toBe(true);
    });
  });

  describe('bulk add, sharing and integrations', () => {
    it('adds many words, skipping duplicates', async () => {
      const token = await auth.sign('walt');
      const items = [{ word: 'alpha', definitions: ['first'] }, { word: 'Alpha' }, { word: 'beta', definitions: ['second'] }];
      const first = (await http().post('/api/v1/vocabulary/bulk').set(as(token)).send({ items }).expect(201)).body;
      expect(first).toMatchObject({ created: 2, skipped: ['Alpha'], failed: [] });
      const again = (await http().post('/api/v1/vocabulary/bulk').set(as(token)).send({ items }).expect(201)).body;
      expect(again).toMatchObject({ created: 0, failed: [] });
      expect(again.skipped).toHaveLength(3);
      expect((await http().get('/api/v1/vocabulary/me').set(as(token))).body).toHaveLength(2);
      await http().post('/api/v1/vocabulary/bulk').set(as(token)).send({ items: [] }).expect(400);
      await http().post('/api/v1/vocabulary/bulk').set(as(token)).send({ items: [{ word: 'x', owner: 'y' }] }).expect(400);
    });

    it('shares a collection by link and lets others import a copy', async () => {
      const owner = await auth.sign('xena');
      const guest = await auth.sign('yuri');
      const col = (await http().post('/api/v1/collections').set(as(owner)).send({ name: 'GRE' }).expect(201)).body;
      const w = (await http().post(`/api/v1/vocabulary?collectionId=${col.id}`).set(as(owner)).send({ word: 'zealous', definitions: ['eager'] }).expect(201)).body;

      const { shareId } = (await http().post(`/api/v1/collections/${col.id}/share`).set(as(owner)).expect(200)).body;
      expect((await http().post(`/api/v1/collections/${col.id}/share`).set(as(owner))).body.shareId).toBe(shareId);

      const view = (await http().get(`/api/v1/public/collections/${shareId}`).expect(200)).body; // no token needed
      expect(view).toMatchObject({ name: 'GRE', wordCount: 1 });
      expect(view.words[0]).toMatchObject({ word: 'zealous' });
      expect(JSON.stringify(view)).not.toMatch(/xena|createdBy|userId|_id/);

      await http().post(`/api/v1/public/collections/${shareId}/import`).expect(401);
      const imported = (await http().post(`/api/v1/public/collections/${shareId}/import`).set(as(guest)).expect(200)).body;
      expect(imported).toMatchObject({ imported: 1, skipped: 0 });
      const copy = (await http().get('/api/v1/collections').set(as(guest))).body.find((c: any) => c.id === imported.collectionId);
      expect(copy).toMatchObject({ name: 'GRE' });
      expect(copy.wordIds).toHaveLength(1);
      expect(copy.wordIds[0]).not.toBe(w.id);
      expect(copy.shareId).toBeUndefined();
      expect((await http().post(`/api/v1/public/collections/${shareId}/import`).set(as(guest))).body).toMatchObject({ imported: 0, skipped: 1 });

      await http().delete(`/api/v1/collections/${col.id}/share`).set(as(owner)).expect(200);
      await http().get(`/api/v1/public/collections/${shareId}`).expect(404);
      await http().post(`/api/v1/collections/${col.id}/share`).set(as(guest)).expect(404);
      const inbox = (await http().get('/api/v1/collections').set(as(owner))).body.find((c: any) => c.name === 'Inbox');
      if (inbox) await http().post(`/api/v1/collections/${inbox.id}/share`).set(as(owner)).expect(400);
    });

    it('guards reminder dispatch and reports AI assist as unconfigured', async () => {
      await http().post('/api/v1/reminders/dispatch').expect(401);
      await http().post('/api/v1/reminders/dispatch').set('x-cron-secret', 'guess').expect(401);
      const token = await auth.sign('zed');
      await http().post('/api/v1/vocabulary/ai-assist').set(as(token)).send({ word: 'quixotic' }).expect(503);
      await http().post('/api/v1/settings/push').set(as(token)).send({ endpoint: 'http://insecure.example', keys: { p256dh: 'a', auth: 'b' } }).expect(400);
      const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'key', auth: 'secret' } };
      expect((await http().post('/api/v1/settings/push').set(as(token)).send(sub).expect(201)).body.pushEnabled).toBe(true);
      expect((await http().delete('/api/v1/settings/push').set(as(token)).send({ endpoint: sub.endpoint }).expect(200)).body.pushEnabled).toBe(false);
    });
  });

  describe('data repair', () => {
    it('removes leftovers of deleted words, deduplicates progress and backfills missing progress', async () => {
      const { DataIntegrityService } = await import('../src/maintenance/data-integrity.service.js');
      const token = await auth.sign('ivan');
      const add = (word: string) =>
        http().post('/api/v1/vocabulary').set(as(token)).send({ word, definitions: ['x'] }).expect(201);
      const kept = (await add('keep')).body.id;
      const untracked = (await add('untracked')).body.id;
      const fresh = (await add('fresh')).body.id;

      const db = app.get<Connection>(getConnectionToken()).db!;
      const ghost = '0123456789abcdef01234567';
      const progress = db.collection('user_word_progress');
      await progress.dropIndex('userId_1_wordId_1'); // legacy data predates the unique index
      await progress.insertMany([
        { userId: 'ivan', wordId: ghost, state: 'GRADUATED', reviewCount: 3 },
        { userId: 'ivan', wordId: kept, state: 'LEARNING', reviewCount: 5 },
        { userId: 'alice', wordId: kept, state: 'NEW' }, // someone else's progress on ivan's word
      ]);
      await progress.deleteMany({ userId: 'ivan', wordId: { $in: [untracked, fresh] } });
      // Only words older than a minute are backfilled; 'fresh' could still be mid-creation.
      await db.collection('vocabulary').updateOne({ _id: new ObjectId(untracked) }, { $set: { createdAt: new Date(0) } });
      await db.collection('review_logs').insertOne({ userId: 'ivan', wordId: ghost, grade: 4, reviewedAt: new Date() });
      await db.collection('collections').updateOne({ userId: 'ivan', name: 'Inbox' }, { $push: { wordIds: ghost } } as any);

      const report = await app.get(DataIntegrityService).repair();
      // Other tests leave their own leftovers in the shared database, so these are lower bounds.
      expect(report.orphanProgress).toBeGreaterThanOrEqual(2);
      expect(report.duplicateProgress).toBeGreaterThanOrEqual(1);
      expect(report.missingProgress).toBeGreaterThanOrEqual(1);
      expect(report.orphanLogs).toBeGreaterThanOrEqual(1);
      expect(report.staleCollectionIds).toBeGreaterThanOrEqual(1);

      const rows = await progress.find({ wordId: { $in: [ghost, kept, untracked, fresh] } }).toArray();
      expect(rows.map((r) => [r.userId, r.wordId, r.state]).sort()).toEqual(
        [['ivan', kept, 'LEARNING'], ['ivan', untracked, 'NEW']].sort(),
      );
      const inbox = await db.collection('collections').findOne({ userId: 'ivan', name: 'Inbox' });
      expect(inbox!.wordIds).toEqual(expect.not.arrayContaining([ghost]));
      expect(await progress.indexExists('userId_1_wordId_1')).toBe(true);

      expect(await app.get(DataIntegrityService).repair()).toEqual({
        orphanProgress: 0,
        duplicateProgress: 0,
        missingProgress: 0,
        orphanLogs: 0,
        staleCollectionIds: 0,
      });
    });
  });

  describe('backup', () => {
    it('round-trips export and import with remapped ids and a forced owner', async () => {
      const token = await auth.sign('gina');
      const word = (await http().post('/api/v1/vocabulary').set(as(token)).send({ word: 'roundtrip' })).body;
      await http().post(`/api/v1/learning/${word.id}/review`).set(as(token)).send({ grade: 4 });

      const backup = (await http().get('/api/v1/data/export').set(as(token)).expect(200)).body;
      expect(backup.data.vocabulary).toHaveLength(1);

      // Tamper with ownership: it must be overridden by the caller's identity.
      backup.data.vocabulary[0].createdBy = 'someone-else';
      backup.data.progress[0].userId = 'someone-else';
      await http().post('/api/v1/data/import').set(as(token)).send(backup).expect(200);

      const words = (await http().get('/api/v1/vocabulary/me').set(as(token))).body;
      expect(words).toHaveLength(1);
      expect(words[0]).toMatchObject({ word: 'roundtrip', createdBy: 'gina' });
      expect(words[0].id).not.toBe(word.id);

      const { stats, collections } = (await http().get('/api/v1/learning/dashboard-overview').set(as(token))).body;
      expect(stats).toMatchObject({ totalWords: 1, learningCount: 1 });
      expect(collections.find((c: any) => c.name === 'Inbox').wordIds).toEqual([words[0].id]);
      expect((await http().get('/api/v1/vocabulary/me').set(as(await auth.sign('someone-else')))).body).toEqual([]);
    });

    it('keeps existing data when the backup is invalid', async () => {
      const token = await auth.sign('gina');
      await http().post('/api/v1/data/import').set(as(token)).send({ version: 2 }).expect(400);
      await http().post('/api/v1/data/import').set(as(token)).send({ version: 1, data: { vocabulary: [{ word: '' }] } }).expect(400);
      await http().post('/api/v1/data/import').set(as(token)).send({ version: 1, data: { vocabulary: 'x' } }).expect(400);
      expect((await http().get('/api/v1/vocabulary/me').set(as(token))).body).toHaveLength(1);
    });
  });
});
