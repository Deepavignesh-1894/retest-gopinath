import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getAuth } from '../../utils/auth';
import './Dashboard.css';

const ClassCounsellorDashboard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [subjectRequests, setSubjectRequests] = useState([]); // Level 0 - Subject requests if they teach
  const [classRequests, setClassRequests] = useState([]); // Level 1 - Class requests as CC
  const [allRequests, setAllRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [action, setAction] = useState('approve');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptAllLoading, setAcceptAllLoading] = useState(false);
  const { user: initialUser } = getAuth();
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    // Load user first, then load requests with that user data
    const initializeData = async () => {
      const loadedUser = await loadCurrentUser();
      if (loadedUser) {
        loadPendingRequests(loadedUser);
        loadAllRequests();
      }
    };
    initializeData();
  }, []);
  
  // Reload requests when user data changes
  useEffect(() => {
    if (user && user.counsellorClass && user.counsellorSemester) {
      loadPendingRequests(user);
      loadAllRequests();
    }
  }, [user.counsellorClass, user.counsellorSemester]);

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

  const loadPendingRequests = async (currentUser = user) => {
    try {
      const response = await api.get('/retests/pending');
      const requests = response.data;
      setPendingRequests(requests);
      
      console.log('Pending requests received:', requests.length);
      console.log('All pending requests:', requests.map(r => ({
        id: r._id,
        level: r.levelOfApproval,
        class: r.class,
        semester: r.semester,
        status: r.status
      })));
      console.log('Current user data:', {
        counsellorClass: currentUser?.counsellorClass,
        counsellorSemester: currentUser?.counsellorSemester,
        isClassCounsellor: currentUser?.isClassCounsellor
      });
      
      // Separate into subject requests (level 0) and class requests (level 1)
      const subjectReqs = requests.filter(req => {
        if (req.levelOfApproval !== 0) return false;
        // Use a temporary user object for filtering if provided
        const tempUser = currentUser || user;
        return canApproveAsSubjectWithUser(req, tempUser);
      });
      
      const classReqs = requests.filter(req => {
        if (req.levelOfApproval !== 1) return false;
        // Use a temporary user object for filtering if provided
        const tempUser = currentUser || user;
        return canApproveAsCCWithUser(req, tempUser);
      });
      
      console.log('Filtered requests:', {
        subjectReqs: subjectReqs.length,
        classReqs: classReqs.length,
        classReqsDetails: classReqs.map(r => ({
          id: r._id,
          class: r.class,
          semester: r.semester
        }))
      });
      
      setSubjectRequests(subjectReqs);
      setClassRequests(classReqs);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };
  
  const canApproveAsSubjectWithUser = (request, userObj = user) => {
    if (!request || request.status !== 'pending' || request.levelOfApproval !== 0) return false;
    if (!userObj || !userObj.subjects || userObj.subjects.length === 0) return false;
    
    const requestSubjectId = request.subject?._id?.toString() || request.subject?.toString();
    if (!requestSubjectId) return false;
    
    const requestSemester = parseInt(request.semester);
    const requestClass = request.class;
    
    if (!requestSemester || !requestClass) return false;
    
    return userObj.subjects.some(s => {
      if (!s) return false;
      const subjId = s.subject?._id?.toString() || s.subject?.toString() || s.subject;
      if (!subjId) return false;
      const subjSemester = parseInt(s.semester);
      const subjClass = s.class;
      return subjId === requestSubjectId && 
             subjSemester === requestSemester && 
             subjClass === requestClass;
    });
  };
  
  const canApproveAsCCWithUser = (request, userObj = user) => {
    if (!request || request.status !== 'pending' || request.levelOfApproval !== 1) {
      return false;
    }
    if (!userObj || !userObj.isClassCounsellor) {
      return false;
    }
    
    const requestSemester = parseInt(request.semester);
    const counsellorSemester = parseInt(userObj.counsellorSemester);
    const requestClass = String(request.class).trim();
    const counsellorClass = String(userObj.counsellorClass).trim();
    
    if (!counsellorClass || !counsellorSemester || isNaN(counsellorSemester)) {
      return false;
    }
    
    const classMatch = requestClass === counsellorClass;
    const semesterMatch = requestSemester === counsellorSemester;
    
    return classMatch && semesterMatch;
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
        comments: comments
      };

      await api.put(`/retests/${selectedRequest._id}/approve`, data);
      setShowModal(false);
      setSelectedRequest(null);
      setComments('');
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

  const canApproveAsSubject = (request) => {
    return canApproveAsSubjectWithUser(request, user);
  };

  const canApproveAsCC = (request) => {
    return canApproveAsCCWithUser(request, user);
  };

  const canApprove = (request) => {
    return canApproveAsSubject(request) || canApproveAsCC(request);
  };

  const actionableRequests = allRequests.filter(req => req.status === 'pending' && canApprove(req));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Class Counsellor Dashboard</h1>
        <span className="badge">Class Counsellor for {user.counsellorClass} - Sem {user.counsellorSemester}</span>
      </div>

      {/* Subject Faculty Requests (Level 0) */}
      {user.subjects && user.subjects.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Subject Faculty Approvals ({subjectRequests.length})</h2>
          </div>
          {subjectRequests.length === 0 ? (
            <p className="no-data">No pending subject approvals</p>
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
                  {subjectRequests.map(request => (
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
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn-sm btn-reject"
                            onClick={() => openModal(request, 'reject')}
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
      )}

      {/* Class Counsellor Requests (Level 1) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Class Counsellor Approvals ({classRequests.length})</h2>
          {classRequests.length > 0 && (
            <button
              className="btn-primary"
              onClick={handleAcceptAll}
              disabled={acceptAllLoading}
              style={{ marginLeft: 'auto' }}
            >
              {acceptAllLoading ? 'Processing...' : `Accept All (${classRequests.length})`}
            </button>
          )}
        </div>
        {classRequests.length === 0 ? (
          <p className="no-data">No pending class counsellor approvals</p>
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
                {classRequests.map(request => (
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
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn-sm btn-reject"
                          onClick={() => openModal(request, 'reject')}
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

      {/* All Requests */}
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

      {/* Approval Modal */}
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

      {/* Document Modal */}
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

export default ClassCounsellorDashboard;

