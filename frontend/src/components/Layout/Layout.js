import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth, getAuth } from '../../utils/auth';
import './Layout.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user } = getAuth();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const getDashboardLink = () => {
    const role = user?.role;
    if (role === 'student') return '/dashboard/student';
    if (role === 'faculty') return '/dashboard/faculty';
    if (role === 'hod') return '/dashboard/hod';
    if (role === 'dean') return '/dashboard/dean';
    if (role === 'admin') return '/dashboard/admin';
    return '/login';
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-brand">
          <h2>Retest Application System</h2>
        </div>
        <div className="nav-items">
          <span className="user-info">
            {user?.name} ({user?.role?.toUpperCase()})
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;




