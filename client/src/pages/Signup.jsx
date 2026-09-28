import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import {
  Building2, ShieldAlert, GraduationCap, BookOpen,
  ArrowRight, CheckCircle2, AlertCircle, Mail, User,
  School, KeyRound, Send, RefreshCw, ShieldCheck,
  Layers, Lock, Eye, EyeOff
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const STREAMS = [
  'Computer Science', 'Software Engineering', 'Electrical Engineering',
  'Mathematics', 'Physics', 'Mechanical Engineering', 'Civil Engineering',
  'Information Technology', 'Data Science', 'Electronics & Communication'
];

function formatHour(h) {
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function StepDot({ step, current, label }) {
  const done = current > step;
  const active = current === step;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '50%',
        background: done ? '#3E341A' : active ? '#574A24' : 'rgba(128,119,92,0.20)',
        border: `2px solid ${done || active ? '#3E341A' : 'rgba(128,119,92,0.40)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done || active ? '#FAE8B4' : '#80775C',
        fontWeight: 800, fontSize: '0.78rem', transition: 'all 0.3s ease'
      }}>
        {done ? <CheckCircle2 size={14} /> : step}
      </div>
      <span style={{ fontSize: '0.64rem', fontWeight: 700, color: active ? '#1A1409' : '#574A24', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

export const Signup = () => {
  const { sendOtp, verifySignupOtp, completeSignup, adminSignup } = useAuth();
  const navigate = useNavigate();

  // step: 1=info, 2=OTP verify, 3=set password (admin: step 1 then jump to 3)
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [stream, setStream] = useState('');
  const [detectedRole, setDetectedRole] = useState(null);
  const [availability, setAvailability] = useState([]);

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed.endsWith('@admin.org')) { setDetectedRole('admin'); setError(''); }
    else if (trimmed.endsWith('@heritageit.edu.in')) { setDetectedRole('teacher'); setError(''); }
    else if (trimmed.includes('@') && trimmed.length > 3) { setDetectedRole('student'); setError(''); }
    else { setDetectedRole(null); setError(''); }
  }, [email]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) timer = setInterval(() => setResendCooldown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const toggleSlot = (day, hour) => {
    const key = `${day}_${hour}_${hour + 1}`;
    setAvailability(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const isSlotSelected = (day, hour) => availability.includes(`${day}_${hour}_${hour + 1}`);

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setSendingOtp(true); setError(''); setOtpSuccessMessage('');
    try {
      await sendOtp(email.trim().toLowerCase(), false);
      setOtpSent(true);
      setOtpSuccessMessage(`Verification code sent to ${email}`);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleStep1Submit = (e) => {
    e.preventDefault(); setError('');
    if (!email || !email.includes('@')) { setError('Please provide a valid email address.'); return; }
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (detectedRole !== 'admin' && !stream) { setError('Please select your stream.'); return; }
    setStep(detectedRole === 'admin' ? 3 : 2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault(); setError('');
    if (!otpSent) { setError('Please click "Send OTP" to receive a verification code first.'); return; }
    if (!otp.trim()) { setError('Please enter the 6-digit OTP code.'); return; }
    setSubmitting(true);
    try {
      await verifySignupOtp(email.trim().toLowerCase(), otp.trim(), {
        name: name.trim(),
        department: department.trim() || stream,
        stream,
        availability
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please check the code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault(); setError('');
    if (!password) { setError('Please enter a password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      let user;
      if (detectedRole === 'admin') {
        user = await adminSignup({ email: normalizedEmail, name: name.trim(), password });
      } else {
        user = await completeSignup(normalizedEmail, password);
      }
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.message || 'Account creation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isTeacher = detectedRole === 'teacher';
  const isAdmin = detectedRole === 'admin';

  const cardStyle = {
    maxWidth: step === 2 && isTeacher ? '980px' : '520px',
    width: '100%',
    background: 'rgba(250, 232, 180, 0.65)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    borderRadius: '22px',
    border: '1px solid rgba(203, 189, 147, 0.55)',
    boxShadow: '0 16px 48px -8px rgba(87, 74, 36, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
    padding: '2.5rem 2rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'max-width 0.3s ease'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={cardStyle}>
        {/* Accent Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: isAdmin ? 'linear-gradient(90deg, #574A24, #80775C)'
            : isTeacher ? 'linear-gradient(90deg, #574A24, #CBBD93)'
            : 'linear-gradient(90deg, #80775C, #FAE8B4)',
          transition: 'all 0.3s ease'
        }} />

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '54px', height: '54px', borderRadius: '14px', background: 'linear-gradient(135deg, #574A24 0%, #80775C 100%)', boxShadow: '0 4px 16px rgba(87, 74, 36, 0.35)', marginBottom: '1rem', position: 'relative' }}>
            <Building2 size={28} color="#FAE8B4" />
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: '#CBBD93', boxShadow: '0 0 8px rgba(203,189,147,0.80)' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#120E06', marginBottom: '0.35rem' }}>Sentinel</h1>
          <p style={{ color: '#1A1409', fontSize: '0.92rem', fontWeight: 700 }}>Create your campus account</p>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.75rem' }}>
          <StepDot step={1} current={step} label="Info" />
          <div style={{ height: '2px', width: '40px', background: step >= 2 ? '#120E06' : 'rgba(87,74,36,0.30)', transition: 'background 0.3s', margin: '0 0.25rem', marginBottom: '18px' }} />
          {!isAdmin && (
            <>
              <StepDot step={2} current={step} label="Verify OTP" />
              <div style={{ height: '2px', width: '40px', background: step >= 3 ? '#120E06' : 'rgba(87,74,36,0.30)', transition: 'background 0.3s', margin: '0 0.25rem', marginBottom: '18px' }} />
            </>
          )}
          <StepDot step={isAdmin ? 2 : 3} current={isAdmin ? (step === 3 ? 2 : step) : step} label="Set Password" />
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(254, 226, 226, 0.90)', border: '1px solid rgba(220, 38, 38, 0.40)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#7F1D1D', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <AlertCircle size={16} color="#7F1D1D" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Info */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit}>
            <div style={{ display: 'grid', gridTemplateColumns: isTeacher ? '1fr 1fr' : '1fr', gap: '1.8rem', alignItems: 'start' }}>
              <div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#120E06', fontWeight: 800 }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email address" className="form-input"
                      style={{ paddingLeft: '2.5rem', color: '#120E06', fontWeight: 600 }} autoFocus />
                  </div>
                </div>

                {detectedRole && (
                  <div style={{ background: 'rgba(203,189,147,0.35)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(87,74,36,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {detectedRole === 'admin' && <ShieldAlert size={18} color="#120E06" />}
                      {detectedRole === 'teacher' && <GraduationCap size={18} color="#120E06" />}
                      {detectedRole === 'student' && <BookOpen size={18} color="#120E06" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.80rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#120E06' }}>{detectedRole} Account</div>
                      <p style={{ fontSize: '0.78rem', color: '#1A1409', margin: 0, fontWeight: 700 }}>
                        {detectedRole === 'admin' ? 'No OTP required — set a password directly.' : 'OTP verification required.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ color: '#120E06', fontWeight: 800 }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. John Doe" className="form-input" style={{ paddingLeft: '2.5rem', color: '#120E06', fontWeight: 600 }} />
                  </div>
                </div>

                {!isAdmin && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#120E06', fontWeight: 800 }}>
                        <Layers size={15} color="#261C09" /> Stream
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#120E06', background: 'rgba(128,119,92,0.22)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>REQUIRED</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <School size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09', zIndex: 1 }} />
                        <select required value={stream} onChange={e => setStream(e.target.value)}
                          className="form-select" style={{ paddingLeft: '2.5rem', color: '#120E06', fontWeight: 600 }}>
                          <option value="" disabled>Select your stream</option>
                          {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#120E06', fontWeight: 800 }}>Department <span style={{ fontWeight: 600, color: '#261C09' }}>(optional)</span></label>
                      <div style={{ position: 'relative' }}>
                        <School size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                        <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                          placeholder="Leave blank to use stream" className="form-input" style={{ paddingLeft: '2.5rem', color: '#120E06', fontWeight: 600 }} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Teacher Availability Grid */}
              {isTeacher && (
                <div style={{ background: 'rgba(255,251,240,0.85)', border: '1px solid rgba(203,189,147,0.60)', borderRadius: '16px', padding: '1.15rem', boxShadow: '0 4px 18px rgba(87,74,36,0.06)' }}>
                  <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#120E06', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <GraduationCap size={16} color="#120E06" /> Teacher Availability Calendar
                      </div>
                      <p style={{ fontSize: '0.76rem', color: '#1A1409', marginTop: '0.2rem', marginBottom: 0, fontWeight: 700 }}>
                        Mon-Fri (9 AM - 9 PM). Click cells to mark free slots.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button type="button" onClick={() => { const s = []; DAYS.forEach(d => { for (let h = 9; h < 17; h++) s.push(`${d}_${h}_${h+1}`); }); setAvailability(s); }}
                        className="btn btn-secondary btn-sm" style={{ fontSize: '0.70rem', padding: '0.25rem 0.55rem', color: '#120E06', fontWeight: 800 }}>9-5 All</button>
                      <button type="button" onClick={() => setAvailability([])}
                        className="btn btn-secondary btn-sm" style={{ fontSize: '0.70rem', padding: '0.25rem 0.55rem', color: '#120E06', fontWeight: 800 }}>Clear</button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid rgba(203,189,147,0.40)', borderRadius: '10px', background: 'rgba(255,255,255,0.75)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ background: 'rgba(203,189,147,0.30)' }}>
                          <th style={{ padding: '0.4rem 0.35rem', textAlign: 'left', color: '#120E06', fontWeight: 800, fontSize: '0.68rem', width: '58px', borderBottom: '1.5px solid rgba(128,119,92,0.30)' }}>Time</th>
                          {DAYS.map(d => <th key={d} style={{ padding: '0.4rem 0.2rem', textAlign: 'center', color: '#120E06', fontWeight: 800, fontSize: '0.68rem', borderBottom: '1.5px solid rgba(128,119,92,0.30)' }}>{d.slice(0,3)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {HOURS.map(h => (
                          <tr key={h} style={{ borderBottom: '1px solid rgba(203,189,147,0.22)' }}>
                            <td style={{ padding: '0.24rem 0.35rem', color: '#120E06', fontWeight: 800, fontSize: '0.66rem', whiteSpace: 'nowrap', borderRight: '1px solid rgba(203,189,147,0.25)' }}>{formatHour(h)}</td>
                            {DAYS.map(d => {
                              const selected = isSlotSelected(d, h);
                              return (
                                <td key={d} style={{ padding: '0.15rem', textAlign: 'center' }}>
                                  <button type="button" onClick={() => toggleSlot(d, h)} style={{ width: '100%', height: '21px', borderRadius: '4px', border: selected ? '1.5px solid #120E06' : '1px solid rgba(128,119,92,0.35)', background: selected ? 'linear-gradient(135deg, #261C09, #4A3A1B)' : 'rgba(255,255,255,0.85)', cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, color: selected ? '#FAE8B4' : '#120E06' }}>{selected ? '✓' : ''}</button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem' }}>
                    <span style={{ fontSize: '0.76rem', color: '#120E06', fontWeight: 800 }}>{availability.length} free slots marked</span>
                    <span style={{ fontSize: '0.72rem', color: '#1A1409', fontStyle: 'italic', fontWeight: 700 }}>Only free hours receive complaints</span>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', background: 'linear-gradient(135deg, #261C09 0%, #4A3A1B 100%)', boxShadow: '0 3px 14px rgba(38,28,9,0.40)', color: '#FAE8B4', fontWeight: 800, fontSize: '0.95rem' }}>
              <span>{isAdmin ? 'Continue to Set Password' : 'Continue to OTP Verification'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 2 && !isAdmin && (
          <form onSubmit={handleStep2Submit}>
            <div style={{ background: 'rgba(203,189,147,0.30)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(87,74,36,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={18} color="#120E06" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#120E06' }}>{name}</div>
                <div style={{ fontSize: '0.78rem', color: '#1A1409', fontWeight: 700 }}>{email} — {detectedRole?.toUpperCase()}</div>
              </div>
              <button type="button" onClick={() => { setStep(1); setOtpSent(false); setOtp(''); setOtpSuccessMessage(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#120E06', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#120E06', fontWeight: 800 }}>Email Verification</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.75)', borderRadius: '10px', padding: '0.6rem 1rem', border: '1px solid rgba(87,74,36,0.30)', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#120E06', fontWeight: 700, fontSize: '0.88rem' }}>{email}</span>
                </div>
                <button type="button" onClick={handleSendOtp} disabled={sendingOtp || resendCooldown > 0}
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap', padding: '0 1rem', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', background: otpSent ? 'rgba(203,189,147,0.40)' : 'rgba(87,74,36,0.16)', borderColor: otpSent ? 'rgba(203,189,147,0.70)' : 'rgba(87,74,36,0.50)', color: '#120E06', cursor: (sendingOtp || resendCooldown > 0) ? 'not-allowed' : 'pointer' }}>
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

            <div className="form-group" style={{ background: 'rgba(245,230,200,0.75)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '14px', padding: '1.1rem', marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#120E06', fontWeight: 800 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <KeyRound size={16} color="#120E06" /> Verification Code
                </span>
                <span style={{ color: '#1A1409', fontSize: '0.75rem', fontWeight: 800 }}>6 digits</span>
              </label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                <input type="text" required value={otp} onChange={e => setOtp(e.target.value.trim())}
                  placeholder={otpSent ? 'Enter 6-digit OTP code' : "Click 'Send OTP' above first"}
                  maxLength={6} className="form-input"
                  style={{ paddingLeft: '2.5rem', letterSpacing: '0.18em', fontSize: '1.05rem', fontWeight: 800, background: 'rgba(255,255,255,0.95)', color: '#120E06' }} />
              </div>
              <p style={{ fontSize: '0.78rem', color: '#1A1409', marginTop: '0.45rem', marginBottom: 0, fontWeight: 700 }}>
                {otpSent ? 'Enter the 6-digit code sent to your email.' : 'Click "Send OTP" above to receive your verification code.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ padding: '0.85rem 1.25rem', color: '#120E06', fontWeight: 800 }}>Back</button>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, padding: '0.85rem', background: 'linear-gradient(135deg, #261C09 0%, #4A3A1B 100%)', boxShadow: '0 3px 14px rgba(38,28,9,0.40)', color: '#FAE8B4', fontWeight: 800 }}>
                <span>{submitting ? 'Verifying...' : 'Verify & Continue'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Set Password */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit}>
            <div style={{ background: 'rgba(203,189,147,0.30)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(87,74,36,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isAdmin ? <ShieldAlert size={18} color="#120E06" /> : detectedRole === 'teacher' ? <GraduationCap size={18} color="#120E06" /> : <BookOpen size={18} color="#120E06" />}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#120E06' }}>{name}</div>
                <div style={{ fontSize: '0.78rem', color: '#1A1409', fontWeight: 700 }}>
                  {email}
                  {!isAdmin && <span style={{ marginLeft: '0.5rem', color: '#120E06', fontWeight: 800 }}>✓ Email Verified</span>}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(245,230,200,0.70)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#120E06', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={15} color="#120E06" /> Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters" className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', color: '#120E06', fontWeight: 600 }} />
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: '12px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#261C09', padding: 0 }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <label className="form-label" style={{ color: '#120E06', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={15} color="#120E06" /> Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#261C09' }} />
                  <input type={showConfirm ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password" className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', color: '#120E06', fontWeight: 600, borderColor: confirmPassword && password !== confirmPassword ? 'rgba(180,60,60,0.60)' : '' }} />
                  <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: '12px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#261C09', padding: 0 }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ fontSize: '0.78rem', color: '#7F1D1D', marginTop: '0.35rem', fontWeight: 800 }}>Passwords do not match</p>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(203,189,147,0.30)', border: '1px solid rgba(87,74,36,0.30)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#120E06', fontWeight: 700 }}>
              Password must be at least 8 characters. You can log in later using your password or OTP verification.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isAdmin && (
                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary" style={{ padding: '0.85rem 1.25rem', color: '#120E06', fontWeight: 800 }}>Back</button>
              )}
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, padding: '0.85rem', background: 'linear-gradient(135deg, #261C09 0%, #4A3A1B 100%)', boxShadow: '0 3px 14px rgba(38,28,9,0.40)', color: '#FAE8B4', fontWeight: 800, fontSize: '0.95rem' }}>
                <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', color: '#120E06', fontWeight: 700 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#120E06', fontWeight: 900, textDecoration: 'underline' }}>Sign In here</Link>
        </div>
      </div>
    </div>
  );
};
