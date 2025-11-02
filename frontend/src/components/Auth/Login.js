import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { setAuth } from '../../utils/auth';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    uniqueId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      setAuth(response.data.token, response.data.user);
      
      // Redirect based on role and class counsellor status
      const role = response.data.user.role;
      const isClassCounsellor = response.data.user.isClassCounsellor;
      
      if (role === 'student') {
        navigate('/dashboard/student');
      } else if (role === 'faculty' || role === 'hod') {
        // If they're a class counsellor, send to class counsellor dashboard
        if (isClassCounsellor) {
          navigate('/dashboard/class-counsellor');
        } else {
          navigate('/dashboard/faculty');
        }
      } else if (role === 'hod' && !isClassCounsellor) {
        navigate('/dashboard/hod');
      } else if (role === 'dean') {
        navigate('/dashboard/dean');
      } else if (role === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Retest System</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Unique ID</label>
            <input
              type="text"
              name="uniqueId"
              value={formData.uniqueId}
              onChange={handleChange}
              placeholder="e.g., ITS1"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;


