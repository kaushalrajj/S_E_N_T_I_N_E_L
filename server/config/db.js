import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const missingSupabaseEnv = [
  ['SUPABASE_URL', supabaseUrl],
  ['SUPABASE_ANON_KEY', supabaseKey]
].filter(([, value]) => !value).map(([name]) => name);

if (missingSupabaseEnv.length > 0) {
  console.error(`[Config] Supabase is not configured. Missing: ${missingSupabaseEnv.join(', ')}`);
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Dynamic Schema Capabilities Detection
export const schemaCapabilities = {
  hasAssignmentGroupId: false,
  hasAssignmentDueDate: false,
  hasMessageSenderRole: false,
  hasAnnouncementsTable: false,
  probed: false
};

export async function probeSchema() {
  if (!isSupabaseConfigured || !supabase) {
    schemaCapabilities.probed = true;
    return schemaCapabilities;
  }

  try {
    const { error: errA } = await supabase.from('assignments').select('group_id').limit(1);
    schemaCapabilities.hasAssignmentGroupId = !errA;

    const { error: errD } = await supabase.from('assignments').select('due_date').limit(1);
    schemaCapabilities.hasAssignmentDueDate = !errD;

    const { error: errM } = await supabase.from('messages').select('sender_role').limit(1);
    schemaCapabilities.hasMessageSenderRole = !errM;

    const { error: errAnn } = await supabase.from('announcements').select('*').limit(1);
    schemaCapabilities.hasAnnouncementsTable = !errAnn || errAnn.code !== 'PGRST205';

    schemaCapabilities.probed = true;
  } catch (probeErr) {
    console.warn('⚠️ Schema probe notice:', probeErr.message);
  }
  return schemaCapabilities;
}

if (isSupabaseConfigured) {
  probeSchema();
  console.log('⚡ Supabase database configured');
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Database Fallback (used when Supabase is not configured)
// ─────────────────────────────────────────────────────────────────────────────
const inMemoryData = {
  users: new Map(),
  complaints: [],
  groups: [],
  groupMembers: [],
  assignments: [],
  announcements: [],
  marks: [],
  messages: []
};

// Seed default demo accounts into in-memory store so demo teachers and students exist
const DEFAULT_DEMO_USERS = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Sarah Connor (Admin)', email: 'admin@admin.org', role: 'admin', department: 'Campus Administration', stream: '', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Prof. Alan Turing', email: 'alan.turing@heritageit.edu.in', role: 'teacher', department: 'Computer Science', stream: 'Computer Science', availability: ['Monday_9_10','Monday_10_11','Tuesday_9_10','Wednesday_11_12','Thursday_14_15','Friday_9_10'], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Dr. Grace Hopper', email: 'grace.hopper@heritageit.edu.in', role: 'teacher', department: 'Software Engineering', stream: 'Software Engineering', availability: ['Monday_11_12','Tuesday_14_15','Wednesday_9_10','Thursday_10_11','Friday_13_14'], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Dr. Nikola Tesla', email: 'nikola.tesla@heritageit.edu.in', role: 'teacher', department: 'Electrical Engineering', stream: 'Electrical Engineering', availability: ['Monday_14_15','Tuesday_11_12','Wednesday_15_16','Thursday_9_10','Friday_10_11'], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000005', name: 'Prof. Ada Lovelace', email: 'ada.lovelace@heritageit.edu.in', role: 'teacher', department: 'Mathematics', stream: 'Mathematics', availability: ['Monday_9_10','Tuesday_9_10','Wednesday_9_10','Thursday_9_10','Friday_9_10'], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000006', name: 'Dr. Richard Feynman', email: 'richard.feynman@heritageit.edu.in', role: 'teacher', department: 'Physics', stream: 'Physics', availability: ['Monday_13_14','Tuesday_16_17','Wednesday_10_11','Thursday_13_14','Friday_15_16'], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000007', name: 'Alex Johnson', email: 'alex.johnson@gmail.com', role: 'student', department: 'Computer Science', stream: 'Computer Science', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000008', name: 'Maya Patel', email: 'maya.patel@gmail.com', role: 'student', department: 'Software Engineering', stream: 'Software Engineering', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000009', name: 'David Kim', email: 'david.kim@gmail.com', role: 'student', department: 'Computer Science', stream: 'Computer Science', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000010', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'student', department: 'Electrical Engineering', stream: 'Electrical Engineering', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000011', name: 'James Wilson', email: 'james.wilson@gmail.com', role: 'student', department: 'Mathematics', stream: 'Mathematics', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000012', name: 'Sofia Rodriguez', email: 'sofia.rodriguez@gmail.com', role: 'student', department: 'Physics', stream: 'Physics', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000013', name: 'Liam Chen', email: 'liam.chen@gmail.com', role: 'student', department: 'Computer Science', stream: 'Computer Science', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000014', name: 'Aisha Khan', email: 'aisha.khan@gmail.com', role: 'student', department: 'Software Engineering', stream: 'Software Engineering', availability: [], password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJHgGwuwp9t68WNe', created_at: new Date().toISOString() }
];

DEFAULT_DEMO_USERS.forEach((u) => inMemoryData.users.set(u.email.toLowerCase(), u));

function formatAssignmentRecord(a) {
  if (!a) return null;
  let cleanDescription = a.description || '';
  let groupId = a.group_id || null;
  let dueDate = a.due_date || null;

  const metaMatch = cleanDescription.match(/<!--META:(.*?)-->/);
  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1]);
      if (meta.group_id && !groupId) groupId = meta.group_id;
      if (meta.due_date && !dueDate) dueDate = meta.due_date;
      cleanDescription = cleanDescription.replace(metaMatch[0], '').trim();
    } catch (_) {}
  }

  return {
    ...a,
    group_id: groupId,
    due_date: dueDate,
    description: cleanDescription
  };
}

function formatMessageRecord(m) {
  if (!m) return null;
  let sender_role = m.sender_role || 'student';
  let cleanMessage = m.message || '';

  if (cleanMessage.startsWith('[ROLE:teacher]')) {
    sender_role = 'teacher';
    cleanMessage = cleanMessage.slice('[ROLE:teacher]'.length);
  } else if (cleanMessage.startsWith('[ROLE:student]')) {
    sender_role = 'student';
    cleanMessage = cleanMessage.slice('[ROLE:student]'.length);
  }

  return {
    ...m,
    sender_role,
    message: cleanMessage
  };
}

function isMissingMessageSenderRoleError(error) {
  return error?.message?.includes("'sender_role' column");
}

// Database API Adapter (Supabase with In-Memory Fallback)
export const db = {
  users: {
    async findByEmail(email) {
      const normalized = email.trim().toLowerCase();
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('users').select('*').eq('email', normalized).maybeSingle();
        if (error) console.error('Supabase users.findByEmail error:', error);
        return data || null;
      }
      return inMemoryData.users.get(normalized) || null;
    },

    async findById(id) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('users').select('id, name, email, role, department, created_at').eq('id', id).maybeSingle();
        if (error) console.error('Supabase users.findById error:', error);
        return data || null;
      }
      for (const u of inMemoryData.users.values()) {
        if (u.id === id) return u;
      }
      return null;
    },

    async create({ name, email, role, department, stream, availability, password_hash }) {
      const normalized = email.trim().toLowerCase();
      const newUser = {
        id: uuidv4(),
        name,
        email: normalized,
        role,
        department: department || 'General',
        stream: stream || '',
        availability: availability || [],
        password_hash,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw error;
        return data;
      }
      inMemoryData.users.set(normalized, newUser);
      return newUser;
    },

    async getTeachers({ stream, search } = {}) {
      if (isSupabaseConfigured && supabase) {
        let q = supabase.from('users').select('id, name, email, department, stream, availability').eq('role', 'teacher');
        if (stream) q = q.eq('stream', stream);
        if (search) q = q.ilike('name', `%${search}%`);
        const { data, error } = await q;
        if (error) console.error(error);
        return data || [];
      }
      let list = Array.from(inMemoryData.users.values()).filter(u => u.role === 'teacher');
      if (stream) list = list.filter(u => u.stream === stream);
      if (search) list = list.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
      return list;
    },

    async getTeachersAvailable({ day, hour, stream } = {}) {
      // Returns teachers that have a free slot matching day + hour
      // slot format: 'Day_startHour_endHour' e.g. 'Monday_9_10'
      const slotKey = day && hour !== undefined && hour !== '' ? `${day}_${hour}_${Number(hour) + 1}` : null;
      let list = Array.from(inMemoryData.users.values()).filter(u => u.role === 'teacher');
      if (isSupabaseConfigured && supabase) {
        let q = supabase.from('users').select('id, name, email, department, stream, availability').eq('role', 'teacher');
        if (stream) q = q.eq('stream', stream);
        const { data, error } = await q;
        if (error) console.error(error);
        list = data || [];
      }
      if (stream) {
        list = list.filter(u => u.stream === stream || u.department === stream);
      }
      if (slotKey) {
        list = list.filter(u => {
          const avail = Array.isArray(u.availability) ? u.availability : (typeof u.availability === 'string' ? JSON.parse(u.availability || '[]') : []);
          return avail.includes(slotKey);
        });
      }
      return list;
    },

    async getStudents({ department, stream, search } = {}) {
      if (isSupabaseConfigured && supabase) {
        let q = supabase.from('users').select('id, name, email, department, stream, created_at').eq('role', 'student');
        if (department) q = q.eq('department', department);
        if (stream) q = q.eq('stream', stream);
        if (search) q = q.ilike('name', `%${search}%`);
        const { data, error } = await q;
        if (error) console.error(error);
        return data || [];
      }
      let list = Array.from(inMemoryData.users.values()).filter(u => u.role === 'student');
      if (department) list = list.filter(u => u.department === department);
      if (stream) list = list.filter(u => u.stream === stream);
      if (search) list = list.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
      return list;
    }
  },

  complaints: {
    async getAll({ status, stream } = {}) {
      if (isSupabaseConfigured && supabase) {
        let q = supabase.from('complaints').select(`
          id, student_id, title, description, status, assigned_teacher_id, created_at,
          student:users!complaints_student_id_fkey(id, name, email, department, stream),
          teacher:users!complaints_assigned_teacher_id_fkey(id, name, email, stream)
        `).order('created_at', { ascending: false });

        if (status && status !== 'all') {
          q = q.eq('status', status);
        }
        const { data, error } = await q;
        if (error) console.error(error);
        let results = data || [];
        if (stream) {
          results = results.filter(c => c.student?.stream === stream || c.student?.department === stream);
        }
        return results;
      }
      let list = [...inMemoryData.complaints];
      if (status && status !== 'all') {
        list = list.filter(c => c.status === status);
      }
      if (stream) {
        list = list.filter(c => {
          const student = c.student || inMemoryData.users.get((c.student?.email || '').toLowerCase()) || Array.from(inMemoryData.users.values()).find(u => u.id === c.student_id);
          return student && (student.stream === stream || student.department === stream);
        });
      }
      return list;
    },

    async getByStudent(studentId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('complaints')
          .select(`
            id, student_id, title, description, status, assigned_teacher_id, created_at,
            teacher:users!complaints_assigned_teacher_id_fkey(id, name, email)
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });
        if (error) console.error(error);
        return data || [];
      }
      return inMemoryData.complaints.filter(c => c.student_id === studentId);
    },

    async getByTeacher(teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('complaints')
          .select(`
            id, student_id, title, description, status, assigned_teacher_id, created_at,
            student:users!complaints_student_id_fkey(id, name, email, department)
          `)
          .eq('assigned_teacher_id', teacherId)
          .order('created_at', { ascending: false });
        if (error) console.error(error);
        return data || [];
      }
      return inMemoryData.complaints.filter(c => c.assigned_teacher_id === teacherId);
    },

    async create({ student_id, title, description }) {
      const newComplaint = {
        id: uuidv4(),
        student_id,
        title,
        description,
        status: 'pending',
        assigned_teacher_id: null,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('complaints').insert([newComplaint]).select().single();
        if (error) throw error;
        return data;
      }
      inMemoryData.complaints.unshift(newComplaint);
      return newComplaint;
    },

    async assign(id, teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('complaints')
          .update({ assigned_teacher_id: teacherId, status: 'assigned' })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const c = inMemoryData.complaints.find(x => x.id === id);
      if (c) {
        c.assigned_teacher_id = teacherId;
        c.status = 'assigned';
      }
      return c;
    },

    async updateStatus(id, status) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('complaints')
          .update({ status })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const c = inMemoryData.complaints.find(x => x.id === id);
      if (c) c.status = status;
      return c;
    },

    async toggleStatus(id, teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data: existing } = await supabase.from('complaints')
          .select('status')
          .eq('id', id)
          .eq('assigned_teacher_id', teacherId)
          .maybeSingle();
        if (!existing) return null;
        const newStatus = existing.status === 'resolved' ? 'assigned' : 'resolved';
        const { data, error } = await supabase.from('complaints')
          .update({ status: newStatus })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const c = inMemoryData.complaints.find(x => x.id === id && x.assigned_teacher_id === teacherId);
      if (!c) return null;
      c.status = c.status === 'resolved' ? 'assigned' : 'resolved';
      return c;
    }
  },

  groups: {
    async getByTeacher(teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data: groups, error: gError } = await supabase
          .from('groups')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false });
        if (gError) console.error(gError);
        if (!groups || groups.length === 0) return [];

        const groupIds = groups.map(g => g.id);
        const { data: members, error: mError } = await supabase
          .from('group_members')
          .select('id, group_id, student:users!group_members_student_id_fkey(id, name, email, department)')
          .in('group_id', groupIds);
        if (mError) console.error(mError);

        return groups.map(g => ({
          ...g,
          members: (members || []).filter(m => m.group_id === g.id).map(m => m.student).filter(Boolean)
        }));
      }

      return inMemoryData.groups
        .filter(g => g.teacher_id === teacherId)
        .map(g => {
          const memberRecords = inMemoryData.groupMembers.filter(m => m.group_id === g.id);
          const members = memberRecords.map(m => {
            for (const u of inMemoryData.users.values()) {
              if (u.id === m.student_id) {
                return { id: u.id, name: u.name, email: u.email, department: u.department };
              }
            }
            return null;
          }).filter(Boolean);
          return {
            ...g,
            members
          };
        });
    },

    async getByStudent(studentId, { search } = {}) {
      if (isSupabaseConfigured && supabase) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('student_id', studentId);
        if (!memberships || memberships.length === 0) return [];

        const groupIds = memberships.map(m => m.group_id);
        let q = supabase.from('groups').select('*').in('id', groupIds).order('created_at', { ascending: false });
        if (search) q = q.ilike('group_name', `%${search}%`);
        const { data: groups } = await q;
        if (!groups || groups.length === 0) return [];

        const { data: allMembers } = await supabase
          .from('group_members')
          .select('id, group_id, student:users!group_members_student_id_fkey(id, name, email, department)')
          .in('group_id', groupIds);

        const result = [];
        for (const g of groups) {
          const teacher = await supabase.from('users').select('id, name, email, department').eq('id', g.teacher_id).maybeSingle();
          const gMembers = (allMembers || []).filter(m => m.group_id === g.id).map(m => m.student).filter(Boolean);

          let assignmentCount = 0;
          if (schemaCapabilities.hasAssignmentGroupId) {
            const { count: ac } = await supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('group_id', g.id);
            assignmentCount = ac || 0;
          }
          result.push({
            ...g,
            teacher: teacher?.data || null,
            members: gMembers,
            member_count: gMembers.length,
            assignment_count: assignmentCount
          });
        }
        return result;
      }

      const groupIds = inMemoryData.groupMembers.filter(m => m.student_id === studentId).map(m => m.group_id);
      let list = inMemoryData.groups.filter(g => groupIds.includes(g.id));
      if (search) list = list.filter(g => g.group_name.toLowerCase().includes(search.toLowerCase()));

      return list.map(g => {
        let teacher = null;
        for (const u of inMemoryData.users.values()) {
          if (u.id === g.teacher_id) {
            teacher = { id: u.id, name: u.name, email: u.email, department: u.department };
            break;
          }
        }
        const memberRecords = inMemoryData.groupMembers.filter(m => m.group_id === g.id);
        const members = memberRecords.map(m => {
          for (const u of inMemoryData.users.values()) {
            if (u.id === m.student_id) {
              return { id: u.id, name: u.name, email: u.email, department: u.department };
            }
          }
          return null;
        }).filter(Boolean);
        const assignmentCount = inMemoryData.assignments.filter(a => a.group_id === g.id).length;

        return {
          ...g,
          teacher,
          members,
          member_count: members.length,
          assignment_count: assignmentCount
        };
      });
    },

    async getById(groupId) {
      if (isSupabaseConfigured && supabase) {
        const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
        if (!group) return null;
        const { data: members } = await supabase
          .from('group_members')
          .select('id, group_id, student:users!group_members_student_id_fkey(id, name, email, department)')
          .eq('group_id', groupId);
        const teacher = await supabase.from('users').select('id, name, email, department').eq('id', group.teacher_id).maybeSingle();
        return {
          ...group,
          teacher: teacher?.data || null,
          members: (members || []).map(m => m.student).filter(Boolean)
        };
      }

      const g = inMemoryData.groups.find(x => x.id === groupId);
      if (!g) return null;
      let teacher = null;
      for (const u of inMemoryData.users.values()) {
        if (u.id === g.teacher_id) {
          teacher = { id: u.id, name: u.name, email: u.email, department: u.department };
          break;
        }
      }
      const memberRecords = inMemoryData.groupMembers.filter(m => m.group_id === g.id);
      const members = memberRecords.map(m => {
        for (const u of inMemoryData.users.values()) {
          if (u.id === m.student_id) {
            return { id: u.id, name: u.name, email: u.email, department: u.department };
          }
        }
        return null;
      }).filter(Boolean);

      return {
        ...g,
        teacher,
        members
      };
    },

    async isMember(groupId, studentId) {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('student_id', studentId)
          .maybeSingle();
        return !!data;
      }
      return inMemoryData.groupMembers.some(m => m.group_id === groupId && m.student_id === studentId);
    },

    async create(teacherId, groupName) {
      const newGroup = {
        id: uuidv4(),
        teacher_id: teacherId,
        group_name: groupName,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('groups').insert([newGroup]).select().single();
        if (error) throw error;
        return { ...data, members: [] };
      }
      inMemoryData.groups.unshift({ ...newGroup, members: [] });
      return { ...newGroup, members: [] };
    },

    async addMember(groupId, studentId) {
      const isAlready = await this.isMember(groupId, studentId);
      if (isAlready) {
        throw new Error('This student is already enrolled in this cohort.');
      }
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('group_members')
          .insert([{ id: uuidv4(), group_id: groupId, student_id: studentId, created_at: new Date().toISOString() }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const record = { id: uuidv4(), group_id: groupId, student_id: studentId, created_at: new Date().toISOString() };
      inMemoryData.groupMembers.push(record);
      return record;
    },

    async removeMember(groupId, studentId) {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('student_id', studentId);
        if (error) throw error;
        return true;
      }
      inMemoryData.groupMembers = inMemoryData.groupMembers.filter(m => !(m.group_id === groupId && m.student_id === studentId));
      return true;
    }
  },

  assignments: {
    async getAll() {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) console.error('Error fetching assignments:', error.message || error);
        return (data || []).map(formatAssignmentRecord);
      }
      return inMemoryData.assignments.map(formatAssignmentRecord);
    },

    async getByTeacher(teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false });
        if (error) console.error('Error fetching teacher assignments:', error.message || error);
        return (data || []).map(formatAssignmentRecord);
      }
      return inMemoryData.assignments.filter(a => a.teacher_id === teacherId).map(formatAssignmentRecord);
    },

    async getByGroup(groupId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false });
        if (error) console.error('Error fetching group assignments:', error.message || error);
        return (data || []).map(formatAssignmentRecord);
      }
      return inMemoryData.assignments.filter(a => a.group_id === groupId).map(formatAssignmentRecord);
    },

    async getByStudentGroups(studentId) {
      if (isSupabaseConfigured && supabase) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('student_id', studentId);
        if (!memberships || memberships.length === 0) return [];
        const groupIds = memberships.map(m => m.group_id);
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false });
        if (error) console.error('Error fetching student group assignments:', error.message || error);
        return (data || []).map(formatAssignmentRecord);
      }
      const groupIds = inMemoryData.groupMembers.filter(m => m.student_id === studentId).map(m => m.group_id);
      return inMemoryData.assignments.filter(a => groupIds.includes(a.group_id)).map(formatAssignmentRecord);
    },

    async create({ teacherId, groupId, title, description, file_url, due_date }) {
      const newAssignment = {
        id: uuidv4(),
        teacher_id: teacherId,
        group_id: groupId || null,
        title,
        description,
        file_url: file_url || null,
        due_date: due_date || null,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('assignments').insert([newAssignment]).select().single();
        if (error) throw error;
        return formatAssignmentRecord(data);
      }
      inMemoryData.assignments.unshift(newAssignment);
      return formatAssignmentRecord(newAssignment);
    }
  },

  announcements: {
    async getByGroup(groupId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
      }
      return inMemoryData.announcements.filter(a => a.group_id === groupId);
    },

    async create({ groupId, teacherId, title, message }) {
      const newAnn = {
        id: uuidv4(),
        group_id: groupId,
        teacher_id: teacherId,
        title,
        message,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('announcements').insert([newAnn]).select().single();
        if (error) throw error;
        return data;
      }
      inMemoryData.announcements.unshift(newAnn);
      return newAnn;
    }
  },

  marks: {
    async getByTeacher(teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('marks')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false });
        if (error) console.error(error);
        return data || [];
      }
      return inMemoryData.marks.filter(m => m.teacher_id === teacherId);
    },

    async getByStudent(studentId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('marks')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });
        if (error) console.error(error);
        return data || [];
      }
      return inMemoryData.marks.filter(m => m.student_id === studentId);
    },

    async upsert({ studentId, teacherId, subject, marks }) {
      const numMarks = parseFloat(marks);
      if (isSupabaseConfigured && supabase) {
        const { data: existing } = await supabase
          .from('marks')
          .select('id')
          .eq('student_id', studentId)
          .eq('subject', subject)
          .maybeSingle();

        if (existing) {
          const { data, error } = await supabase
            .from('marks')
            .update({ marks: numMarks, teacher_id: teacherId, created_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          const newMark = { id: uuidv4(), student_id: studentId, subject, marks: numMarks, teacher_id: teacherId, created_at: new Date().toISOString() };
          const { data, error } = await supabase.from('marks').insert([newMark]).select().single();
          if (error) throw error;
          return data;
        }
      }
      const existingIndex = inMemoryData.marks.findIndex(m => m.student_id === studentId && m.subject === subject);
      if (existingIndex >= 0) {
        inMemoryData.marks[existingIndex].marks = numMarks;
        inMemoryData.marks[existingIndex].teacher_id = teacherId;
        return inMemoryData.marks[existingIndex];
      }
      const newMark = { id: uuidv4(), student_id: studentId, subject, marks: numMarks, teacher_id: teacherId, created_at: new Date().toISOString() };
      inMemoryData.marks.unshift(newMark);
      return newMark;
    }
  },

  messages: {
    async getByTeacher(teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false });
        if (error) console.error('Error fetching teacher messages:', error.message || error);
        return (data || []).map(formatMessageRecord);
      }
      return inMemoryData.messages.filter(m => m.teacher_id === teacherId).map(formatMessageRecord);
    },

    async getByStudent(studentId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });
        if (error) console.error('Error fetching student messages:', error.message || error);
        return (data || []).map(formatMessageRecord);
      }
      return inMemoryData.messages.filter(m => m.student_id === studentId).map(formatMessageRecord);
    },

    async getConversation(studentId, teacherId) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('student_id', studentId)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: true });
        if (error) console.error('Error fetching conversation:', error.message || error);
        return (data || []).map(formatMessageRecord);
      }
      return inMemoryData.messages
        .filter(m => m.student_id === studentId && m.teacher_id === teacherId)
        .map(formatMessageRecord);
    },

    async create({ studentId, teacherId, message, senderRole }) {
      const role = senderRole || 'student';
      const newMsg = {
        id: uuidv4(),
        student_id: studentId,
        teacher_id: teacherId,
        sender_role: role,
        message,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured && supabase) {
        const legacyPayload = {
          id: newMsg.id,
          student_id: newMsg.student_id,
          teacher_id: newMsg.teacher_id,
          message: role === 'teacher' ? `[ROLE:teacher]${message}` : `[ROLE:student]${message}`,
          created_at: newMsg.created_at
        };

        if (!schemaCapabilities.hasMessageSenderRole) {
          const { data, error } = await supabase
            .from('messages')
            .insert([legacyPayload])
            .select('id, student_id, teacher_id, message, created_at')
            .single();
          if (error) throw error;
          return formatMessageRecord(data);
        }

        const { data, error } = await supabase.from('messages').insert([newMsg]).select().single();
        if (!error) return formatMessageRecord(data);

        if (!isMissingMessageSenderRoleError(error)) throw error;
        schemaCapabilities.hasMessageSenderRole = false;

        const { data: legacyData, error: legacyError } = await supabase
          .from('messages')
          .insert([legacyPayload])
          .select('id, student_id, teacher_id, message, created_at')
          .single();
        if (legacyError) throw legacyError;
        return formatMessageRecord(legacyData);
      }
      inMemoryData.messages.push(newMsg);
      return formatMessageRecord(newMsg);
    }
  },

  admin: {
    async getStats() {
      if (isSupabaseConfigured && supabase) {
        const { count: totalComplaints } = await supabase.from('complaints').select('*', { count: 'exact', head: true });
        const { count: pendingComplaints } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: assignedComplaints } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'assigned');
        const { count: resolvedComplaints } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'resolved');
        const { count: totalStudents } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
        const { count: totalTeachers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');

        return {
          totalComplaints: totalComplaints || 0,
          pendingComplaints: pendingComplaints || 0,
          assignedComplaints: assignedComplaints || 0,
          resolvedComplaints: resolvedComplaints || 0,
          totalStudents: totalStudents || 0,
          totalTeachers: totalTeachers || 0
        };
      }
      const users = Array.from(inMemoryData.users.values());
      return {
        totalComplaints: inMemoryData.complaints.length,
        pendingComplaints: inMemoryData.complaints.filter(c => c.status === 'pending').length,
        assignedComplaints: inMemoryData.complaints.filter(c => c.status === 'assigned').length,
        resolvedComplaints: inMemoryData.complaints.filter(c => c.status === 'resolved').length,
        totalStudents: users.filter(u => u.role === 'student').length,
        totalTeachers: users.filter(u => u.role === 'teacher').length
      };
    }
  }
};
