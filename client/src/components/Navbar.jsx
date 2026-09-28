import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  GraduationCap,
  BookOpen,
  LogOut,
  User,
  Building2,
  RefreshCw,
  ChevronDown,
  Home
} from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSwitch = async (targetRole) => {
    setSwitching(true);
    setShowSwitchMenu(false);
    try {
      await demoLogin(targetRole);
      navigate(`/${targetRole}/dashboard`);
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <ShieldAlert size={16} color="#3E341A" />;
      case 'teacher':
        return <GraduationCap size={16} color="#574A24" />;
      case 'student':
        return <BookOpen size={16} color="#80775C" />;
      default:
        return <User size={16} color="#574A24" />;
    }
  };

  return (
    <header className="navbar">
      <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => navigate(`/${role}/dashboard`)}>
        <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #574A24 0%, #80775C 100%)' }}>
          <Building2 size={20} color="#FAE8B4" />
        </div>
        <div className="brand-title" style={{ color: '#3E341A', fontWeight: 800 }}>
          Sentinel
        </div>
      </div>

      <div className="nav-actions">
        {/* Home link */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/')}
          title="Back to Landing Page"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Home size={14} />
          <span>Home</span>
        </button>

        {/* User Identity Chip */}
        <div className="user-profile-badge">
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--c-abyssal-blue)' }}>
            {user?.name || 'User'}
          </span>
          <span className={`role-tag ${role}`}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem' }}>
              {getRoleIcon()}
              {role}
            </span>
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          title="Sign out"
          style={{ padding: '0.45rem', display: 'flex', alignItems: 'center' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
