const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}/api`;

const runTests = async () => {
  console.log('🧪 Starting End-to-End Automated Verification for CampusSphere...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    const health = await fetch(`${BASE_URL}/health`).then(r => r.json());
    assert(health.status === 'online', 'Health check returns online');

    // 2. Dynamic Domain Detection
    const adminDetect = await fetch(`${BASE_URL}/auth/detect-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newadmin@admin.org' })
    }).then(r => r.json());
    assert(adminDetect.role === 'admin', 'Detects @admin.org as admin');

    const teacherDetect = await fetch(`${BASE_URL}/auth/detect-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newprof@heritageit.edu.in' })
    }).then(r => r.json());
    assert(teacherDetect.role === 'teacher', 'Detects @heritageit.edu.in as teacher');

    const studentDetect = await fetch(`${BASE_URL}/auth/detect-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newpupil@gmail.com' })
    }).then(r => r.json());
    assert(studentDetect.role === 'student', 'Detects @gmail.com as student');

    const invalidDetect = await fetch(`${BASE_URL}/auth/detect-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad@yahoo.com' })
    });
    assert(invalidDetect.status === 400, 'Rejects non-org domain @yahoo.com with 400 Bad Request');

    // 3. Verify OTP Requirement & Signup a fresh student
    const testStudentEmail = `student_${Date.now()}@gmail.com`;

    // Attempt student signup without OTP -> must fail with 400
    const failedStudentSignup = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Tester Student',
        email: testStudentEmail,
        password: 'password123',
        department: 'Computer Science'
      })
    });
    assert(failedStudentSignup.status === 400, 'Rejects student signup without OTP verification');

    // Complete student signup with valid OTP
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Tester Student',
        email: testStudentEmail,
        password: 'password123',
        department: 'Computer Science',
        otp: 'TEST_OTP_2026'
      })
    }).then(r => r.json());
    assert(signupRes.user && signupRes.user.role === 'student', 'Student registered with role "student" automatically');
    const studentToken = signupRes.token;
    const studentId = signupRes.user.id;

    // 4. Test RBAC: Student attempting to access Admin complaints should be blocked (403 Forbidden)
    const unauthorizedRes = await fetch(`${BASE_URL}/admin/complaints`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(unauthorizedRes.status === 403, 'RBAC Middleware correctly blocks student from accessing admin route (403)');

    // 5. Student lodges a complaint
    const complaintRes = await fetch(`${BASE_URL}/student/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: 'Projector color flickering in room 104',
        description: 'Unable to see presentation slides clearly during morning lectures'
      })
    }).then(r => r.json());
    assert(complaintRes.complaint && complaintRes.complaint.status === 'pending', 'Student complaint filed with "pending" status');
    const complaintId = complaintRes.complaint.id;

    // 6. Fresh Teacher Signup with OTP
    const testTeacherEmail = `teacher_${Date.now()}@heritageit.edu.in`;
    const teacherSignup = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prof. Test Teacher',
        email: testTeacherEmail,
        password: 'password123',
        department: 'Computer Science',
        otp: 'TEST_OTP_2026'
      })
    }).then(r => r.json());

    assert(teacherSignup.token && teacherSignup.user.role === 'teacher', 'Teacher authenticated successfully');
    const teacherToken = teacherSignup.token;
    const testTeacherId = teacherSignup.user.id;

    // 7. Student sends a message to Teacher
    const teachersList = await fetch(`${BASE_URL}/student/teachers`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }).then(r => r.json());
    assert(teachersList.length > 0, 'Student retrieves faculty list for messaging');

    const messageRes = await fetch(`${BASE_URL}/student/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        teacher_id: testTeacherId,
        message: 'Hello Professor, are the office hours held in room 402 this week?'
      })
    }).then(r => r.json());
    assert(
      messageRes.record
        && messageRes.record.student_id === studentId
        && messageRes.record.sender_role === 'student',
      'Student message successfully delivered to teacher'
    );

    // 8. Teacher views student messages
    const teacherInbox = await fetch(`${BASE_URL}/teacher/messages`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }).then(r => r.json());
    assert(teacherInbox.length > 0, 'Teacher accesses inbox and views student messages');

    // 9. Teacher creates a group and adds student
    const groupRes = await fetch(`${BASE_URL}/teacher/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({ group_name: 'Advanced Systems Lab Group' })
    }).then(r => r.json());
    assert(groupRes.group && groupRes.group.group_name === 'Advanced Systems Lab Group', 'Teacher creates student group');
    const groupId = groupRes.group.id;

    const addMemberRes = await fetch(`${BASE_URL}/teacher/groups/${groupId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({ student_id: studentId })
    }).then(r => r.json());
    assert(addMemberRes.member, 'Teacher enrolls student into group');

    // 10. Teacher uploads/publishes assignment
    const assignRes = await fetch(`${BASE_URL}/teacher/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        title: 'Project 1: Concurrent Data Structures',
        description: 'Design a lock-free queue in C++ or Rust. Submit design doc and tests.',
        file_url: 'https://example.com/project1.pdf'
      })
    }).then(r => r.json());
    assert(assignRes.assignment && assignRes.assignment.title.includes('Project 1'), 'Teacher publishes assignment');

    // 11. Teacher grades student mark
    const markRes = await fetch(`${BASE_URL}/teacher/marks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        student_id: studentId,
        subject: 'Concurrent Programming',
        marks: 95.5
      })
    }).then(r => r.json());
    assert(markRes.record && markRes.record.marks === 95.5, 'Teacher records score (95.5) for student');

    // 12. Student verifies assignment and mark on their dashboard
    const studentAssignments = await fetch(`${BASE_URL}/student/assignments`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }).then(r => r.json());
    assert(studentAssignments.some(a => a.title.includes('Project 1')), 'Student sees published assignment');

    const studentMarks = await fetch(`${BASE_URL}/student/marks`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }).then(r => r.json());
    assert(studentMarks.some(m => m.subject === 'Concurrent Programming' && m.marks === 95.5), 'Student sees updated mark (95.5)');

    // 13. Fresh Admin Signup
    const testAdminEmail = `admin_${Date.now()}@admin.org`;
    const adminSignup = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Campus Administrator',
        email: testAdminEmail,
        password: 'password123',
        department: 'Administration'
      })
    }).then(r => r.json());

    assert(adminSignup.token && adminSignup.user.role === 'admin', 'Admin authenticated successfully');
    const adminToken = adminSignup.token;

    // 14. Admin views complaints and stats
    const stats = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert(stats.totalComplaints > 0, 'Admin reads platform statistics');

    // 15. Admin assigns complaint to teacher
    const assignTeacherRes = await fetch(`${BASE_URL}/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ teacher_id: testTeacherId })
    }).then(r => r.json());
    assert(assignTeacherRes.complaint.assigned_teacher_id === testTeacherId, 'Admin assigns complaint to teacher');

    // 16. Admin marks complaint as resolved
    const resolveRes = await fetch(`${BASE_URL}/admin/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'resolved' })
    }).then(r => r.json());
    assert(resolveRes.complaint.status === 'resolved', 'Admin updates complaint status to "resolved"');

    console.log(`\n========================================`);
    console.log(`🎉 Automated Tests Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
  }
};

runTests();
