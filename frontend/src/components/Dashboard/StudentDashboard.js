import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './Dashboard.css';

const StudentDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    semester: '',
    internal: '',
    subject: '',
    proofDocument: null
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
    loadSubjects();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await api.get('/retests');
      setRequests(response.data);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };

  const loadSubjects = async () => {
    try {
      const { user } = require('../../utils/auth').getAuth();
      // Load all subjects, filter will happen on backend or we filter all subjects
      const response = await api.get(`/subjects`);
      // Filter by semester if needed
      setSubjects(response.data);
    } catch (err) {
      console.error('Error loading subjects:', err);
    }
  };

  const handleChange = (e) => {
    if (e.target.name === 'proofDocument') {
      setFormData({ ...formData, proofDocument: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('semester', formData.semester);
      formDataToSend.append('internal', formData.internal);
      formDataToSend.append('subject', formData.subject);
      if (formData.proofDocument) {
        formDataToSend.append('proofDocument', formData.proofDocument);
      }

      await api.post('/retests', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowForm(false);
      setFormData({ semester: '', internal: '', subject: '', proofDocument: null });
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status, level) => {
    if (status === 'rejected') return '#e74c3c';
    if (status === 'approved') return '#27ae60';
    if (level === 0) return '#f39c12';
    if (level === 1) return '#3498db';
    if (level === 2) return '#9b59b6';
    if (level === 3) return '#e67e22';
    return '#95a5a6';
  };

  const getStatusText = (status, level, approvals) => {
    if (status === 'rejected') {
      if (approvals.subjectFaculty.rejected) return 'Rejected by Subject Faculty';
      if (approvals.classCounsellor.rejected) return 'Rejected by Class Counsellor';
      if (approvals.hod.rejected) return 'Rejected by HoD';
      if (approvals.dean.rejected) return 'Rejected by Dean';
      return 'Rejected';
    }
    if (status === 'approved') return 'Approved by Dean';
    if (level === 0) return 'Pending Subject Faculty Approval';
    if (level === 1) return 'Pending Class Counsellor Approval';
    if (level === 2) return 'Pending HoD Approval';
    if (level === 3) return 'Pending Dean Approval';
    return 'Processing';
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Retest Request'}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h2>Create New Retest Request</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Semester *</label>
              <select name="semester" value={formData.semester} onChange={handleChange} required>
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Internal Exam *</label>
              <select name="internal" value={formData.internal} onChange={handleChange} required>
                <option value="">Select Internal</option>
                <option value="1">Internal 1</option>
                <option value="2">Internal 2</option>
                <option value="3">Internal 3</option>
              </select>
            </div>

            <div className="form-group">
              <label>Subject *</label>
              <select name="subject" value={formData.subject} onChange={handleChange} required>
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject._id} value={subject._id}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Proof Document *</label>
              <input
                type="file"
                name="proofDocument"
                onChange={handleChange}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>My Retest Requests</h2>
        {requests.length === 0 ? (
          <p className="no-data">No requests found. Create your first retest request!</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Semester</th>
                  <th>Internal</th>
                  <th>Status</th>
                  <th>Level</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request._id}>
                    <td>{request.subjectName}</td>
                    <td>{request.semester}</td>
                    <td>Internal {request.internal}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(request.status, request.levelOfApproval) }}
                      >
                        {getStatusText(request.status, request.levelOfApproval, request.approvals)}
                      </span>
                    </td>
                    <td>{request.levelOfApproval}/4</td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-sm btn-view"
                        onClick={() => window.open(`http://localhost:5000/${request.proofDocument}`, '_blank')}
                      >
                        View Proof
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;


