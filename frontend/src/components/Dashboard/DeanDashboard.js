import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './Dashboard.css';

const DeanDashboard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState('approve');
  const [comments, setComments] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingRequests();
    loadAllRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const response = await api.get('/retests/pending');
      setPendingRequests(response.data);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };

  const loadAllRequests = async () => {
    try {
      const response = await api.get('/retests');
      setAllRequests(response.data);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const data = {
        approved: action === 'approve',
        comments: comments,
        scheduledDate: action === 'approve' ? scheduledDate : undefined
      };

      await api.put(`/retests/${selectedRequest._id}/approve`, data);
      setShowModal(false);
      setSelectedRequest(null);
      setComments('');
      setScheduledDate('');
      loadPendingRequests();
      loadAllRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setShowModal(true);
    setComments('');
    setScheduledDate('');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dean Dashboard - Final Approval</h1>
      </div>

      <div className="card">
        <h2>Pending Final Approvals ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p className="no-data">No pending approvals</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Semester</th>
                  <th>Internal</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(request => (
                  <tr key={request._id}>
                    <td>{request.student?.name || request.studentName}</td>
                    <td>{request.subject?.name || request.subjectName}</td>
                    <td>{request.semester}</td>
                    <td>Internal {request.internal}</td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-sm btn-approve"
                        onClick={() => openModal(request, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-sm btn-reject"
                        onClick={() => openModal(request, 'reject')}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>All Requests</h2>
        {allRequests.length === 0 ? (
          <p className="no-data">No requests found</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Scheduled Date</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {allRequests.map(request => (
                  <tr key={request._id}>
                    <td>{request.student?.name || request.studentName}</td>
                    <td>{request.subject?.name || request.subjectName}</td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>
                      {request.scheduledDate
                        ? new Date(request.scheduledDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{action === 'approve' ? 'Final Approval' : 'Reject'} Request</h2>
            <div className="modal-body">
              <p><strong>Student:</strong> {selectedRequest.student?.name || selectedRequest.studentName}</p>
              <p><strong>Subject:</strong> {selectedRequest.subject?.name || selectedRequest.subjectName}</p>
              <p><strong>Semester:</strong> {selectedRequest.semester}</p>
              <p><strong>Internal:</strong> {selectedRequest.internal}</p>

              <div className="form-group">
                <label>Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows="4"
                  placeholder="Enter your comments..."
                />
              </div>

              {action === 'approve' && (
                <div className="form-group">
                  <label>Scheduled Date (Optional)</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  className={`btn-${action}`}
                  onClick={handleApprove}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `${action === 'approve' ? 'Final Approve' : 'Reject'}`}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeanDashboard;




