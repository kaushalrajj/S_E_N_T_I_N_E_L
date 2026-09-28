const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function testNodemailerOtpFlow() {
  console.log('🧪 Starting Nodemailer Gmail SMTP OTP Automated Tests...\n');
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

    // 2. Reject Send OTP without email
    const noEmailRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(noEmailRes.status === 400, 'Rejects send-otp when email is missing');

    // 3. Send OTP to a test email address
    const testEmail = `demo_student_${Date.now()}@gmail.com`;
    const sendOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const sendOtpData = await sendOtpRes.json();
    assert(
      sendOtpRes.status === 200 && sendOtpData.message === 'OTP sent successfully',
      `Successfully sent Nodemailer OTP email to ${testEmail}`
    );

    // 4. Rate Limiting Check (sending another OTP within 30 seconds should fail with 429)
    const rateLimitRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const rateLimitData = await rateLimitRes.json();
    assert(
      rateLimitRes.status === 429 && rateLimitData.error.includes('Please wait'),
      'Rate limiting enforced (1 OTP per 30 seconds per email)'
    );

    // 5. Verify invalid OTP returns proper 400 error
    const invalidVerifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '000000' })
    });
    const invalidVerifyData = await invalidVerifyRes.json();
    assert(
      invalidVerifyRes.status === 400 && invalidVerifyData.error.includes('Invalid OTP code'),
      'Rejects invalid OTP code with proper 400 error message'
    );

    // 6. Verify non-existent OTP returns 400
    const nonExistentVerifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `unknown_${Date.now()}@gmail.com`, otp: '123456' })
    });
    assert(nonExistentVerifyRes.status === 400, 'Rejects verify-otp for unknown email');

    console.log(`\n🎉 Test Results: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

testNodemailerOtpFlow();
