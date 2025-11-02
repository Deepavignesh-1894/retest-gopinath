import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getAuth } from '../../utils/auth';
import './Dashboard.css';

const FacultyDashboard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [action, setAction] = useState('approve');
  const [comments, setComments] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptAllLoading, setAcceptAllLoading] = useState(false);
  const { user: initialUser } = getAuth();
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    loadPendingRequests();
    loadAllRequests();
    // Fetch latest user data to ensure subjects are populated
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify({
        id: userData._id || userData.id,
        uniqueId: userData.uniqueId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        departmentAsHod: userData.departmentAsHod,
        isClassCounsellor: userData.isClassCounsellor,
        counsellorClass: userData.counsellorClass,
        counsellorSemester: userData.counsellorSemester,
        class: userData.class,
        year: userData.year,
        semester: userData.semester,
        subjects: userData.subjects || []
      }));
      setUser({
        id: userData._id || userData.id,
        uniqueId: userData.uniqueId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        departmentAsHod: userData.departmentAsHod,
        isClassCounsellor: userData.isClassCounsellor,
        counsellorClass: userData.counsellorClass,
        counsellorSemester: userData.counsellorSemester,
        class: userData.class,
        year: userData.year,
        semester: userData.semester,
        subjects: userData.subjects || []
      });
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

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
        scheduledDate: action === 'approve' && user.role === 'dean' ? scheduledDate : undefined
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

  const handleAcceptAll = async () => {
    if (!window.confirm('Are you sure you want to approve all pending requests that you can approve?')) {
      return;
    }

    setAcceptAllLoading(true);
    try {
      const requestsToApprove = pendingRequests.filter(request => canApprove(request));
      
      for (const request of requestsToApprove) {
        try {
          const data = {
            approved: true,
            comments: 'Bulk approved'
          };
          await api.put(`/retests/${request._id}/approve`, data);
        } catch (err) {
          console.error(`Failed to approve request ${request._id}:`, err);
        }
      }

      loadPendingRequests();
      loadAllRequests();
      alert(`Successfully approved ${requestsToApprove.length} request(s)`);
    } catch (err) {
      alert('Failed to approve all requests');
    } finally {
      setAcceptAllLoading(false);
    }
  };

  const openModal = (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setShowModal(true);
    setComments('');
    setScheduledDate('');
  };

  const viewDocument = (request) => {
    if (request.proofDocument) {
      // Construct the full URL to the document
      const docUrl = `http://localhost:5000/${request.proofDocument}`;
      setDocumentUrl(docUrl);
      setShowDocumentModal(true);
    } else {
      alert('No document attached');
    }
  };

  const canApprove = (request) => {
    // Faculty Dashboard only shows subject requests (Level 0)
    // Class Counsellor requests are handled in separate dashboard
    if (!request || request.status !== 'pending' || request.levelOfApproval !== 0) {
      return false;
    }
    
    if (!user.subjects || user.subjects.length === 0) {
      return false;
    }
    
    // Get request subject ID - handle both populated and non-populated
    const requestSubjectId = request.subject?._id?.toString() || 
                             request.subject?.toString() || 
                             null;
    
    if (!requestSubjectId) {
      return false;
    }
    
    const requestSemester = parseInt(request.semester);
    const requestClass = request.class;
    
    if (!requestSemester || !requestClass) {
      return false;
    }
    
    // Check if user teaches this subject for the same semester and class
    const canApproveSubject = user.subjects.some(s => {
      if (!s) return false;
      
      // Handle both populated (object with _id) and non-populated (just ID string) subject
      const subjId = s.subject?._id?.toString() || 
                    s.subject?.toString() || 
                    s.subject || 
                    null;
      
      if (!subjId) return false;
      
      const subjSemester = parseInt(s.semester);
      const subjClass = s.class;
      
      // Match subject ID, semester, and class
      return subjId === requestSubjectId && 
             subjSemester === requestSemester && 
             subjClass === requestClass;
    });
    
    return canApproveSubject;
  };

  const getRequestStatus = (request) => {
    if (request.status === 'pending') {
      if (canApprove(request)) {
        return 'actionable';
      }
      return 'waiting';
    }
    return request.status;
  };

  const actionableRequests = allRequests.filter(req => req.status === 'pending' && canApprove(req));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Subject Faculty Dashboard</h1>
        <p>Subject requests only - for class counsellor requests, use Class Counsellor Dashboard</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Pending Approvals ({pendingRequests.length})</h2>
          {actionableRequests.length > 0 && (
            <button
              className="btn-primary"
              onClick={handleAcceptAll}
              disabled={acceptAllLoading}
              style={{ marginLeft: 'auto' }}
            >
              {acceptAllLoading ? 'Processing...' : `Accept All (${actionableRequests.length})`}
            </button>
          )}
        </div>
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
                  <th>Level</th>
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
                    <td>{request.levelOfApproval}/4</td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn-sm btn-view"
                          onClick={() => viewDocument(request)}
                          title="View Document"
                        >
                          📄 View Doc
                        </button>
                        {canApprove(request) ? (
                          <>
                            <button
                              className="btn-sm btn-approve"
                              onClick={() => openModal(request, 'approve')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn-sm btn-reject"
                              onClick={() => openModal(request, 'reject')}
                            >
                              ✗ Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-muted">Not authorized</span>
                        )}
                      </div>
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
                  <th>Level</th>
                  <th>Created</th>
                  <th>Actions</th>
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
                    <td>{request.levelOfApproval}/4</td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn-sm btn-view"
                          onClick={() => viewDocument(request)}
                          title="View Document"
                        >
                          📄 View Doc
                        </button>
                        {request.status === 'pending' && canApprove(request) && (
                          <>
                            <button
                              className="btn-sm btn-approve"
                              onClick={() => openModal(request, 'approve')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn-sm btn-reject"
                              onClick={() => openModal(request, 'reject')}
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        {request.status === 'pending' && !canApprove(request) && (
                          <span className="text-muted">Waiting</span>
                        )}
                      </div>
                    </td>
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
            <h2>{action === 'approve' ? 'Approve' : 'Reject'} Request</h2>
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

              {action === 'approve' && user.role === 'dean' && (
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
                  {loading ? 'Processing...' : `${action === 'approve' ? 'Approve' : 'Reject'}`}
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

      {showDocumentModal && (
        <div className="modal-overlay" onClick={() => setShowDocumentModal(false)}>
          <div className="modal-content document-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Proof Document</h2>
              <button
                className="btn-secondary"
                onClick={() => setShowDocumentModal(false)}
                style={{ padding: '0.5rem 1rem' }}
              >
                Close
              </button>
            </div>
            <div className="document-viewer">
              <iframe
                src={documentUrl}
                style={{
                  width: '100%',
                  height: '600px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
                title="Proof Document"
              />
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
