import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  UserProfile,
  Role,
  UserStatus,
  MODULE_LIST,
  SPECIAL_PERMISSIONS,
  PermissionAction,
  ERPModule,
} from "@/lib/user-role-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Shield,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  Eye,
  Settings2,
  FileSpreadsheet,
  AlertTriangle,
  Laptop,
} from "lucide-react";

export const Route = createFileRoute("/system/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles Governance — WeaveOne ERP" },
      {
        name: "description",
        content:
          "Manage WeaveOne ERP system users, direct admin user creation, self-registration approval queue, role-permission matrix, and session audit trails.",
      },
      { property: "og:title", content: "Users & Roles Governance — WeaveOne ERP" },
      { property: "og:description", content: "Permission-controlled access and user approval workflow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersGovernancePage,
});

const STATUS_BADGES: Record<UserStatus, { label: string; class: string; icon: any }> = {
  ACTIVE: { label: "🟢 Active", class: "bg-emerald-600 text-white font-bold", icon: CheckCircle2 },
  PENDING: { label: "🟡 Pending Approval", class: "bg-amber-500 text-white font-bold animate-pulse", icon: Clock },
  INACTIVE: { label: "⚪ Inactive", class: "bg-slate-500 text-white", icon: UserX },
  SUSPENDED: { label: "🔴 Suspended", class: "bg-rose-600 text-white font-bold", icon: AlertTriangle },
  LOCKED: { label: "🟠 Locked", class: "bg-orange-600 text-white font-bold", icon: Lock },
  REJECTED: { label: "❌ Rejected", class: "bg-red-800 text-white font-bold", icon: XCircle },
};

function UsersGovernancePage() {
  const {
    users,
    roles,
    sessions,
    audits,
    pendingUsers,
    addUserDirect,
    approveUserRequest,
    rejectUserRequest,
    updateUserStatus,
    updateUserRole,
    addRole,
    updateRole,
    terminateSession,
    resetUserPassword,
  } = useUserRoles();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("users");

  // Modals & Drawers
  const [addDirectOpen, setAddDirectOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [approvalModalUser, setApprovalModalUser] = useState<UserProfile | null>(null);
  const [rejectModalUser, setRejectModalUser] = useState<UserProfile | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Workflow A: Admin Direct User Creation Form State
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newDepartment, setNewDepartment] = useState("Production");
  const [newDesignation, setNewDesignation] = useState("");
  const [newRoleId, setNewRoleId] = useState("role-production-mgr");
  const [newStatus, setNewStatus] = useState<UserStatus>("ACTIVE");

  // Role Builder State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.primary_role_id === roleFilter;
    const matchesDept = deptFilter === "ALL" || u.department === deptFilter;
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Handle Workflow A: Admin Direct Creation
  const handleCreateUserDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !newEmail || !newMobile || !newEmployeeId) {
      toast.error("Please fill in mandatory basic information.");
      return;
    }

    addUserDirect(
      {
        first_name: newFirstName,
        last_name: newLastName,
        display_name: `${newFirstName} ${newLastName}`.trim(),
        email: newEmail,
        mobile: newMobile,
        employee_id: newEmployeeId,
        department: newDepartment,
        designation: newDesignation || "Staff",
        username: newEmail,
        primary_role_id: newRoleId,
        additional_role_ids: [],
        status: newStatus,
        direct_permissions: {},
        failed_attempts: 0,
        is_locked: false,
      },
      "WeaveOne Admin"
    );

    setAddDirectOpen(false);
    // Reset Form
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewMobile("");
    setNewEmployeeId("");
    setNewDesignation("");
  };

  // Handle Workflow B Approval
  const handleConfirmApproval = () => {
    if (!approvalModalUser) return;
    approveUserRequest(approvalModalUser.id, assignRoleId || approvalModalUser.primary_role_id, approvalRemarks, "WeaveOne Admin");
    setApprovalModalUser(null);
    setApprovalRemarks("");
  };

  // Handle Workflow B Rejection
  const handleConfirmRejection = () => {
    if (!rejectModalUser) return;
    if (!rejectionRemarks.trim()) {
      toast.error("Rejection remarks are mandatory.");
      return;
    }
    rejectUserRequest(rejectModalUser.id, rejectionRemarks, "WeaveOne Admin");
    setRejectModalUser(null);
    setRejectionRemarks("");
  };

  // Open Role Editor
  const handleOpenRoleEditor = (r?: Role) => {
    if (r) {
      setSelectedRole(r);
      setNewRoleName(r.name);
      setNewRoleDesc(r.description);
      setRolePermissions(r.permissions || {});
    } else {
      setSelectedRole(null);
      setNewRoleName("");
      setNewRoleDesc("");
      setRolePermissions({});
    }
    setRoleEditorOpen(true);
  };

  // Save Role
  const handleSaveRole = () => {
    if (!newRoleName.trim()) {
      toast.error("Role Name is required.");
      return;
    }

    if (selectedRole) {
      updateRole(selectedRole.id, {
        name: newRoleName,
        description: newRoleDesc,
        permissions: rolePermissions,
      });
    } else {
      addRole({
        name: newRoleName,
        description: newRoleDesc,
        permissions: rolePermissions,
      });
    }
    setRoleEditorOpen(false);
  };

  const togglePermission = (key: string) => {
    setRolePermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <AppShell
      title="Users & Roles Governance (System)"
      breadcrumb={[{ label: "System" }, { label: "Users & Roles Governance" }]}
    >
      <div className="space-y-4 text-xs">
        {/* Top KPI & Notification Banner */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Active Users</span>
                <UserCheck className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">
                {users.filter((u) => u.status === "ACTIVE").length} Users
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Operational Access Granted</span>
            </CardContent>
          </Card>

          <Card className={`border ${pendingUsers.length > 0 ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20" : "border-border"}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pending Approvals</span>
                <Clock className="size-4 text-amber-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-amber-600">
                {pendingUsers.length} Requests
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">
                {pendingUsers.length > 0 ? "⚠️ Requires Admin Review" : "No pending queue"}
              </span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Configured Roles</span>
                <Shield className="size-4 text-purple-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-purple-600">
                {roles.length} Roles
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Granular Permission Matrix</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Sessions</span>
                <Laptop className="size-4 text-blue-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-blue-600">
                {sessions.filter((s) => s.status === "ACTIVE").length} Sessions
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Real-time Browser Telemetry</span>
            </CardContent>
          </Card>
        </div>

        {/* Governance Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <TabsList className="h-9 text-xs">
              <TabsTrigger value="users" className="gap-1.5 h-8">
                <UserCheck className="size-3.5 text-emerald-600" /> System Users ({users.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1.5 h-8 relative">
                <Clock className="size-3.5 text-amber-500" /> Pending Approvals
                {pendingUsers.length > 0 && (
                  <Badge className="ml-1 h-4 px-1.5 text-[0.5625rem] bg-amber-500 text-white rounded-full">
                    {pendingUsers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-1.5 h-8">
                <Shield className="size-3.5 text-purple-600" /> Roles & Permissions ({roles.length})
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5 h-8">
                <FileSpreadsheet className="size-3.5 text-blue-600" /> Security Audit Log
              </TabsTrigger>
            </TabsList>

            {/* Quick Action Trigger */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setAddDirectOpen(true)}
                className="h-8 text-xs gap-1 font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <UserPlus className="size-3.5" /> + Add User (Direct Admin Creation)
              </Button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: SYSTEM USERS DIRECTORY */}
          {/* ========================================================================= */}
          <TabsContent value="users" className="mt-3 space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-lg border border-border">
              <div className="flex flex-1 items-center gap-2 min-w-[240px]">
                <Search className="size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, employee ID, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 text-xs bg-background"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Filter className="size-3 text-muted-foreground" />
                  <span className="text-[0.6875rem] text-muted-foreground font-semibold">Role:</span>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-7 text-xs w-[130px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[0.6875rem] text-muted-foreground font-semibold">Department:</span>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-7 text-xs w-[140px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Quality Control">Quality Control</SelectItem>
                      <SelectItem value="Costing & Design">Costing & Design</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Store & Inventory">Store & Inventory</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[0.6875rem] text-muted-foreground font-semibold">Status:</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-7 text-xs w-[120px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                      <SelectItem value="LOCKED">LOCKED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Users Directory Table */}
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">User & Contact</TableHead>
                      <TableHead className="h-8">Emp ID & Dept</TableHead>
                      <TableHead className="h-8">Assigned Role</TableHead>
                      <TableHead className="h-8">Creation Method</TableHead>
                      <TableHead className="h-8">Account Status</TableHead>
                      <TableHead className="h-8">Last Activity</TableHead>
                      <TableHead className="h-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No users matched search and filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => {
                        const r = roles.find((x) => x.id === u.primary_role_id);
                        const statusBadge = STATUS_BADGES[u.status] || STATUS_BADGES.ACTIVE;

                        return (
                          <TableRow key={u.id} className="hover:bg-muted/40">
                            <TableCell className="py-2 font-medium">
                              <div className="font-bold text-foreground">{u.display_name}</div>
                              <div className="text-[0.6875rem] font-mono text-muted-foreground">{u.email}</div>
                              <div className="text-[0.625rem] text-muted-foreground">{u.mobile}</div>
                            </TableCell>

                            <TableCell className="py-2">
                              <span className="font-mono font-semibold text-primary">{u.employee_id}</span>
                              <div className="text-[0.6875rem] text-muted-foreground">{u.department}</div>
                              <div className="text-[0.625rem] text-muted-foreground">{u.designation}</div>
                            </TableCell>

                            <TableCell className="py-2">
                              <Badge className="bg-purple-600 text-white font-semibold text-[0.625rem]">
                                {r?.name || u.primary_role_id}
                              </Badge>
                              {u.additional_role_ids.length > 0 && (
                                <div className="text-[0.625rem] text-muted-foreground mt-0.5">
                                  +{u.additional_role_ids.length} extra roles
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="py-2">
                              {u.creation_method === "ADMIN_CREATED" ? (
                                <Badge variant="outline" className="text-[0.625rem] border-emerald-500 text-emerald-700 bg-emerald-50">
                                  Admin Created
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[0.625rem] border-amber-500 text-amber-700 bg-amber-50">
                                  Self Request
                                </Badge>
                              )}
                              <div className="text-[0.625rem] text-muted-foreground mt-0.5">
                                {u.approval_status}
                              </div>
                            </TableCell>

                            <TableCell className="py-2">
                              <Badge className={`text-[0.625rem] ${statusBadge.class}`}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-2 font-mono text-[0.6875rem] text-muted-foreground">
                              {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                            </TableCell>

                            <TableCell className="py-2 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="size-7">
                                    <MoreVertical className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs w-48">
                                  <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setUserProfileOpen(true);
                                    }}
                                  >
                                    <Eye className="size-3.5 mr-1.5 text-blue-600" /> View Full Profile & Security
                                  </DropdownMenuItem>

                                  {u.status === "PENDING" && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setApprovalModalUser(u);
                                        setAssignRoleId(u.requested_role_id || u.primary_role_id);
                                      }}
                                    >
                                      <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-600" /> Approve Access
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  {u.status === "ACTIVE" ? (
                                    <DropdownMenuItem
                                      onClick={() => updateUserStatus(u.id, "INACTIVE", "Deactivated by Admin")}
                                      className="text-amber-600"
                                    >
                                      <UserX className="size-3.5 mr-1.5" /> Deactivate Account
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => updateUserStatus(u.id, "ACTIVE", "Activated by Admin")}
                                      className="text-emerald-600"
                                    >
                                      <UserCheck className="size-3.5 mr-1.5" /> Activate Account
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => updateUserStatus(u.id, "SUSPENDED", "Suspended by Admin")}
                                    className="text-rose-600"
                                  >
                                    <AlertTriangle className="size-3.5 mr-1.5" /> Suspend Access
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => resetUserPassword(u.id, "TempPass2026!")}
                                  >
                                    <Key className="size-3.5 mr-1.5 text-purple-600" /> Reset Temporary Password
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: WORKFLOW B — PENDING APPROVALS QUEUE */}
          {/* ========================================================================= */}
          <TabsContent value="pending" className="mt-3 space-y-3">
            <Card className="border border-amber-300 bg-amber-50/20">
              <CardHeader className="p-3 pb-2 border-b border-amber-200">
                <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Clock className="size-4 text-amber-600" /> Pending Self-Registration Requests Queue
                </CardTitle>
                <CardDescription className="text-[0.6875rem]">
                  Users submitting self-registration remain pending until an authorized Admin approves or rejects the request. Protected ERP modules are inaccessible while pending.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold">No Pending Approval Requests</p>
                    <p className="text-[0.6875rem]">All user self-registration requests have been processed.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pendingUsers.map((req) => {
                      const reqRole = roles.find((r) => r.id === (req.requested_role_id || req.primary_role_id));

                      return (
                        <Card key={req.id} className="border border-border shadow-xs bg-background">
                          <CardContent className="p-3.5 space-y-2.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm text-foreground">{req.display_name}</h4>
                                <p className="font-mono text-xs text-primary">{req.email}</p>
                                <p className="text-[0.6875rem] text-muted-foreground">{req.mobile} · Emp ID: <span className="font-mono">{req.employee_id}</span></p>
                              </div>
                              <Badge className="bg-amber-500 text-white font-bold text-[0.625rem]">
                                PENDING APPROVAL
                              </Badge>
                            </div>

                            <div className="bg-muted/40 p-2 rounded text-[0.6875rem] space-y-1">
                              <div><strong>Department:</strong> {req.department} ({req.designation})</div>
                              <div><strong>Requested Role:</strong> <span className="text-purple-700 font-bold">{reqRole?.name || "Standard Role"}</span></div>
                              <div><strong>Requested Date:</strong> {new Date(req.created_at).toLocaleDateString()}</div>
                              {req.request_reason && (
                                <div className="mt-1 pt-1 border-t border-border/60 text-muted-foreground italic">
                                  "{req.request_reason}"
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(req);
                                  setUserProfileOpen(true);
                                }}
                                className="h-7 text-xs gap-1"
                              >
                                <Eye className="size-3" /> View Request
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectModalUser(req);
                                  setRejectionRemarks("");
                                }}
                                className="h-7 text-xs gap-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle className="size-3" /> Reject
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  setApprovalModalUser(req);
                                  setAssignRoleId(req.requested_role_id || req.primary_role_id);
                                  setApprovalRemarks("");
                                }}
                                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                <CheckCircle2 className="size-3" /> Approve Access
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: ROLES & GRANULAR PERMISSION MATRIX */}
          {/* ========================================================================= */}
          <TabsContent value="roles" className="mt-3 space-y-3">
            <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-lg border border-border">
              <div>
                <h3 className="font-bold text-xs text-foreground">Role & Granular Permission Matrix</h3>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Configure role-based access levels (VIEW, CREATE, EDIT, DELETE, APPROVE, EXPORT, PRINT) across ERP modules.
                </p>
              </div>
              <Button size="sm" onClick={() => handleOpenRoleEditor()} className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white font-bold">
                <Shield className="size-3" /> + Create Custom Role
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((r) => {
                const mappedUserCount = users.filter((u) => u.primary_role_id === r.id).length;
                const permCount = Object.values(r.permissions || {}).filter(Boolean).length;

                return (
                  <Card key={r.id} className="border border-border">
                    <CardHeader className="p-3 pb-2 border-b border-border flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Shield className="size-3.5 text-purple-600" /> {r.name}
                        </CardTitle>
                        {r.is_system && (
                          <Badge variant="outline" className="text-[0.5625rem] text-muted-foreground mt-0.5">
                            SYSTEM ROLE
                          </Badge>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleOpenRoleEditor(r)} className="h-6 text-[0.6875rem] px-2">
                        <Settings2 className="size-3 mr-1" /> Edit Matrix
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                      <p className="text-[0.6875rem] text-muted-foreground leading-relaxed">
                        {r.description}
                      </p>
                      <div className="flex justify-between items-center text-[0.6875rem] pt-2 border-t border-border/60">
                        <span className="font-semibold text-foreground">{mappedUserCount} Users Assigned</span>
                        <span className="text-purple-600 font-bold font-mono">{permCount} Permissions Granted</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 4: SYSTEM SECURITY AUDIT LOG */}
          {/* ========================================================================= */}
          <TabsContent value="audit" className="mt-3 space-y-3">
            <Card className="rounded-md border border-border">
              <CardHeader className="p-3 pb-2 border-b border-border">
                <CardTitle className="text-xs font-bold text-primary">System Governance Audit Trail</CardTitle>
                <CardDescription className="text-[0.6875rem]">
                  Immutable record of user creation, approval decisions, rejection reasons, status changes, and permission matrix edits.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Timestamp</TableHead>
                      <TableHead className="h-8">Performed By</TableHead>
                      <TableHead className="h-8">Target User / Entity</TableHead>
                      <TableHead className="h-8">Action Taken</TableHead>
                      <TableHead className="h-8">State Transition / Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => (
                      <TableRow key={a.id} className="hover:bg-muted/40 font-mono text-[0.6875rem]">
                        <TableCell className="py-2">{new Date(a.timestamp).toLocaleString()}</TableCell>
                        <TableCell className="py-2 font-bold text-foreground">{a.performed_by_name}</TableCell>
                        <TableCell className="py-2 font-bold text-primary">{a.target_user_name}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[0.625rem] capitalize font-sans">
                            {a.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground">
                          {a.previous_value && <span className="line-through mr-1">{a.previous_value}</span>}
                          {a.new_value && <span className="text-emerald-700 font-bold mr-2">→ {a.new_value}</span>}
                          <span className="italic font-sans text-xs">"{a.remarks}"</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========================================================================= */}
        {/* MODAL 1: WORKFLOW A — DIRECT ADMIN USER CREATION */}
        {/* ========================================================================= */}
        <Dialog open={addDirectOpen} onOpenChange={setAddDirectOpen}>
          <DialogContent className="max-w-md text-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-primary">
                <UserPlus className="size-4 text-emerald-600" /> Workflow A — Add User (Admin Direct Creation)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Admin-created users are assigned roles and activated directly, bypassing the pending approval queue.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUserDirect} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input required placeholder="Amit" className="h-7 text-xs" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input required placeholder="Patel" className="h-7 text-xs" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email Address (Login Username) *</Label>
                <Input required type="email" placeholder="amit.patel@weaveone.com" className="h-7 text-xs font-mono" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Mobile Number *</Label>
                  <Input required placeholder="+91 98980 11223" className="h-7 text-xs font-mono" value={newMobile} onChange={(e) => setNewMobile(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Employee ID *</Label>
                  <Input required placeholder="EMP-055" className="h-7 text-xs font-mono" value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Department *</Label>
                  <Select value={newDepartment} onValueChange={setNewDepartment}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Quality Control">Quality Control</SelectItem>
                      <SelectItem value="Costing & Design">Costing & Design</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Store & Inventory">Store & Inventory</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Designation</Label>
                  <Input placeholder="Manager" className="h-7 text-xs" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Primary Role *</Label>
                  <Select value={newRoleId} onValueChange={setNewRoleId}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Initial Account State</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as UserStatus)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">🟢 Active (Immediate Login)</SelectItem>
                      <SelectItem value="INACTIVE">⚪ Inactive (Disabled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded border border-emerald-300 text-[0.6875rem] text-emerald-900 dark:text-emerald-200">
                <strong>Workflow A Notice:</strong> Creation Method will be marked as <span className="font-bold underline">ADMIN CREATED</span> with status <span className="font-bold">ADMIN APPROVED</span>. User can log in immediately upon save.
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddDirectOpen(false)} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="size-3.5" /> Create & Activate User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 2: WORKFLOW B — APPROVE USER REQUEST */}
        {/* ========================================================================= */}
        <Dialog open={Boolean(approvalModalUser)} onOpenChange={(open) => !open && setApprovalModalUser(null)}>
          <DialogContent className="max-w-md text-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="size-4 text-emerald-600" /> Approve Self-Registration Request
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review request details and assign final role permissions to activate the account.
              </DialogDescription>
            </DialogHeader>

            {approvalModalUser && (
              <div className="space-y-3 pt-2">
                <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-1">
                  <div><strong>Applicant Name:</strong> {approvalModalUser.display_name}</div>
                  <div><strong>Email:</strong> <span className="font-mono text-primary">{approvalModalUser.email}</span></div>
                  <div><strong>Department:</strong> {approvalModalUser.department} ({approvalModalUser.designation})</div>
                  <div><strong>Reason for Request:</strong> "{approvalModalUser.request_reason}"</div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Assign Primary Role *</Label>
                  <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} — {r.description.substring(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Approval Remarks (Optional)</Label>
                  <Textarea
                    placeholder="Enter approval note or department authorization reference..."
                    className="text-xs min-h-[50px] resize-none"
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setApprovalModalUser(null)} className="h-7 text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleConfirmApproval} className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="size-3.5" /> Confirm Approval & Activate
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 3: WORKFLOW B — REJECT USER REQUEST (MANDATORY REMARKS) */}
        {/* ========================================================================= */}
        <Dialog open={Boolean(rejectModalUser)} onOpenChange={(open) => !open && setRejectModalUser(null)}>
          <DialogContent className="max-w-md text-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-rose-700">
                <XCircle className="size-4 text-rose-600" /> Reject Self-Registration Request
              </DialogTitle>
              <DialogDescription className="text-xs">
                Rejection requires mandatory remarks detailing why access is denied.
              </DialogDescription>
            </DialogHeader>

            {rejectModalUser && (
              <div className="space-y-3 pt-2">
                <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-300 text-rose-900 dark:text-rose-200 space-y-1">
                  <div><strong>Applicant:</strong> {rejectModalUser.display_name} ({rejectModalUser.email})</div>
                  <div><strong>Department:</strong> {rejectModalUser.department}</div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-rose-700">Rejection Reason / Remarks (Mandatory) *</Label>
                  <Textarea
                    required
                    placeholder="Enter explicit rejection reason (e.g. Invalid employee credentials or unauthorized role requested)..."
                    className="text-xs min-h-[70px] resize-none border-rose-300"
                    value={rejectionRemarks}
                    onChange={(e) => setRejectionRemarks(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setRejectModalUser(null)} className="h-7 text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleConfirmRejection} className="h-7 text-xs font-bold gap-1 bg-rose-600 hover:bg-rose-700 text-white">
                    <XCircle className="size-3.5" /> Confirm Rejection
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 4: ROLE BUILDER & GRANULAR PERMISSION MATRIX EDITOR */}
        {/* ========================================================================= */}
        <Dialog open={roleEditorOpen} onOpenChange={setRoleEditorOpen}>
          <DialogContent className="max-w-3xl text-xs max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-purple-700">
                <Shield className="size-4 text-purple-600" /> {selectedRole ? `Edit Role Matrix — ${selectedRole.name}` : "Create Custom Role"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure module-level permission checkboxes (VIEW, CREATE, EDIT, DELETE, APPROVE, EXPORT, PRINT).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Role Name *</Label>
                  <Input
                    placeholder="e.g. Production Supervisor"
                    className="h-8 text-xs font-semibold"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Brief description of responsibilities..."
                    className="h-8 text-xs"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                  />
                </div>
              </div>

              {/* Matrix Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-bold text-muted-foreground">
                      <TableHead className="h-8 w-44">ERP Module</TableHead>
                      <TableHead className="h-8 text-center">VIEW</TableHead>
                      <TableHead className="h-8 text-center">CREATE</TableHead>
                      <TableHead className="h-8 text-center">EDIT</TableHead>
                      <TableHead className="h-8 text-center">DELETE</TableHead>
                      <TableHead className="h-8 text-center">APPROVE</TableHead>
                      <TableHead className="h-8 text-center">EXPORT</TableHead>
                      <TableHead className="h-8 text-center">PRINT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULE_LIST.map((mod) => (
                      <TableRow key={mod.id} className="hover:bg-muted/30">
                        <TableCell className="py-1.5 font-bold text-foreground">{mod.label}</TableCell>
                        {(["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT", "PRINT"] as PermissionAction[]).map((act) => {
                          const supported = mod.actions.includes(act);
                          const permKey = `${mod.id}.${act.toLowerCase()}`;
                          const isChecked = Boolean(rolePermissions[permKey]);

                          return (
                            <TableCell key={act} className="py-1.5 text-center">
                              {supported ? (
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(permKey)}
                                  className="size-4"
                                />
                              ) : (
                                <span className="text-[0.625rem] text-muted-foreground/30">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Special Permissions */}
              <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-lg border border-purple-200 space-y-2">
                <h4 className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1">
                  <Lock className="size-3.5 text-purple-600" /> Special Administrative Overrides
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIAL_PERMISSIONS.map((sp) => (
                    <div key={sp.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={sp.key}
                        checked={Boolean(rolePermissions[sp.key])}
                        onCheckedChange={() => togglePermission(sp.key)}
                      />
                      <label htmlFor={sp.key} className="text-[0.6875rem] font-semibold text-foreground cursor-pointer">
                        {sp.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setRoleEditorOpen(false)} className="h-7 text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveRole} className="h-7 text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                  <Shield className="size-3.5" /> Save Role Matrix
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* DRAWER 1: FULL USER PROFILE & SECURITY PANEL */}
        {/* ========================================================================= */}
        <Sheet open={userProfileOpen} onOpenChange={setUserProfileOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto text-xs space-y-4">
            {selectedUser && (
              <>
                <SheetHeader className="border-b border-border pb-3">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-base font-bold text-foreground">
                      {selectedUser.display_name}
                    </SheetTitle>
                    <Badge className={STATUS_BADGES[selectedUser.status]?.class}>
                      {STATUS_BADGES[selectedUser.status]?.label}
                    </Badge>
                  </div>
                  <SheetDescription className="text-xs font-mono">
                    {selectedUser.email} · Emp ID: {selectedUser.employee_id}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4">
                  {/* Overview Card */}
                  <Card className="border border-border">
                    <CardHeader className="p-3 pb-2 border-b border-border">
                      <CardTitle className="text-xs font-bold text-primary">Overview & Designation</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-1.5 text-xs">
                      <div><strong>Department:</strong> {selectedUser.department}</div>
                      <div><strong>Designation:</strong> {selectedUser.designation}</div>
                      <div><strong>Mobile Contact:</strong> {selectedUser.mobile}</div>
                      <div><strong>Creation Method:</strong> <span className="font-mono text-purple-700 font-bold">{selectedUser.creation_method}</span></div>
                      <div><strong>Approval Status:</strong> <span className="font-mono text-emerald-700 font-bold">{selectedUser.approval_status}</span></div>
                      {selectedUser.approved_by && <div><strong>Approved By:</strong> {selectedUser.approved_by} on {new Date(selectedUser.approved_at || "").toLocaleDateString()}</div>}
                      {selectedUser.rejection_reason && <div className="text-rose-600"><strong>Rejection Reason:</strong> "{selectedUser.rejection_reason}"</div>}
                    </CardContent>
                  </Card>

                  {/* Active Browser Sessions */}
                  <Card className="border border-border">
                    <CardHeader className="p-3 pb-2 border-b border-border flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                        <Laptop className="size-3.5 text-blue-600" /> Active Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                      {sessions.filter((s) => s.user_id === selectedUser.id || s.user_name.includes(selectedUser.first_name)).length === 0 ? (
                        <div className="text-muted-foreground text-center py-2">No active sessions logged for this user.</div>
                      ) : (
                        sessions
                          .filter((s) => s.user_id === selectedUser.id || s.user_name.includes(selectedUser.first_name))
                          .map((s) => (
                            <div key={s.id} className="flex justify-between items-center bg-muted/40 p-2 rounded text-[0.6875rem]">
                              <div>
                                <div className="font-bold text-foreground">{s.device} ({s.browser})</div>
                                <div className="font-mono text-muted-foreground">{s.ip_address}</div>
                                <div className="text-muted-foreground">Logged: {new Date(s.login_time).toLocaleString()}</div>
                              </div>
                              {s.status === "ACTIVE" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => terminateSession(s.id)}
                                  className="h-6 text-[0.625rem] text-rose-600 border-rose-300 hover:bg-rose-50"
                                >
                                  Terminate
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-[0.5625rem] text-slate-500">Terminated</Badge>
                              )}
                            </div>
                          ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppShell>
  );
}
