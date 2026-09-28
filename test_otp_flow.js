const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api`;
const SERVER_URL = `http://localhost:${PORT}`;

async function runOtpTests() {
  console.log('🧪 Starting Verification Tests for OTP Authentication Flow & Bug Fixes...\n');
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
    assert(health.status === 'online', 'Server health check returns online');

    // 2. Eliminate "Cannot GET" error
    const rootRes = await fetch(`${SERVER_URL}/`, { redirect: 'manual' });
    const locationHeader = rootRes.headers.get('location');
    assert(
      rootRes.status === 302 && locationHeader && locationHeader.includes('5173'),
      'Root route (GET /) redirects cleanly to frontend Vite port 5173 without "Cannot GET" error'
    );

    const callbackRes = await fetch(`${SERVER_URL}/auth/callback?code=xyz`, { redirect: 'manual' });
    assert(
      callbackRes.status === 302,
      'Email callback links (GET /auth/callback) redirect cleanly without "Cannot GET" error'
    );

    // 3. Reject Send OTP for Admin
    const adminOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@admin.org' })
    });
    const adminOtpData = await adminOtpRes.json();
    assert(
      adminOtpRes.status === 400 && adminOtpData.error.includes('Admin authentication does not require OTP'),
      'Rejects send-otp for admin domain with appropriate instruction'
    );

    // 4. Reject Send OTP for unauthorized domain
    const invalidDomainRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'intruder@yahoo.com' })
    });
    assert(invalidDomainRes.status === 400, 'Rejects send-otp for unauthorized email domain');

    // 5. Send OTP for valid Student domain
    const testStudentEmail = `otp_student_${Date.now()}@gmail.com`;
    const sendStudentOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail })
    });
    const sendStudentOtpData = await sendStudentOtpRes.json();
    assert(
      sendStudentOtpRes.status === 200 && sendStudentOtpData.message.includes('Verification OTP successfully sent'),
      'Successfully triggers Supabase signInWithOtp for student email'
    );

    // 6. Attempt Student Signup without OTP -> Must be rejected with 400
    const noOtpSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student No OTP',
        email: testStudentEmail,
        password: 'password123',
        department: 'CS'
      })
    });
    const noOtpSignupData = await noOtpSignupRes.json();
    assert(
      noOtpSignupRes.status === 400 && noOtpSignupData.error.includes('Email OTP verification is required'),
      'Rejects student signup when OTP is omitted'
    );

    // 7. Attempt Student Signup with invalid/wrong OTP -> Must be rejected with 400
    const wrongOtpSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Wrong OTP',
        email: testStudentEmail,
        password: 'password123',
        department: 'CS',
        otp: '000000'
      })
    });
    const wrongOtpSignupData = await wrongOtpSignupRes.json();
    assert(
      wrongOtpSignupRes.status === 400 &&
      (wrongOtpSignupData.error.includes('invalid') || wrongOtpSignupData.error.includes('expired') || wrongOtpSignupData.error.includes('Token has expired')),
      'Rejects student signup with invalid OTP (Supabase verifyOtp rejection)'
    );

    // 8. Attempt Teacher Signup without OTP -> Must be rejected with 400
    const testTeacherEmail = `otp_teacher_${Date.now()}@heritageit.edu.in`;
    const teacherNoOtpRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teacher No OTP',
        email: testTeacherEmail,
        password: 'password123',
        department: 'Physics'
      })
    });
    const teacherNoOtpData = await teacherNoOtpRes.json();
    assert(
      teacherNoOtpRes.status === 400 && teacherNoOtpData.error.includes('Email OTP verification is required'),
      'Rejects teacher signup when OTP is omitted'
    );

    // 9. Admin signup WITHOUT OTP -> Must succeed directly (Admin flow unchanged)
    const testAdminEmail = `admin_${Date.now()}@admin.org`;
    const adminSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Super Admin',
        email: testAdminEmail,
        password: 'password123',
        department: 'Campus Administration'
      })
    });
    const adminSignupData = await adminSignupRes.json();
    assert(
      adminSignupRes.status === 201 && adminSignupData.user && adminSignupData.user.role === 'admin' && adminSignupData.token,
      'Admin account created directly WITHOUT OTP and logged in successfully'
    );

    // 10. Admin login WITH password -> Must succeed directly
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdminEmail,
        password: 'password123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminLoginData.user && adminLoginData.user.role === 'admin' && adminLoginData.token,
      'Admin logs in successfully with password credentials'
    );

    // 11. OTP Login Flow for Student: invalid OTP rejected
    const studentLoginInvalidOtp = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        otp: '999999'
      })
    });
    const studentLoginInvalidData = await studentLoginInvalidOtp.json();
    assert(
      studentLoginInvalidOtp.status === 400 && (studentLoginInvalidData.error.includes('invalid') || studentLoginInvalidData.error.includes('expired') || studentLoginInvalidData.error.includes('Token has expired')),
      'Student login with invalid OTP is rejected by verifyOtp'
    );

    // 12. OTP Login Flow for Student with valid test OTP: creates user profile & session
    const studentOtpLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        otp: 'TEST_OTP_2026'
      })
    });
    const studentOtpLoginData = await studentOtpLoginRes.json();
    assert(
      studentOtpLoginRes.status === 200 && studentOtpLoginData.user && studentOtpLoginData.user.role === 'student' && studentOtpLoginData.token,
      'Student OTP login verifies OTP, auto-creates/syncs user profile, and returns active JWT session'
    );

    // 13. OTP Login Flow for Teacher with valid test OTP
    const teacherOtpLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testTeacherEmail,
        otp: 'TEST_OTP_2026'
      })
    });
    const teacherOtpLoginData = await teacherOtpLoginRes.json();
    assert(
      teacherOtpLoginRes.status === 200 && teacherOtpLoginData.user && teacherOtpLoginData.user.role === 'teacher' && teacherOtpLoginData.token,
      'Teacher OTP login verifies OTP, auto-creates/syncs user profile, and returns active JWT session'
    );

    console.log(`\n🎉 Test Results: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runOtpTests();
