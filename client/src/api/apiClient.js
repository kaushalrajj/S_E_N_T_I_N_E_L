// Always use relative '/api' — works with Vite dev proxy AND production deployments
const API_BASE_URL = '/api';

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('campus_token');
  const headers = {
    ...options.headers,
  };

  // If body is not FormData, set Content-Type to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Always try to parse JSON — even error responses have JSON bodies
    let data = {};
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Clear token if expired/invalid
        localStorage.removeItem('campus_token');
        localStorage.removeItem('campus_user');
      }
      const errorMsg = data.error || data.message || `HTTP Error ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    // Re-throw so callers can handle errors properly
    throw error;
  }
};

export const api = {
  // Auth API
  auth: {
    detectDomain: (email) =>
      request('/auth/detect-domain', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    sendOtp: (email, forLogin = false) =>
      request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, forLogin })
      }),
    resendOtp: (email) =>
      request('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    verifyOtp: (email, otp, extra = {}) =>
      request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp, ...extra })
      }),
    login: (data) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    setPassword: (email, password) =>
      request('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    adminSignup: (data) =>
      request('/auth/admin-signup', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getMe: () => request('/auth/me')
  },

  // Admin API
  admin: {
    getStats: () => request('/admin/stats'),
    getTeachers: (stream = '', search = '') => request(`/admin/teachers?stream=${encodeURIComponent(stream)}&search=${encodeURIComponent(search)}`),
    getTeachersAvailable: (day, hour, stream = '') =>
      request(`/admin/teachers/available?day=${encodeURIComponent(day || '')}&hour=${encodeURIComponent(hour !== undefined ? hour : '')}&stream=${encodeURIComponent(stream)}`),
    getComplaints: (status = 'all', stream = '') =>
      request(`/admin/complaints?status=${encodeURIComponent(status)}&stream=${encodeURIComponent(stream)}`),
    assignComplaint: (id, teacher_id) =>
      request(`/admin/complaints/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ teacher_id })
      }),
    updateComplaintStatus: (id, status) =>
      request(`/admin/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
  },

  // Teacher API
  teacher: {
    getStudents: (stream = '', name = '') =>
      request(`/teacher/students?stream=${encodeURIComponent(stream)}&name=${encodeURIComponent(name)}`),
    getGroups: () => request('/teacher/groups'),
    createGroup: (group_name) =>
      request('/teacher/groups', {
        method: 'POST',
        body: JSON.stringify({ group_name })
      }),
    addGroupMember: (groupId, student_id) =>
      request(`/teacher/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ student_id })
      }),
    removeGroupMember: (groupId, studentId) =>
      request(`/teacher/groups/${groupId}/members/${studentId}`, {
        method: 'DELETE'
      }),
    getGroupAssignments: (groupId) => request(`/teacher/groups/${groupId}/assignments`),
    createGroupAssignment: (groupId, assignmentData) => {
      if (assignmentData instanceof FormData) {
        return request(`/teacher/groups/${groupId}/assignments`, {
          method: 'POST',
          body: assignmentData
        });
      }
      return request(`/teacher/groups/${groupId}/assignments`, {
        method: 'POST',
        body: JSON.stringify(assignmentData)
      });
    },
    getGroupAnnouncements: (groupId) => request(`/teacher/groups/${groupId}/announcements`),
    createGroupAnnouncement: (groupId, data) =>
      request(`/teacher/groups/${groupId}/announcements`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getAssignments: () => request('/teacher/assignments'),
    createAssignment: (assignmentData) => {
      if (assignmentData instanceof FormData) {
        return request('/teacher/assignments', {
          method: 'POST',
          body: assignmentData
        });
      }
      return request('/teacher/assignments', {
        method: 'POST',
        body: JSON.stringify(assignmentData)
      });
    },
    getMarks: () => request('/teacher/marks'),
    saveMarks: (data) =>
      request('/teacher/marks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getMessages: () => request('/teacher/messages'),
    getConversation: (studentId) => request(`/teacher/messages/${studentId}`),
    sendMessage: (data) =>
      request('/teacher/messages', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getTasks: () => request('/teacher/tasks'),
    toggleTask: (taskId) =>
      request(`/teacher/tasks/${taskId}/toggle`, {
        method: 'PATCH'
      })
  },

  // Student API
  student: {
    getComplaints: () => request('/student/complaints'),
    createComplaint: (data) =>
      request('/student/complaints', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getGroups: (search = '') =>
      request(`/student/groups${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getGroupDetail: (groupId) => request(`/student/groups/${groupId}`),
    getGroupAssignments: (groupId) => request(`/student/groups/${groupId}/assignments`),
    getGroupAnnouncements: (groupId) => request(`/student/groups/${groupId}/announcements`),
    getAssignments: () => request('/student/assignments'),
    getMarks: () => request('/student/marks'),
    getTeachers: (stream = '', search = '') =>
      request(`/student/teachers?stream=${encodeURIComponent(stream)}&search=${encodeURIComponent(search)}`),
    sendMessage: (data) =>
      request('/student/messages', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getMessages: () => request('/student/messages'),
    getConversation: (teacherId) => request(`/student/messages/${teacherId}`)
  },

  // Storage & Uploads API (Powered by Cloudinary)
  upload: {
    uploadFile: (file, folder) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folder', folder);
      return request('/upload', {
        method: 'POST',
        body: formData
      });
    }
  }
};

