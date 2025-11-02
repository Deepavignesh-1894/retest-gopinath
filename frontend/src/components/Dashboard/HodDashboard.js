import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getAuth } from '../../utils/auth';
import './Dashboard.css';

const HodDashboard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [departmentRequests, setDepartmentRequests] = useState([]); // Level 2 - CC approved from dept
  const [subjectRequests, setSubjectRequests] = useState([]); // Level 0 - Subject requests
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
    const initializeData = async () => {
      // Load user first to ensure we have departmentAsHod and subjects
      await loadCurrentUser();
      // Then load requests
      loadPendingRequests();
      loadAllRequests();
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

  const loadPendingRequests = async () => {
    try {
      const response = await api.get('/retests/pending');
      const requests = response.data;
      setPendingRequests(requests);
      
      // Get fresh user data to ensure we have latest departmentAsHod
      const currentUserData = user.departmentAsHod ? user : JSON.parse(localStorage.getItem('user') || '{}');
      
      // Separate into department requests (all levels from HoD's department) and subject requests (level 0)
      // Backend already filters by department for level 2, so we trust that
      const deptReqs = requests.filter(req => {
        // Level 2 requests are from HoD's department (backend filtered) - always include
        if (Number(req.levelOfApproval) === 2) {
          return true;
        }
        // For other levels, check if we have user data and match department
        if (currentUserData.departmentAsHod) {
          const hodDeptId = currentUserData.departmentAsHod?.toString() || 
                           currentUserData.departmentAsHod?._id?.toString() || 
                           currentUserData.departmentAsHod;
          if (hodDeptId && req.student) {
            const studentDept = req.student?.department?._id?.toString() || 
                               req.student?.department?.toString() || 
                               req.student?.department;
            return studentDept && studentDept === hodDeptId;
          }
        }
        return false;
      });
      
      // Subject requests: Level 0 requests where HoD teaches the subject
      const subjReqs = requests.filter(req => {
        if (Number(req.levelOfApproval) !== 0 || req.status !== 'pending') return false;
        if (!currentUserData.subjects || currentUserData.subjects.length === 0) return false;
        
        const requestSubjectId = req.subject?._id?.toString() || req.subject?.toString();
        const requestSemester = parseInt(req.semester);
        const requestClass = req.class;
        
        if (!requestSubjectId || !requestSemester || !requestClass) return false;
        
        return currentUserData.subjects.some(s => {
          if (!s) return false;
          const subjId = s.subject?._id?.toString() || s.subject?.toString() || s.subject;
          const subjSemester = parseInt(s.semester);
          const subjClass = s.class;
          return subjId === requestSubjectId && 
                 subjSemester === requestSemester && 
                 subjClass === requestClass;
        });
      });
      
      setDepartmentRequests(deptReqs);
      setSubjectRequests(subjReqs);
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
      const requestsToApprove = departmentRequests.filter(request => canApprove(request));
      
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
    
    // Backend already filtered by department, so if it's level 2 and pending, HoD can approve
    // Additional safety check: verify department if user data is available
    if (user.departmentAsHod && request.student) {
      const hodDeptId = user.departmentAsHod?.toString() || 
                       user.departmentAsHod?._id?.toString() || 
                       user.departmentAsHod;
      const studentDept = request.student?.department?._id?.toString() || 
                         request.student?.department?.toString() || 
                         request.student?.department;
      // If we can verify and it doesn't match, return false
      if (hodDeptId && studentDept && studentDept !== hodDeptId) {
        return false;
      }
    }
    
    // Level 2 and pending = HoD can approve
    return true;
  };

  const canApproveAsSubject = (request) => {
    // HoD can approve as subject faculty at level 0
    if (!request || request.status !== 'pending') {
      return false;
    }
    // Check if level is 0 (handle both string and number)
    const level = Number(request.levelOfApproval);
    if (level !== 0) {
      return false;
    }
    if (!user.subjects || user.subjects.length === 0) {
      return false;
    }
    
    const requestSubjectId = request.subject?._id?.toString() || request.subject?.toString();
    const requestSemester = parseInt(request.semester);
    const requestClass = request.class;
    
    if (!requestSubjectId || !requestSemester || !requestClass) {
      return false;
    }
    
    // Check if user teaches this subject for the same semester and class
    return user.subjects.some(s => {
      if (!s) return false;
      const subjId = s.subject?._id?.toString() || s.subject?.toString() || s.subject;
      const subjSemester = parseInt(s.semester);
      const subjClass = s.class;
      return subjId === requestSubjectId && 
             subjSemester === requestSemester && 
             subjClass === requestClass;
    });
  };

  const canApprove = (request) => {
    // Check if HoD can approve as HoD (level 2) or as subject faculty (level 0)
    return canApproveAsHoD(request) || canApproveAsSubject(request);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>HoD Dashboard</h1>
      </div>

      {/* Subject Faculty Requests (Level 0) */}
      {user.subjects && user.subjects.length > 0 && subjectRequests.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Subject Faculty Approvals ({subjectRequests.length})</h2>
          </div>
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
                        {request.status === 'pending' && canApproveAsSubject(request) && (
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department Requests - Pending Approvals */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Pending Approvals ({departmentRequests.length})</h2>
          {departmentRequests.filter(req => canApprove(req)).length > 0 && (
            <button
              className="btn-primary"
              onClick={handleAcceptAll}
              disabled={acceptAllLoading}
              style={{ marginLeft: 'auto' }}
            >
              {acceptAllLoading ? 'Processing...' : `Accept All (${departmentRequests.filter(req => canApprove(req)).length})`}
            </button>
          )}
        </div>
        {departmentRequests.length === 0 ? (
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
                {departmentRequests.map(request => (
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
                          </>
                        ) : request.status === 'pending' ? (
                          <span className="text-muted">Not authorized</span>
                        ) : null}
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




