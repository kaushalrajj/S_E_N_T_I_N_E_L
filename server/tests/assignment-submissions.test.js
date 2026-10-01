import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import express from 'express';
import jwt from 'jsonwebtoken';

// Isolated tests: no .env is loaded and no external service is contacted.
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_ANON_KEY;
process.env.JWT_SECRET = 'submission-tests-only';
process.env.CLOUDINARY_CLOUD_NAME = 'submission-tests';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

const { db } = await import('../config/db.js');
const { default: cloudinary } = await import('../config/cloudinary.js');
const { default: studentRoutes } = await import('../routes/student.js');
const { default: teacherRoutes } = await import('../routes/teacher.js');
const { assertDeadlineOpen } = await import('../services/assignmentRules.js');

const uploaded = [];
const deleted = [];
let uploadDelay = 0;
cloudinary.uploader.upload_stream = (options, callback) => new Writable({
  write(chunk, encoding, done) { done(); },
  final(done) {
    uploaded.push(options);
    setTimeout(() => { callback(null, { public_id: `${options.folder}/${options.public_id}` }); done(); }, uploadDelay);
  },
});
cloudinary.uploader.destroy = async (id, options) => { deleted.push({ id, options }); return { result: 'ok' }; };

const app = express();
app.use(express.json());
app.use('/student', studentRoutes);
app.use('/teacher', teacherRoutes);
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise(resolve => server.close(resolve)));

const teacher = 'c0000000-0000-0000-0000-000000000002';
const otherTeacher = 'c0000000-0000-0000-0000-000000000003';
const student = 'c0000000-0000-0000-0000-000000000007';
const secondStudent = 'c0000000-0000-0000-0000-000000000009';
const outsider = 'c0000000-0000-0000-0000-000000000008';
const group = await db.groups.create(teacher, 'Submission test group');
await db.groups.addMember(group.id, student);
await db.groups.addMember(group.id, secondStudent);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');

async function assignment(overrides = {}) {
  return db.assignments.create({ teacherId: teacher, groupId: group.id, title: 'Test assignment', description: 'Answer in PDF', due_date: new Date(Date.now() + 60000).toISOString(), ...overrides });
}
async function request(path, user, options = {}) {
  const headers = { ...options.headers };
  if (user) headers.Authorization = `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}`;
  const response = await fetch(base + path, { ...options, headers });
  return { status: response.status, data: await response.json() };
}
function submit(id, user = student, { bytes = pdf, name = 'answer.pdf', type = 'application/pdf', extra = false } = {}) {
  const body = new FormData();
  if (bytes !== null) body.append('file', new Blob([bytes], { type }), name);
  if (extra) body.append('student_id', outsider);
  return request(`/student/assignments/${id}/submission`, user, { method: 'POST', body });
}

test('requires a logged-in student and rejects malformed IDs', async () => {
  const a = await assignment();
  assert.equal((await submit(a.id, null)).status, 401);
  assert.equal((await submit(a.id, teacher)).status, 403);
  assert.equal((await submit('invalid')).status, 400);
  assert.equal((await submit('00000000-0000-0000-0000-000000000000')).status, 404);
});

test('student submission survives fresh reads; teacher sees student, PDF and pending count', async () => {
  const a = await assignment();
  const result = await submit(a.id);
  assert.equal(result.status, 201);
  assert.equal(result.data.submission.file_name, 'answer.pdf');
  assert.equal(result.data.submission.student_id, student);
  assert.ok(result.data.submission.submitted_at);
  assert.equal(result.data.submission.storage_public_id, undefined);
  assert.equal(uploaded.at(-1).type, 'authenticated');
  assert.equal(uploaded.at(-1).resource_type, 'raw');
  for (const path of ['/student/assignments', `/student/groups/${group.id}/assignments`]) {
    const refreshed = await request(path, student);
    assert.equal(refreshed.data.find(row => row.id === a.id).submission.id, result.data.submission.id);
  }
  const roster = await request(`/teacher/assignments/${a.id}/submissions`, teacher);
  assert.equal(roster.status, 200);
  assert.equal(roster.data.submitted_count, 1);
  assert.equal(roster.data.pending_count, 1);
  assert.equal(roster.data.students.find(row => row.student.id === student).submission.file_name, 'answer.pdf');
  assert.ok(roster.data.students.every(row => !row.student.password_hash));
});

test('resubmission cannot replace the first PDF', async () => {
  const a = await assignment();
  const first = await submit(a.id);
  const count = uploaded.length;
  assert.equal((await submit(a.id, student, { name: 'replacement.pdf' })).status, 409);
  assert.equal(uploaded.length, count);
  assert.equal((await db.assignmentSubmissions.getOne(a.id, student)).id, first.data.submission.id);
});

test('concurrent submissions accept exactly one and clean up the losing upload', async () => {
  const a = await assignment();
  const before = deleted.length;
  uploadDelay = 30;
  try {
    const results = await Promise.all([submit(a.id), submit(a.id)]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    assert.equal((await db.assignmentSubmissions.getByAssignment(a.id)).length, 1);
    assert.equal(deleted.length, before + 1);
    assert.equal(deleted.at(-1).options.type, 'authenticated');
  } finally { uploadDelay = 0; }
});

test('group outsiders cannot upload or read other students submissions', async () => {
  const a = await assignment();
  assert.equal((await submit(a.id, outsider)).status, 403);
  await submit(a.id);
  assert.equal((await request(`/student/assignments/${a.id}/submission/file`, outsider)).status, 404);
  assert.equal((await request(`/teacher/assignments/${a.id}/submissions`, otherTeacher)).status, 403);
  assert.equal((await request(`/teacher/assignments/${a.id}/submissions/${student}/file`, otherTeacher)).status, 403);
  const ownList = await request('/student/assignments', secondStudent);
  assert.equal(ownList.data.find(row => row.id === a.id).submission, null);
});

test('authorized PDF links are signed, short lived and support view/download', async () => {
  const a = await assignment();
  await submit(a.id);
  for (const [path, user] of [[`/student/assignments/${a.id}/submission/file`, student], [`/teacher/assignments/${a.id}/submissions/${student}/file`, teacher]]) {
    const result = await request(path, user);
    assert.equal(result.status, 200);
    const url = new URL(result.data.view_url);
    assert.ok(url.searchParams.get('signature'));
    assert.equal(url.searchParams.get('type'), 'authenticated');
    assert.equal(url.searchParams.get('attachment'), 'false');
    assert.ok(Number(url.searchParams.get('expires_at')) <= Date.now() / 1000 + 121);
    assert.equal(new URL(result.data.download_url).searchParams.get('attachment'), 'true');
  }
});

test('rejects missing, empty, renamed, non-PDF, oversized and extra-field uploads', async () => {
  const a = await assignment();
  const before = uploaded.length;
  for (const options of [
    { bytes: null }, { bytes: Buffer.alloc(0) }, { name: 'answer.txt' },
    { type: 'text/plain' }, { bytes: Buffer.from('not a pdf') },
    { bytes: Buffer.from('%PDF-1.4\ntruncated') },
    { bytes: Buffer.alloc(4 * 1024 * 1024 + 1) }, { extra: true },
  ]) assert.equal((await submit(a.id, student, options)).status, 400);
  assert.equal(uploaded.length, before);
});

test('deadline closes exactly at its timestamp and server rejects late uploads', async () => {
  assert.throws(() => assertDeadlineOpen({ due_date: '2026-01-01T00:00:00Z' }, Date.parse('2026-01-01T00:00:00Z')), /closed/);
  const a = await assignment({ due_date: new Date(Date.now() - 1000).toISOString() });
  const before = uploaded.length;
  assert.equal((await submit(a.id)).status, 409);
  assert.equal(uploaded.length, before);
});

test('upload finishing after the deadline is rejected and cleaned up', async () => {
  const a = await assignment({ due_date: new Date(Date.now() + 150).toISOString() });
  const before = deleted.length;
  uploadDelay = 220;
  try {
    assert.equal((await submit(a.id)).status, 409);
    assert.equal(await db.assignmentSubmissions.getOne(a.id, student), null);
    assert.equal(deleted.length, before + 1);
  } finally { uploadDelay = 0; }
});

test('general assignments and assignments without a deadline are visible and submittable', async () => {
  const a = await assignment({ groupId: null, due_date: null });
  const list = await request('/student/assignments', outsider);
  assert.ok(list.data.some(row => row.id === a.id));
  assert.equal((await submit(a.id, outsider)).status, 201);
});

test('failed persistence cleans up the upload and does not show Submitted', async () => {
  const a = await assignment();
  const original = db.assignmentSubmissions.create;
  const before = deleted.length;
  db.assignmentSubmissions.create = async () => { throw new Error('Database unavailable'); };
  try { assert.equal((await submit(a.id)).status, 500); }
  finally { db.assignmentSubmissions.create = original; }
  assert.equal(await db.assignmentSubmissions.getOne(a.id, student), null);
  assert.equal(deleted.length, before + 1);
});

test('lost insert response preserves committed submission and PDF', async () => {
  const a = await assignment();
  const original = db.assignmentSubmissions.create;
  const before = deleted.length;
  db.assignmentSubmissions.create = async function (record) { await original.call(this, record); throw new Error('Connection lost after commit'); };
  try { assert.equal((await submit(a.id)).status, 201); }
  finally { db.assignmentSubmissions.create = original; }
  assert.ok(await db.assignmentSubmissions.getOne(a.id, student));
  assert.equal(deleted.length, before);
});

test('teacher cannot change membership of another teachers group', async () => {
  const result = await request(`/teacher/groups/${group.id}/members`, otherTeacher, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: outsider }) });
  assert.equal(result.status, 403);
  assert.equal(await db.groups.isMember(group.id, outsider), false);
});

test('teacher assignment creation enforces group ownership and timezone', async () => {
  const create = (user, body) => request('/teacher/assignments', user, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Timezone test', description: 'Test', ...body }) });
  assert.equal((await create(otherTeacher, { group_id: group.id })).status, 403);
  assert.equal((await create(teacher, { due_date: '2026-10-01T17:00' })).status, 400);
  const result = await create(teacher, { due_date: '2026-10-01T17:00:00+05:30' });
  assert.equal(result.status, 201);
  assert.equal(Date.parse(result.data.assignment.due_date), Date.parse('2026-10-01T11:30:00Z'));
});

test('submitted work remains in teachers roster after student removal', async () => {
  const a = await assignment();
  await submit(a.id, secondStudent);
  await db.groups.removeMember(group.id, secondStudent);
  const roster = await request(`/teacher/assignments/${a.id}/submissions`, teacher);
  assert.ok(roster.data.students.some(row => row.student.id === secondStudent && row.submission));
  assert.equal((await request(`/student/assignments/${a.id}/submission/file`, secondStudent)).status, 200);
});
