import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './Dashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', hod: '' });
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '', department: '', semester: '' });
  const [assignForm, setAssignForm] = useState({ facultyId: '', subjectId: '', semester: '', class: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reqRes, usersRes, deptRes, subjRes] = await Promise.all([
        api.get('/retests'),
        api.get('/users'),
        api.get('/departments'),
        api.get('/subjects')
      ]);
      setRequests(reqRes.data);
      setUsers(usersRes.data);
      setDepartments(deptRes.data);
      setSubjects(subjRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/departments', deptForm);
      setShowDeptForm(false);
      setDeptForm({ name: '', code: '', hod: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/subjects', {
        ...subjectForm,
        semester: parseInt(subjectForm.semester)
      });
      setShowSubjectForm(false);
      setSubjectForm({ code: '', name: '', department: '', semester: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/subjects/assign', {
        ...assignForm,
        semester: parseInt(assignForm.semester)
      });
      setShowAssignForm(false);
      setAssignForm({ facultyId: '', subjectId: '', semester: '', class: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign subject');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (requestId, updates) => {
    try {
      await api.put(`/retests/${requestId}`, updates);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${deptId}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete department');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await api.delete(`/subjects/${subjectId}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  const faculties = users.filter(u => u.role === 'faculty' || u.role === 'hod');

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard - Controller of Examinations</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tabs">
        <button
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          All Requests
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={activeTab === 'departments' ? 'active' : ''}
          onClick={() => setActiveTab('departments')}
        >
          Departments
        </button>
        <button
          className={activeTab === 'subjects' ? 'active' : ''}
          onClick={() => setActiveTab('subjects')}
        >
          Subjects
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="card">
          <h2>All Retest Requests</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Semester</th>
                  <th>Internal</th>
                  <th>Status</th>
                  <th>Level</th>
                  <th>Scheduled Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request._id}>
                    <td>{request.student?.name || request.studentName}</td>
                    <td>{request.subject?.name || request.subjectName}</td>
                    <td>{request.semester}</td>
                    <td>Internal {request.internal}</td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{request.levelOfApproval}/4</td>
                    <td>
                      {request.scheduledDate ? (
                        <input
                          type="date"
                          value={request.scheduledDate ? new Date(request.scheduledDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleUpdateRequest(request._id, { scheduledDate: e.target.value })}
                        />
                      ) : (
                        <input
                          type="date"
                          onChange={(e) => handleUpdateRequest(request._id, { scheduledDate: e.target.value })}
                        />
                      )}
                    </td>
                    <td>
                      {request.status === 'approved' && (
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => handleUpdateRequest(request._id, { status: 'completed' })}
                        >
                          Mark Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <h2>All Users</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Unique ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.uniqueId}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="card">
          <div className="card-header">
            <h2>Departments</h2>
            <button className="btn-primary" onClick={() => setShowDeptForm(!showDeptForm)}>
              {showDeptForm ? 'Cancel' : 'Add Department'}
            </button>
          </div>

          {showDeptForm && (
            <form onSubmit={handleCreateDepartment} className="form-inline">
              <input
                type="text"
                placeholder="Department Name"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Department Code"
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                required
              />
              <select
                value={deptForm.hod}
                onChange={(e) => setDeptForm({ ...deptForm, hod: e.target.value })}
              >
                <option value="">Select HoD (Optional)</option>
                {users.filter(u => u.role === 'hod').map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary" disabled={loading}>
                Create
              </button>
            </form>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>HoD</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept._id}>
                    <td>{dept.code}</td>
                    <td>{dept.name}</td>
                    <td>{dept.hod?.name || '-'}</td>
                    <td>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => handleDeleteDepartment(dept._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="card">
          <div className="card-header">
            <h2>Subjects</h2>
            <div>
              <button className="btn-primary" onClick={() => setShowSubjectForm(!showSubjectForm)}>
                {showSubjectForm ? 'Cancel' : 'Add Subject'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAssignForm(!showAssignForm)}>
                {showAssignForm ? 'Cancel' : 'Assign to Faculty'}
              </button>
            </div>
          </div>

          {showSubjectForm && (
            <form onSubmit={handleCreateSubject} className="form-inline">
              <input
                type="text"
                placeholder="Subject Code"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                required
              />
              <input
                type="text"
                placeholder="Subject Name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                required
              />
              <select
                value={subjectForm.department}
                onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
              <select
                value={subjectForm.semester}
                onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
                required
              >
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary" disabled={loading}>
                Create
              </button>
            </form>
          )}

          {showAssignForm && (
            <form onSubmit={handleAssignSubject} className="form-inline">
              <select
                value={assignForm.facultyId}
                onChange={(e) => setAssignForm({ ...assignForm, facultyId: e.target.value })}
                required
              >
                <option value="">Select Faculty</option>
                {faculties.map(fac => (
                  <option key={fac._id} value={fac._id}>{fac.name}</option>
                ))}
              </select>
              <select
                value={assignForm.subjectId}
                onChange={(e) => setAssignForm({ ...assignForm, subjectId: e.target.value })}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map(subj => (
                  <option key={subj._id} value={subj._id}>{subj.code} - {subj.name}</option>
                ))}
              </select>
              <select
                value={assignForm.semester}
                onChange={(e) => setAssignForm({ ...assignForm, semester: e.target.value })}
                required
              >
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Class"
                value={assignForm.class}
                onChange={(e) => setAssignForm({ ...assignForm, class: e.target.value })}
                required
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                Assign
              </button>
            </form>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(subject => (
                  <tr key={subject._id}>
                    <td>{subject.code}</td>
                    <td>{subject.name}</td>
                    <td>{subject.department?.name || '-'}</td>
                    <td>{subject.semester}</td>
                    <td>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => handleDeleteSubject(subject._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;



