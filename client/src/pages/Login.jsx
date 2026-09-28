import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import {
  Building2, ShieldAlert, GraduationCap, BookOpen,
  ArrowRight, Mail, Lock, AlertCircle, KeyRound,
  Send, RefreshCw, CheckCircle2, ShieldCheck, Eye, EyeOff
} from 'lucide-react';

export const Login = () => {
  const { sendOtp, loginWithOtp, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.prefillEmail || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // loginMethod: 'password' | 'otp' (both exist for students & teachers; admin is always password)
  const [loginMethod, setLoginMethod] = useState('password');

  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [detectedRole, setDetectedRole] = useState(null);

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed.endsWith('@admin.org')) {
      setDetectedRole('admin');
      setLoginMethod('password'); // Admin always uses password
      setError('');
    } else if (trimmed.endsWith('@heritageit.edu.in')) {
      setDetectedRole('teacher');
      setError('');
    } else if (trimmed.includes('@') && trimmed.length > 3) {
      setDetectedRole('student');
      setError('');
    } else {
      setDetectedRole(null);
      setError('');
    }
  }, [email]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) timer = setInterval(() => setResendCooldown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const switchMethod = (method) => {
    if (detectedRole === 'admin') return; // Admin can't switch
    setLoginMethod(method);
    setError('');
    setOtp('');
    setPassword('');
    setOtpSent(false);
    setOtpSuccessMessage('');
  };

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setSendingOtp(true); setError(''); setOtpSuccessMessage('');
    try {
      await sendOtp(email.trim().toLowerCase(), true); // forLogin=true
      setOtpSent(true);
      setOtpSuccessMessage(`Verification code sent to ${email}`);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Failed to send verification OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (loginMethod === 'password' || detectedRole === 'admin') {
        // Password login — works for all roles (students, teachers, admins)
        if (!password) { setError('Password is required.'); setLoading(false); return; }
        const loggedUser = await loginWithPassword(normalizedEmail, password);
        navigate(`/${loggedUser.role}/dashboard`);
        return;
      }

      // OTP login (students & teachers)
      if (!otpSent) { setError('Please click "Send OTP" to receive a verification code first.'); setLoading(false); return; }
      if (!otp.trim()) { setError('Please enter the 6-digit OTP code.'); setLoading(false); return; }
      const loggedUser = await loginWithOtp(normalizedEmail, otp.trim());
      navigate(`/${loggedUser.role}/dashboard`);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = detectedRole === 'admin';

  return (
    <div className="auth-page auth-page-login" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="auth-card" style={{
        maxWidth: '480px', width: '100%',
        background: 'rgba(250, 232, 180, 0.55)',
        backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
        borderRadius: '22px', border: '1px solid rgba(203, 189, 147, 0.50)',
        boxShadow: '0 16px 48px -8px rgba(87, 74, 36, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
        padding: '2.5rem 2rem', position: 'relative', overflow: 'hidden'
      }}>
        {/* Accent Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: isAdmin ? 'linear-gradient(90deg, #574A24, #80775C)' : detectedRole === 'teacher' ? 'linear-gradient(90deg, #574A24, #CBBD93)' : 'linear-gradient(90deg, #80775C, #FAE8B4)',
          transition: 'all 0.3s ease'
        }} />

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '54px', height: '54px', borderRadius: '14px', background: 'linear-gradient(135deg, #574A24 0%, #80775C 100%)', boxShadow: '0 4px 16px rgba(87, 74, 36, 0.35)', marginBottom: '1rem', position: 'relative' }}>
            <Building2 size={28} color="#FAE8B4" />
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: '#CBBD93', boxShadow: '0 0 8px rgba(203,189,147,0.80)' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#120E06', marginBottom: '0.35rem' }}>Sentinel</h1>
          <p style={{ color: '#1A1409', fontSize: '0.92rem', fontWeight: 700 }}>
            {isAdmin ? 'Administrator — sign in with password' : 'Sign in with Password or OTP'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(254, 226, 226, 0.90)', border: '1px solid rgba(220, 38, 38, 0.40)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#7F1D1D', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <AlertCircle size={16} color="#7F1D1D" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', color: '#120E06', fontWeight: 800 }}>
              <span>Email Address</span>
              {detectedRole && <span style={{ color: '#1A1409', fontSize: '0.75rem', fontWeight: 800 }}>{detectedRole.toUpperCase()} detected</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
              <input type="email" required value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (otpSent) { setOtpSent(false); setOtp(''); setOtpSuccessMessage(''); }
                }}
                placeholder="Enter your email address" className="form-input"
                style={{ paddingLeft: '2.5rem', color: '#120E06', fontWeight: 600 }} autoFocus />
            </div>
          </div>

          {/* Role Badge */}
          {detectedRole && (
            <div style={{ background: 'rgba(203,189,147,0.35)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: 'rgba(87,74,36,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isAdmin && <ShieldAlert size={20} color="#120E06" />}
                {detectedRole === 'teacher' && <GraduationCap size={20} color="#120E06" />}
                {detectedRole === 'student' && <BookOpen size={20} color="#120E06" />}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.80rem', letterSpacing: '0.06em', color: '#120E06' }}>{detectedRole} Portal</span>
                <p style={{ fontSize: '0.78rem', color: '#1A1409', margin: 0, fontWeight: 700 }}>
                  {isAdmin ? 'Admins sign in with password only.' : 'Sign in using your password or request a verification OTP.'}
                </p>
              </div>
            </div>
          )}

          {/* Method Toggle (Both options available for student & teacher; admin is always password) */}
          {!isAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(203,189,147,0.30)', borderRadius: '12px', padding: '0.35rem', border: '1px solid rgba(87,74,36,0.25)' }}>
              <button type="button" onClick={() => switchMethod('password')}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '9px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 800, fontSize: '0.86rem',
                  background: loginMethod === 'password' ? '#261C09' : 'transparent',
                  color: loginMethod === 'password' ? '#FAE8B4' : '#1A1409',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                <Lock size={16} /> Sign In with Password
              </button>
              <button type="button" onClick={() => switchMethod('otp')}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '9px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 800, fontSize: '0.86rem',
                  background: loginMethod === 'otp' ? '#261C09' : 'transparent',
                  color: loginMethod === 'otp' ? '#FAE8B4' : '#1A1409',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={16} /> Sign In with OTP
              </button>
            </div>
          )}

          {/* Password Input (admin always shown, or when method = password) */}
          {(loginMethod === 'password' || isAdmin) && (
            <div className="form-group">
              <label className="form-label" style={{ color: '#120E06', fontWeight: 800 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                <input type={showPassword ? 'text' : 'password'} required={loginMethod === 'password' || isAdmin}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={isAdmin ? 'Enter admin password' : 'Enter your password'}
                  className="form-input" style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', color: '#120E06', fontWeight: 600 }} />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: '12px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#261C09', padding: 0 }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* OTP Section (students & teachers, method=otp) */}
          {loginMethod === 'otp' && !isAdmin && (
            <>
              {/* Send OTP row */}
              <div className="form-group">
                <label className="form-label" style={{ color: '#120E06', fontWeight: 800 }}>OTP Verification</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.75)', borderRadius: '10px', padding: '0.6rem 1rem', border: '1px solid rgba(87,74,36,0.30)', display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: email ? '#120E06' : '#261C09', fontWeight: 700, fontSize: '0.88rem' }}>{email || 'Enter email above first'}</span>
                  </div>
                  <button type="button" onClick={handleSendOtp} disabled={sendingOtp || resendCooldown > 0 || !email.includes('@')}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '0 1rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem',
                      background: otpSent ? 'rgba(203,189,147,0.40)' : 'rgba(87,74,36,0.16)',
                      borderColor: otpSent ? 'rgba(203,189,147,0.70)' : 'rgba(87,74,36,0.50)',
                      color: '#120E06', cursor: (sendingOtp || resendCooldown > 0 || !email.includes('@')) ? 'not-allowed' : 'pointer' }}>
                    {sendingOtp ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /><span>Sending...</span></>
                      : resendCooldown > 0 ? <><RefreshCw size={14} /><span>Resend ({resendCooldown}s)</span></>
                      : otpSent ? <><RefreshCw size={14} /><span>Resend OTP</span></>
                      : <><Send size={14} /><span>Send OTP</span></>}
                  </button>
                </div>
                {otpSuccessMessage && (
                  <div style={{ marginTop: '0.6rem', background: 'rgba(203,189,147,0.35)', border: '1px solid rgba(87,74,36,0.35)', borderRadius: '8px', padding: '0.6rem 0.85rem', color: '#120E06', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                    <CheckCircle2 size={16} color="#120E06" /><span>{otpSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* OTP Code input */}
              <div className="form-group" style={{ background: 'rgba(245,230,200,0.75)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '14px', padding: '1.1rem', marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#120E06', fontWeight: 800 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <KeyRound size={16} color="#120E06" /> Verification Code
                  </span>
                  <span style={{ color: '#1A1409', fontSize: '0.75rem', fontWeight: 800 }}>6 digits</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value.trim())}
                    placeholder={otpSent ? 'Enter 6-digit OTP code' : "Click 'Send OTP' above first"}
                    maxLength={6} className="form-input"
                    style={{ paddingLeft: '2.5rem', letterSpacing: '0.18em', fontSize: '1.05rem', fontWeight: 800, background: 'rgba(255,255,255,0.95)', color: '#120E06' }} />
                </div>
                <p style={{ fontSize: '0.78rem', color: '#1A1409', marginTop: '0.45rem', marginBottom: 0, fontWeight: 700 }}>
                  {otpSent ? 'Enter the 6-digit code sent to your email.' : 'Click "Send OTP" above to receive your verification code.'}
                </p>
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem', background: 'linear-gradient(135deg, #261C09 0%, #4A3A1B 100%)', boxShadow: '0 3px 14px rgba(38, 28, 9, 0.40)', color: '#FAE8B4', fontWeight: 800 }}>
            <span>{loading ? 'Authenticating...' : loginMethod === 'otp' && !isAdmin ? 'Verify OTP & Sign In' : 'Sign In'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', color: '#120E06', fontWeight: 700 }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#120E06', fontWeight: 900, textDecoration: 'underline' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
};
