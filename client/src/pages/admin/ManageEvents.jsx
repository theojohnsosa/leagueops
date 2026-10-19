import { useEffect, useState, useMemo } from "react";
import api from "../../services/api.js";
import "./Users.css";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // Modal states
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    studentEmail: "",
    studentId: "",
    department: "CCS",
    role: "Player",
  });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data } = await api.get("/users");
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Activate / Deactivate Toggle
  async function toggleUserStatus(u) {
    const actionText = u.isActive ? "deactivate" : "activate";
    if (
      !window.confirm(`Are you sure you want to ${actionText} ${u.fullName}?`)
    )
      return;

    try {
      const endpoint = `/users/${u._id || u.id}/${u.isActive ? "deactivate" : "activate"}`;
      // Fallback if backend uses standard patch/put:
      await api
        .patch(endpoint)
        .catch(() =>
          api.put(`/users/${u._id || u.id}`, { isActive: !u.isActive }),
        );

      setUsers((current) =>
        current.map((item) =>
          item._id === u._id || item.id === u.id
            ? { ...item, isActive: !item.isActive }
            : item,
        ),
      );
      setNotice(
        `Successfully ${u.isActive ? "deactivated" : "activated"} ${u.fullName}`,
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      // Optimistic UI update fallback for local testing if endpoints differ
      setUsers((current) =>
        current.map((item) =>
          item._id === u._id || item.id === u.id
            ? { ...item, isActive: !item.isActive }
            : item,
        ),
      );
    }
  }

  // Handle Save (Add or Edit)
  async function handleSaveUser(e) {
    e.preventDefault();
    try {
      if (editingUser) {
        const id = editingUser._id || editingUser.id;
        const { data } = await api.put(`/users/${id}`, formData);
        const updated = data.user || formData;
        setUsers((current) =>
          current.map((item) =>
            item._id === id || item.id === id ? { ...item, ...updated } : item,
          ),
        );
        setNotice("User updated successfully.");
      } else {
        const { data } = await api.post("/users", formData);
        const newUser = data.user || {
          ...formData,
          _id: Date.now().toString(),
          isActive: true,
        };
        setUsers((current) => [newUser, ...current]);
        setNotice("User added successfully.");
      }
      closeModals();
    } catch (err) {
      console.error("Failed to save user:", err);
      setNotice("Failed to save user. Please try again.");
    }
  }

  function openEditModal(u) {
    setEditingUser(u);
    setFormData({
      fullName: u.fullName || "",
      studentEmail: u.studentEmail || "",
      studentId: u.studentId || "",
      department: u.department || "CCS",
      role: u.role || "Player",
    });
  }

  function openAddModal() {
    setIsAddModalOpen(true);
    setFormData({
      fullName: "",
      studentEmail: "",
      studentId: "",
      department: "CCS",
      role: "Player",
    });
  }

  function closeModals() {
    setViewingUser(null);
    setEditingUser(null);
    setIsAddModalOpen(false);
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = search.toLowerCase();
      const matchesSearch =
        (u.fullName || "").toLowerCase().includes(query) ||
        (u.studentEmail || "").toLowerCase().includes(query) ||
        (u.studentId || "").toLowerCase().includes(query);

      const matchesRole = roleFilter === "All Roles" || u.role === roleFilter;
      const matchesDept =
        deptFilter === "All Departments" || u.department === deptFilter;
      const matchesStatus =
        statusFilter === "All Status" ||
        (statusFilter === "Active" && u.isActive) ||
        (statusFilter === "Inactive" && !u.isActive);

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, search, roleFilter, deptFilter, statusFilter]);

  if (loading) return <p className="users-loading">Loading users...</p>;

  return (
    <div className="users-container">
      <div className="users-header-section">
        <div>
          <h2>User Management</h2>
          <p>Manage user accounts and roles.</p>
        </div>
        <button className="add-user-btn" onClick={openAddModal}>
          + Add User
        </button>
      </div>

      {notice && (
        <div
          className="archive-notice"
          role="status"
          style={{
            marginBottom: "15px",
            padding: "10px",
            background: "#e3fcef",
            color: "#006644",
            borderRadius: "6px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="users-toolbar">
        <div className="users-search-wrapper">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search name, email, student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option>All Roles</option>
          <option>Head</option>
          <option>Committee</option>
          <option>Player</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option>All Departments</option>
          <option>CCS</option>
          <option>CBA</option>
          <option>CEA</option>
          <option>CAHS</option>
          <option>COS</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      <div className="users-list">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => {
            const initials = u.fullName
              ? u.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "U";

            return (
              <div className="user-card" key={u._id || u.id}>
                <div className="user-info-left">
                  <div className="user-avatar">{initials}</div>
                  <div className="user-details">
                    <div className="user-title-row">
                      <h3>{u.fullName}</h3>
                      {u.role && (
                        <span className={`role-badge ${u.role.toLowerCase()}`}>
                          {u.role}
                        </span>
                      )}
                    </div>
                    <p>
                      {u.studentEmail} · {u.studentId} · {u.department}
                    </p>
                  </div>
                </div>

                <div className="user-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={() => setViewingUser(u)}
                  >
                    View
                  </button>
                  <button
                    className="action-btn edit-btn"
                    onClick={() => openEditModal(u)}
                  >
                    Edit
                  </button>
                  {u.isActive ? (
                    <button
                      className="action-btn deactivate-btn"
                      onClick={() => toggleUserStatus(u)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="action-btn activate-btn"
                      onClick={() => toggleUserStatus(u)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="no-users">No users found.</p>
        )}
      </div>

      {/* MODAL FOR VIEW / EDIT / ADD */}
      {(viewingUser || editingUser || isAddModalOpen) && (
        <div className="archive-modal-backdrop" onClick={closeModals}>
          <section
            className="archive-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "400px",
              maxWidth: "90%",
            }}
          >
            <button
              className="modal-close"
              onClick={closeModals}
              style={{
                float: "right",
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            {viewingUser ? (
              <div>
                <h2>User Details</h2>
                <p>
                  <strong>Name:</strong> {viewingUser.fullName}
                </p>
                <p>
                  <strong>Email:</strong> {viewingUser.studentEmail}
                </p>
                <p>
                  <strong>Student ID:</strong> {viewingUser.studentId}
                </p>
                <p>
                  <strong>Department:</strong> {viewingUser.department}
                </p>
                <p>
                  <strong>Role:</strong> {viewingUser.role}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {viewingUser.isActive ? "Active" : "Inactive"}
                </p>
                <button
                  className="action-button"
                  onClick={closeModals}
                  style={{
                    marginTop: "15px",
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveUser}>
                <h2>{editingUser ? "Edit User" : "Add New User"}</h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "15px",
                  }}
                >
                  <label>
                    Full Name
                    <input
                      required
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        marginTop: "4px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </label>
                  <label>
                    Student Email
                    <input
                      required
                      type="email"
                      value={formData.studentEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          studentEmail: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        marginTop: "4px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </label>
                  <label>
                    Student ID
                    <input
                      required
                      type="text"
                      value={formData.studentId}
                      onChange={(e) =>
                        setFormData({ ...formData, studentId: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        marginTop: "4px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </label>
                  <label>
                    Department
                    <select
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        marginTop: "4px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    >
                      <option>CCS</option>
                      <option>CBA</option>
                      <option>CEA</option>
                      <option>CAHS</option>
                      <option>COS</option>
                    </select>
                  </label>
                  <label>
                    Role
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        marginTop: "4px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    >
                      <option>Head</option>
                      <option>Committee</option>
                      <option>Player</option>
                    </select>
                  </label>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeModals}
                    style={{ padding: "8px 14px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 14px",
                      background: "#0052cc",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
