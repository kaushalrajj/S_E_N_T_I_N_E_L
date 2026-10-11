import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_ANON_KEY;
process.env.JWT_SECRET = 'assignment-visibility-tests-only';

const { db } = await import('../config/db.js');
const { default: studentRoutes } = await import('../routes/student.js');

const app = express();
app.use(express.json());
app.use('/student', studentRoutes);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const teacher = 'c0000000-0000-0000-0000-000000000002';
const studentA = 'c0000000-0000-0000-0000-000000000007';
const studentB = 'c0000000-0000-0000-0000-000000000009';

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const request = async (path, user) => {
  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${tokenFor(user)}` },
  });
  return { status: response.status, data: await response.json() };
};

const future = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();

let groupA;
let groupB;
let groupOther;
let assignmentA;
let assignmentB;
let assignmentOther;
let assignmentUnscoped;
let assignmentExpired;
let assignmentGlobal;

before(async () => {
  groupA = await db.groups.create(teacher, 'Visibility Group A');
  groupB = await db.groups.create(teacher, 'Visibility Group B');
  groupOther = await db.groups.create(teacher, 'Visibility Group Other');
  await db.groups.addMember(groupA.id, studentA);
  await db.groups.addMember(groupB.id, studentB);
  await db.groups.addMember(groupB.id, studentA);

  assignmentA = await db.assignments.create({
    teacherId: teacher,
    groupId: groupA.id,
    title: 'Group A deadline',
    description: 'A',
    due_date: future(30),
  });
  assignmentB = await db.assignments.create({
    teacherId: teacher,
    groupId: groupB.id,
    title: 'Group B deadline',
    description: 'B',
    due_date: future(45),
  });
  assignmentOther = await db.assignments.create({
    teacherId: teacher,
    groupId: groupOther.id,
    title: 'Other group deadline',
    description: 'Other',
    due_date: future(60),
  });
  assignmentUnscoped = await db.assignments.create({
    teacherId: teacher,
    title: 'Unscoped deadline',
    description: 'Must not be student-visible',
    due_date: future(30),
  });
  assignmentExpired = await db.assignments.create({
    teacherId: teacher,
    groupId: groupA.id,
    title: 'Expired assignment',
    description: 'Expired',
    due_date: new Date(Date.now() - 60_000).toISOString(),
  });
  assignmentGlobal = await db.assignments.create({
    teacherId: teacher,
    publicationScope: 'all_students',
    title: 'Global deadline',
    description: 'Eligible global assignment',
    due_date: future(90),
  });
});

after(() => new Promise((resolve) => server.close(resolve)));

test('students only receive assignments for their current groups', async () => {
  const a = await request('/student/assignments', studentA);
  const b = await request('/student/assignments', studentB);

  assert.equal(a.status, 200);
  assert.deepEqual(
    new Set(a.data.map((assignment) => assignment.id)),
    new Set([assignmentA.id, assignmentB.id, assignmentExpired.id, assignmentGlobal.id]),
  );
  assert.equal(a.data.filter((assignment) => assignment.id === assignmentB.id).length, 1);
  assert.deepEqual(
    new Set(b.data.map((assignment) => assignment.id)),
    new Set([assignmentB.id, assignmentGlobal.id]),
  );
  assert.ok(!a.data.some((assignment) => assignment.id === assignmentOther.id));
  assert.ok(!a.data.some((assignment) => assignment.id === assignmentUnscoped.id));
});

test('students with no groups receive only explicitly global assignments', async () => {
  const response = await request('/student/assignments', 'c0000000-0000-0000-0000-000000000008');
  assert.equal(response.status, 200);
  assert.deepEqual(
    new Set(response.data.map((assignment) => assignment.id)),
    new Set([assignmentGlobal.id]),
  );
});

test('group assignment URLs and direct assignment access recheck membership', async () => {
  const outsider = await request(`/student/groups/${groupOther.id}/assignments`, studentA);
  assert.equal(outsider.status, 403);

  await db.groups.removeMember(groupA.id, studentA);
  const afterRemoval = await request('/student/assignments', studentA);
  assert.equal(afterRemoval.status, 200);
  assert.ok(!afterRemoval.data.some((assignment) => assignment.id === assignmentA.id));
  assert.equal(await db.assignments.getForStudent(studentA, assignmentA.id), null);
});
