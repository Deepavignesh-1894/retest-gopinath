import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getAuth } from '../../utils/auth';
import './Dashboard.css';

const HodDashboard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [departmentRequests, setDepartmentRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [action, setAction] = useState('approve');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  // No longer using acceptAllLoading
  const { user: initialUser } = getAuth();
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    const initializeData = async () => {
      const current = await loadCurrentUser();
      // ensure user is loaded before fetching requests
      await loadPendingRequests(current);
      await loadAllRequests(current);
    };
    initializeData();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      const userObj = {
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
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
      return userObj;
    } catch (err) {
      console.error('Error loading current user:', err);
      return null;
    }
  };

  const loadPendingRequests = async (currentUserDataParam) => {
    try {
      const response = await api.get('/retests/pending');
      const requests = response.data || [];

      const currentUserData = currentUserDataParam || (user.departmentAsHod ? user : JSON.parse(localStorage.getItem('user') || '{}'));

      // TEMP UNBLOCK: show all pending requests at level 2 (CC approved), regardless of department
      const filteredRequests = requests.filter(req => {
        if (!req || req.status !== 'pending') return false;
        const level = Number(req.levelOfApproval);
        return level === 2;
      });

      setPendingRequests(filteredRequests);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };

  const loadAllRequests = async () => {
    try {
      const response = await api.get('/retests');
      const allReqs = response.data;
      setAllRequests(allReqs);
      
      // Also update department requests with all requests (not just pending) from HoD's department
      const currentUser = user.departmentAsHod ? user : (await loadCurrentUser()) || user;
      const hodDeptId = currentUser.departmentAsHod?.toString() || currentUser.departmentAsHod?._id?.toString() || currentUser.departmentAsHod;
      
      if (hodDeptId) {
        const allDeptReqs = allReqs.filter(req => {
          const studentDept = req.student?.department?._id?.toString() || 
                             req.student?.department?.toString() || 
                             req.student?.department;
          return studentDept && studentDept === hodDeptId;
        });
        
        // Update department requests - merge with pending requests but keep all from department
        setDepartmentRequests(prevDeptReqs => {
          // Create a map of existing pending requests
          const pendingMap = new Map(prevDeptReqs.map(req => [req._id, req]));
          // Update with all department requests, preferring pending versions if they exist
          return allDeptReqs.map(req => pendingMap.get(req._id) || req);
        });
      }
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
        level: selectedRequest.levelOfApproval // Pass current level for proper handling
      };

      await api.put(`/retests/${selectedRequest._id}/${action}`, data);
      setShowModal(false);
      setSelectedRequest(null);
      setComments('');
      await loadPendingRequests();
      await loadAllRequests();
      alert(`Request ${action}ed successfully`);
    } catch (err) {
      console.error('Error processing request:', err);
      alert(err.response?.data?.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  // bulk-approve removed in simplified HOD dashboard

  const openModal = (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setShowModal(true);
    setComments('');
  };

  const viewDocument = (request) => {
    if (request.proofDocument) {
      const docUrl = `http://localhost:5000/${request.proofDocument}`;
      setDocumentUrl(docUrl);
      setShowDocumentModal(true);
    } else {
      alert('No document attached');
    }
  };

  const canApproveAsHoD = (request) => {
    // HoD can approve at level 2 (Class Counsellor approved) from their department
    if (!request || request.status !== 'pending') {
      return false;
    }
    
    // Check if level is 2 (handle both string and number)
    const level = Number(request.levelOfApproval);
    if (level !== 2) {
      return false;
    }
    
    // TEMP UNBLOCK: Level 2 and pending = HoD can approve
    return true;
  };

  const canApprove = (request) => {
    // HoD only approves level 2 department requests
    return canApproveAsHoD(request);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>HoD Dashboard</h1>
      </div>

      {/* Pending Requests */}
      <div className="card">
        <h2>Pending Requests ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p className="no-data">No pending requests</p>
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
                        <button
                          className="btn-sm btn-approve"
                          onClick={() => openModal(request, 'approve')}
                          disabled={loading}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn-sm btn-reject"
                          onClick={() => openModal(request, 'reject')}
                          disabled={loading}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Requests (department + subject) */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>All Requests ({allRequests.length})</h2>
        {allRequests.length === 0 ? (
          <p className="no-data">No requests available</p>
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
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {allRequests.map(request => (
                  <tr key={request._id}>
                    <td>{request.student?.name || request.studentName}</td>
                    <td>{request.subject?.name || request.subjectName}</td>
                    <td>{request.semester}</td>
                    <td>Internal {request.internal}</td>
                    <td>{request.levelOfApproval}/4</td>
                    <td>{request.status}</td>
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
            <h2>{action === 'approve' ? 'Approve' : 'Reject'} Request</h2>
            <div className="modal-body">
              <p><strong>Student:</strong> {selectedRequest.student?.name || selectedRequest.studentName}</p>
              <p><strong>Subject:</strong> {selectedRequest.subject?.name || selectedRequest.subjectName}</p>
              <p><strong>Semester:</strong> {selectedRequest.semester}</p>
              <p><strong>Internal:</strong> {selectedRequest.internal}</p>
              <p><strong>Current Level:</strong> {selectedRequest.levelOfApproval}/4</p>

              <div className="form-group">
                <label>Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows="4"
                  placeholder="Enter your comments..."
                />
              </div>

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

export default HodDashboard;




