import React, { useState, useEffect, useCallback, useRef } from "react";
import { useHistory } from "react-router-dom";
import {
  Shield,
  Users,
  UserCheck,
  Settings,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Save,
  RefreshCw,
  Filter,
  Key,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  getAllPermissions,
  getRolePermissions,
  getUserPermissions,
  assignPermissionsToRole,
  removePermissionsFromRole,
  assignPermissionsToUser,
  removePermissionsFromUser,
  setSystemAdmin,
  getAllUsersForPermissions,
} from "../api/backend/permissions";

const Permissions = () => {
  const { profile } = useAuth();
  const history = useHistory();
  const [activeTab, setActiveTab] = useState("permissions");
  const [loading, setLoading] = useState(false);

  // Permissions state
  const [permissions, setPermissions] = useState([]);
  const [filteredPermissions, setFilteredPermissions] = useState([]);
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPermissions, setTotalPermissions] = useState(0);
  const [perPage] = useState(50);
  
  // Track if permissions have been fetched (to prevent re-fetching on tab switch)
  const permissionsFetchedRef = useRef(false);
  const previousFiltersRef = useRef({ page: null, resource: null, action: null });

  // Role permissions state
  const [roles, setRoles] = useState([
    "admin",
    "reseller",
    "consumer",
    "viewer",
  ]);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [rolePermissions, setRolePermissions] = useState({});
  const [selectedRolePermissions, setSelectedRolePermissions] = useState([]);

  // User permissions state
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  // System admin state
  const [systemAdminUsers, setSystemAdminUsers] = useState([]);
  const [systemAdminSearchQuery, setSystemAdminSearchQuery] = useState("");
  const [systemAdminSearchSuggestions, setSystemAdminSearchSuggestions] =useState([]);

  // Check if user is systemadmin
  const isSystemAdmin = profile?.is_systemadmin === true;

  // Redirect if not systemadmin
  useEffect(() => {
    if (profile && !isSystemAdmin) {
      toast.error("Access denied. System administrator access required.");
      history.push("/admin/dashboard");
    }
  }, [profile, isSystemAdmin, history]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (activeTab === "permissions") {
      setCurrentPage(1);
    }
  }, [resourceFilter, actionFilter, activeTab]);

  // Fetch role permissions when role changes AND roles tab is active
  useEffect(() => {
    if (isSystemAdmin && selectedRole && activeTab === "roles") {
      fetchRolePermissions(selectedRole);
    }
  }, [isSystemAdmin, selectedRole, activeTab]);

  // Fetch users for user permissions tab
  useEffect(() => {
    if (isSystemAdmin && activeTab === "users") {
      fetchUsers();
    }
  }, [isSystemAdmin, activeTab]);

  // Fetch users for system admin tab
  useEffect(() => {
    if (isSystemAdmin && activeTab === "systemadmin") {
      fetchSystemAdminUsers();
    }
  }, [isSystemAdmin, activeTab]);

  // Auto-suggest users after 2-3 characters in system admin search
  useEffect(() => {
    if (activeTab === "systemadmin") {
      if (systemAdminSearchQuery.length >= 2) {
        const timer = setTimeout(() => {
          fetchSystemAdminUsers(systemAdminSearchQuery);
        }, 300);
        return () => clearTimeout(timer);
      } else {
        setSystemAdminSearchSuggestions([]);
        // If search is cleared, show all users again
        if (
          systemAdminSearchQuery.length === 0 &&
          systemAdminUsers.length === 0
        ) {
          fetchSystemAdminUsers();
        }
      }
    }
  }, [systemAdminSearchQuery, activeTab]);

  // Filter permissions by search query only (backend handles resource/action filters)
  useEffect(() => {
    let filtered = permissions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.resource?.toLowerCase().includes(query) ||
          p.action?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredPermissions(filtered);
  }, [permissions, searchQuery]);

  const fetchPermissions = useCallback(
    async (page = 1, resource = "", action = "") => {
      try {
        setLoading(true);
        const result = await getAllPermissions({
          page,
          limit: perPage,
          resource: resource || undefined,
          action: action || undefined,
        });

        if (result.error) {
          toast.error(result.error);
          setPermissions([]);
          setTotalPages(1);
          setTotalPermissions(0);
        } else {
          const permissionsList = Array.isArray(result.data) ? result.data : [];
          setPermissions(permissionsList);

          // Update pagination info
          if (result.pagination) {
            setTotalPages(result.pagination.totalPages || 1);
            setTotalPermissions(result.pagination.total || 0);
          } else {
            setTotalPages(1);
            setTotalPermissions(permissionsList.length);
          }

          if (permissionsList.length === 0) {
            console.warn("No permissions found");
          }
        }
      } catch (error) {
        toast.error("Failed to fetch permissions");
        console.error(error);
        setPermissions([]);
        setTotalPages(1);
        setTotalPermissions(0);
      } finally {
        setLoading(false);
      }
    },
    [perPage]
  );

  // Fetch all permissions on mount and when filters/pagination change (not on tab switch)
  useEffect(() => {
    if (isSystemAdmin && activeTab === "permissions") {
      // Check if filters or pagination changed
      const filtersChanged = 
        previousFiltersRef.current.page !== currentPage ||
        previousFiltersRef.current.resource !== resourceFilter ||
        previousFiltersRef.current.action !== actionFilter;
      
      // Only fetch if never fetched before OR if filters/pagination changed
      if (!permissionsFetchedRef.current || filtersChanged) {
        fetchPermissions(currentPage, resourceFilter, actionFilter);
        permissionsFetchedRef.current = true;
        previousFiltersRef.current = {
          page: currentPage,
          resource: resourceFilter,
          action: actionFilter
        };
      }
    }
  }, [
    isSystemAdmin,
    activeTab,
    currentPage,
    resourceFilter,
    actionFilter,
    fetchPermissions,
  ]);

  const fetchRolePermissions = async (role) => {
    try {
      setLoading(true);
      const result = await getRolePermissions(role);
      if (result.error) {
        toast.error(result.error);
      } else {
        const permIds = result
          .map((rp) => rp.permissions?.id || rp.permission_id)
          .filter(Boolean);
        setSelectedRolePermissions(permIds);
        setRolePermissions((prev) => ({ ...prev, [role]: permIds }));
      }
    } catch (error) {
      toast.error("Failed to fetch role permissions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await getAllUsersForPermissions();
      if (result.error) {
        toast.error(result.error);
      } else {
        setUsers(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemAdminUsers = async (search = "") => {
    try {
      const result = await getAllUsersForPermissions(search);
      if (result.error) {
        console.error("Error fetching users:", result.error);
        if (search.length >= 2) {
          setSystemAdminSearchSuggestions([]);
        } else {
          setSystemAdminUsers([]);
        }
      } else {
        const usersList = Array.isArray(result) ? result : [];
        if (search.length >= 2) {
          setSystemAdminSearchSuggestions(usersList.slice(0, 10)); // Limit suggestions
        } else {
          setSystemAdminUsers(usersList);
        }
      }
    } catch (error) {
      console.error("Failed to fetch system admin users:", error);
      if (search.length >= 2) {
        setSystemAdminSearchSuggestions([]);
      } else {
        setSystemAdminUsers([]);
      }
    }
  };

  const fetchUserPermissions = async (userId) => {
    try {
      setLoading(true);
      const result = await getUserPermissions(userId);
      console.log("User permissions result:", result);
      if (result.error) {
        toast.error(result.error);
        setUserPermissions([]);
      } else {
        // Ensure result is an array
        const permissionsArray = Array.isArray(result) ? result : [];
        const permIds = permissionsArray
          .filter((up) => up.granted !== false)
          .map((up) => up.permission_id || up.permission_name)
          .filter(Boolean);
        console.log("Extracted permission IDs:", permIds);
        setUserPermissions(permIds);
      }
    } catch (error) {
      toast.error("Failed to fetch user permissions");
      console.error(error);
      setUserPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRolePermissionToggle = async (permissionId) => {
    const isSelected = selectedRolePermissions.includes(permissionId);
    const newPermissions = isSelected
      ? selectedRolePermissions.filter((id) => id !== permissionId)
      : [...selectedRolePermissions, permissionId];

    setSelectedRolePermissions(newPermissions);
  };

  const saveRolePermissions = async () => {
    try {
      setLoading(true);
      const currentPerms = rolePermissions[selectedRole] || [];
      const toAdd = selectedRolePermissions.filter(
        (id) => !currentPerms.includes(id)
      );
      const toRemove = currentPerms.filter(
        (id) => !selectedRolePermissions.includes(id)
      );

      // Add new permissions
      if (toAdd.length > 0) {
        const result = await assignPermissionsToRole(selectedRole, toAdd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }

      // Remove permissions
      if (toRemove.length > 0) {
        const result = await removePermissionsFromRole(selectedRole, toRemove);
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }

      setRolePermissions((prev) => ({
        ...prev,
        [selectedRole]: selectedRolePermissions,
      }));
      toast.success(`Permissions updated for ${selectedRole} role`);
    } catch (error) {
      toast.error("Failed to save role permissions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPermissionToggle = async (permissionId) => {
    if (!selectedUser) return;

    // Find the permission to get its name
    const permission = permissions.find(p => p.id === permissionId || p.name === permissionId);
    if (!permission) return;

    // Use permission name for matching (since API returns permission_name)
    const permissionIdentifier = permission.name || permission.id;
    const isSelected = userPermissions.includes(permissionIdentifier) || userPermissions.includes(permission.id);
    const newPermissions = isSelected
      ? userPermissions.filter((id) => id !== permissionIdentifier && id !== permission.id)
      : [...userPermissions, permissionIdentifier];

    setUserPermissions(newPermissions);
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const result = await assignPermissionsToUser(
        selectedUser.user_id || selectedUser.id,
        userPermissions,
        true
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User permissions updated successfully");
      }
    } catch (error) {
      toast.error("Failed to save user permissions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemAdminToggle = async (userId, currentStatus) => {
    try {
      setLoading(true);
      const newStatus = !currentStatus;
      const result = await setSystemAdmin(userId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `System admin status ${newStatus ? "granted" : "revoked"}`
        );
        // Refresh system admin users
        await fetchSystemAdminUsers(systemAdminSearchQuery);
      }
    } catch (error) {
      toast.error("Failed to update system admin status");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    fetchUserPermissions(user.user_id || user.id);
  };

  // Get unique resources and actions
  const resources = [...new Set(permissions.map((p) => p.resource))].sort();
  const actions = [...new Set(permissions.map((p) => p.action))].sort();

  // Filter users for user permissions tab
  const filteredUsers = users.filter((user) => {
    if (!searchUserQuery) return true;
    const query = searchUserQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.user_id?.toLowerCase().includes(query)
    );
  });

  // Filter system admin users
  const filteredSystemAdminUsers = systemAdminUsers.filter((user) => {
    if (!systemAdminSearchQuery || systemAdminSearchQuery.length < 2)
      return true;
    const query = systemAdminSearchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.user_id?.toLowerCase().includes(query)
    );
  });

  if (!isSystemAdmin) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3>Access Denied</h3>
        <p>System administrator access required.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "2px solid #f0f0f0",
            backgroundColor: "#74317e",
            color: "white",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Shield size={28} />
            Permissions Management
          </h2>
          <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: "14px" }}>
            Manage system permissions, role assignments, and user access
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
          }}
        >
          {[
            { id: "permissions", label: "All Permissions", icon: Key },
            { id: "roles", label: "Role Permissions", icon: Users },
            { id: "users", label: "User Permissions", icon: UserCheck },
            { id: "systemadmin", label: "System Admins", icon: Lock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "16px 24px",
                border: "none",
                backgroundColor: activeTab === tab.id ? "white" : "transparent",
                borderBottom:
                  activeTab === tab.id
                    ? "3px solid #74317e"
                    : "3px solid transparent",
                color: activeTab === tab.id ? "#74317e" : "#666",
                fontWeight: activeTab === tab.id ? "600" : "400",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "24px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <RefreshCw
                size={32}
                style={{ animation: "spin 1s linear infinite" }}
              />
              <p>Loading...</p>
            </div>
          )}

          {/* All Permissions Tab */}
          {activeTab === "permissions" && !loading && (
            <div>
              {/* Filters */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ flex: 1, minWidth: "200px", position: "relative" }}
                >
                  <Search
                    size={18}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#999",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search permissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 40px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    minWidth: "150px",
                  }}
                >
                  <option value="">All Resources</option>
                  {resources.map((resource) => (
                    <option key={resource} value={resource}>
                      {resource}
                    </option>
                  ))}
                </select>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    minWidth: "150px",
                  }}
                >
                  <option value="">All Actions</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setResourceFilter("");
                    setActionFilter("");
                    setSearchQuery("");
                  }}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Filter size={16} />
                  Clear
                </button>
              </div>

              {/* Permissions List */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "16px",
                }}
              >
                {filteredPermissions.map((permission) => (
                  <div
                    key={permission.id}
                    style={{
                      padding: "16px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "6px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        marginBottom: "8px",
                      }}
                    >
                      <h4
                        style={{ margin: 0, fontSize: "16px", color: "#333" }}
                      >
                        {permission.name}
                      </h4>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          backgroundColor: "#e3f2fd",
                          color: "#1976d2",
                          borderRadius: "4px",
                          marginRight: "8px",
                        }}
                      >
                        {permission.resource}
                      </span>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          backgroundColor: "#f3e5f5",
                          color: "#7b1fa2",
                          borderRadius: "4px",
                        }}
                      >
                        {permission.action}
                      </span>
                    </div>
                    {permission.description && (
                      <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                        {permission.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {filteredPermissions.length === 0 && !loading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#999",
                  }}
                >
                  No permissions found
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && !loading && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "24px",
                    padding: "16px",
                    borderTop: "1px solid #e0e0e0",
                  }}
                >
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Showing {(currentPage - 1) * perPage + 1} to{" "}
                    {Math.min(currentPage * perPage, totalPermissions)} of{" "}
                    {totalPermissions} permissions
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      style={{
                        padding: "8px 12px",
                        backgroundColor:
                          currentPage === 1 ? "#f0f0f0" : "white",
                        color: currentPage === 1 ? "#999" : "#333",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        opacity: currentPage === 1 ? 0.6 : 1,
                      }}
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>

                    <div style={{ display: "flex", gap: "4px" }}>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              style={{
                                padding: "8px 12px",
                                backgroundColor:
                                  currentPage === pageNum ? "#74317e" : "white",
                                color:
                                  currentPage === pageNum ? "white" : "#333",
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px",
                                minWidth: "40px",
                                fontWeight:
                                  currentPage === pageNum ? "600" : "400",
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "8px 12px",
                        backgroundColor:
                          currentPage === totalPages ? "#f0f0f0" : "white",
                        color: currentPage === totalPages ? "#999" : "#333",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        cursor:
                          currentPage === totalPages
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        opacity: currentPage === totalPages ? 0.6 : 1,
                      }}
                    >
                      Next
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role Permissions Tab */}
          {activeTab === "roles" && !loading && (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginBottom: "24px",
                  alignItems: "center",
                }}
              >
                <label style={{ fontWeight: "600", minWidth: "80px" }}>
                  Select Role:
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    minWidth: "200px",
                  }}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={saveRolePermissions}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#74317e",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "12px",
                  maxHeight: "600px",
                  overflowY: "auto",
                  padding: "8px",
                }}
              >
                {permissions.map((permission) => {
                  const isSelected = selectedRolePermissions.includes(
                    permission.id
                  );
                  return (
                    <div
                      key={permission.id}
                      onClick={() => handleRolePermissionToggle(permission.id)}
                      style={{
                        padding: "12px",
                        border: `2px solid ${
                          isSelected ? "#74317e" : "#e0e0e0"
                        }`,
                        borderRadius: "6px",
                        backgroundColor: isSelected ? "#f3e5f5" : "white",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "14px",
                              marginBottom: "4px",
                            }}
                          >
                            {permission.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {permission.resource} • {permission.action}
                          </div>
                        </div>
                        {isSelected ? (
                          <CheckCircle size={20} color="#74317e" />
                        ) : (
                          <XCircle size={20} color="#ccc" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Permissions Tab */}
          {activeTab === "users" && !loading && (
            <div style={{ display: "flex", gap: "24px", height: "600px" }}>
              {/* User List */}
              <div
                style={{
                  width: "300px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{ padding: "12px", borderBottom: "1px solid #e0e0e0" }}
                >
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {filteredUsers.map((user) => {
                    const userId = user.user_id || user.id;
                    const isSelected =
                      selectedUser &&
                      (selectedUser.user_id || selectedUser.id) === userId;
                    return (
                      <div
                        key={userId}
                        onClick={() => handleUserSelect(user)}
                        style={{
                          padding: "12px",
                          borderBottom: "1px solid #f0f0f0",
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#f3e5f5" : "white",
                          borderLeft: isSelected
                            ? "3px solid #74317e"
                            : "3px solid transparent",
                        }}
                      >
                        <div style={{ fontWeight: "600", fontSize: "14px" }}>
                          {user.full_name || user.name || user.email}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "4px",
                          }}
                        >
                          {user.email}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#999",
                            marginTop: "4px",
                          }}
                        >
                          {user.role} {user.is_systemadmin && "• System Admin"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Info and Permissions */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px",
                }}
              >
                {selectedUser ? (
                  <>
                    <div
                      style={{
                        marginBottom: "20px",
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "24px",
                          fontWeight: "600",
                        }}
                      >
                        {selectedUser.full_name ||
                          selectedUser.name ||
                          selectedUser.email}
                      </h2>
                      <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                        {selectedUser.email} • {selectedUser.role}
                      </p>
                    </div>
                    <button
                      onClick={saveUserPermissions}
                      disabled={loading}
                      style={{
                        padding: "12px 24px",
                        backgroundColor: "#74317e",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "flex-start",
                        marginBottom: "24px",
                        opacity: loading ? 0.6 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      <Save size={18} />
                      Save User Permissions
                    </button>

                    {/* Permissions List */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                        gap: "12px",
                        maxHeight: "400px",
                        overflowY: "auto",
                        padding: "8px",
                      }}
                    >
                      {permissions.map((permission) => {
                        // Check if user has this permission by matching name or id
                        const isSelected = userPermissions.includes(permission.name) || 
                                         userPermissions.includes(permission.id);
                        return (
                          <div
                            key={permission.id}
                            onClick={() => handleUserPermissionToggle(permission.id)}
                            style={{
                              padding: "12px",
                              border: `2px solid ${
                                isSelected ? "#74317e" : "#e0e0e0"
                              }`,
                              borderRadius: "6px",
                              backgroundColor: isSelected ? "#f3e5f5" : "white",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {permission.name}
                                </div>
                                <div style={{ fontSize: "12px", color: "#666" }}>
                                  {permission.resource} • {permission.action}
                                </div>
                              </div>
                              {isSelected ? (
                                <CheckCircle size={20} color="#74317e" />
                              ) : (
                                <XCircle size={20} color="#ccc" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {permissions.length === 0 && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#999",
                        }}
                      >
                        No permissions available
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    Select a user to manage permissions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Admin Tab */}
          {activeTab === "systemadmin" && !loading && (
            <div>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "6px",
                  marginBottom: "24px",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", color: "#856404" }}>
                  System Administrator Access
                </h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#856404" }}>
                  System administrators have full access to all permissions and
                  can manage the permission system. Use this section to grant or
                  revoke system administrator status.
                </p>
              </div>

              {/* Search with autocomplete */}
              <div style={{ marginBottom: "24px", position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <Search
                    size={18}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#999",
                      zIndex: 1,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search users by ID, email, or name (min 2 characters)..."
                    value={systemAdminSearchQuery}
                    onChange={(e) => setSystemAdminSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 40px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  />
                </div>
                {systemAdminSearchQuery.length >= 2 &&
                  systemAdminSearchSuggestions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "white",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        maxHeight: "300px",
                        overflowY: "auto",
                        zIndex: 1000,
                      }}
                    >
                      {systemAdminSearchSuggestions.map((user) => {
                        const userId = user.user_id || user.id;
                        return (
                          <div
                            key={userId}
                            onClick={() => {
                              setSystemAdminSearchQuery(
                                user.email || user.full_name || ""
                              );
                              setSystemAdminSearchSuggestions([]);
                              fetchSystemAdminUsers();
                            }}
                            style={{
                              padding: "12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f0f0f0",
                              transition: "background-color 0.2s",
                            }}
                            onMouseEnter={(e) =>
                              (e.target.style.backgroundColor = "#f5f5f5")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.backgroundColor = "white")
                            }
                          >
                            <div
                              style={{ fontWeight: "600", fontSize: "14px" }}
                            >
                              {user.full_name || user.name || user.email}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "4px",
                              }}
                            >
                              {user.email}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#999",
                                marginTop: "2px",
                              }}
                            >
                              {user.role}{" "}
                              {user.is_systemadmin && "• System Admin"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "16px",
                }}
              >
                {filteredSystemAdminUsers.map((user) => {
                  const userId = user.user_id || user.id;
                  const isSystemAdmin = user.is_systemadmin === true;
                  return (
                    <div
                      key={userId}
                      style={{
                        padding: "16px",
                        border: `2px solid ${
                          isSystemAdmin ? "#74317e" : "#e0e0e0"
                        }`,
                        borderRadius: "6px",
                        backgroundColor: isSystemAdmin ? "#f3e5f5" : "white",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>
                            {user.full_name || user.name || user.email}
                          </h4>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              color: "#666",
                            }}
                          >
                            {user.email}
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: "12px",
                              color: "#999",
                            }}
                          >
                            Role: {user.role}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleSystemAdminToggle(userId, isSystemAdmin)
                          }
                          disabled={loading}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: isSystemAdmin
                              ? "#dc3545"
                              : "#74317e",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          {isSystemAdmin ? (
                            <>
                              <XCircle size={16} />
                              Revoke
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              Grant
                            </>
                          )}
                        </button>
                      </div>
                      {isSystemAdmin && (
                        <div
                          style={{
                            padding: "8px",
                            backgroundColor: "#e8f5e9",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "#2e7d32",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Lock size={14} />
                          System Administrator
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {filteredSystemAdminUsers.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#999",
                  }}
                >
                  {systemAdminSearchQuery.length >= 2
                    ? "No users found"
                    : "No users available"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Permissions;
