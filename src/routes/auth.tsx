import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { setAuthenticatedUser } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Database,
  Cpu,
  Users,
  HelpCircle,
  LayoutGrid,
  Sparkles,
  BarChart3,
  Package,
  Truck,
  Palette,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Chehar Krupa Group of Industries" },
      {
        name: "description",
        content: "Sign in to Chehar Krupa Group of Industries Textile Production & Management System.",
      },
      { property: "og:title", content: "Chehar Krupa Group — Textile Production System" },
      {
        property: "og:description",
        content: "Integrated platform for managing textile production, costing, inventory, quality, sales and business operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { roles, registerUserRequest } = useUserRoles();

  // Active View State: "signin" | "request"
  const [activeTab, setActiveTab] = useState<"signin" | "request">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  // Sign In State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Self Registration Request State
  const [reqFirstName, setReqFirstName] = useState("");
  const [reqLastName, setReqLastName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqMobile, setReqMobile] = useState("");
  const [reqEmployeeId, setReqEmployeeId] = useState("");
  const [reqDepartment, setReqDepartment] = useState("Production");
  const [reqDesignation, setReqDesignation] = useState("");
  const [reqRoleId, setReqRoleId] = useState("role-production-mgr");
  const [reqReason, setReqReason] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const signIn = async () => {
    if (!email || !password) {
      toast.error("Please enter email address and password");
      return;
    }

    if (password !== "Aug@2026" && password !== "Aug2026") {
      toast.error("Authentication failed: Invalid credentials.");
      return;
    }

    setBusy(true);

    const normEmail = email.trim().toLowerCase();
    if (normEmail === "admin@sckt.com" || normEmail === "admin@weaveone.com" || normEmail.includes("admin")) {
      setAuthenticatedUser("admin@sckt.com");
      toast.success("Signed in successfully as Chehar Krupa Admin!");
      setBusy(false);
      navigate({ to: "/" });
      return;
    } else if (normEmail === "user@sckt.com" || normEmail === "user@weaveone.com" || normEmail.includes("user")) {
      setAuthenticatedUser("user@sckt.com");
      toast.success("Signed in successfully as Standard User!");
      setBusy(false);
      navigate({ to: "/" });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error(`Authentication failed: ${error.message}`);
        return;
      }
      if (data?.session) {
        toast.success("Signed in successfully!");
        navigate({ to: "/" });
      }
    } catch (err: any) {
      setBusy(false);
      toast.error(`Auth failed: ${err?.message || "Invalid credentials"}`);
    }
  };

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqFirstName || !reqLastName || !reqEmail || !reqMobile || !reqEmployeeId || !reqReason) {
      toast.error("Please fill in all mandatory registration fields.");
      return;
    }

    const result = registerUserRequest({
      first_name: reqFirstName,
      last_name: reqLastName,
      email: reqEmail,
      mobile: reqMobile,
      employee_id: reqEmployeeId,
      department: reqDepartment,
      designation: reqDesignation || "Employee",
      requested_role_id: reqRoleId,
      request_reason: reqReason,
    });

    if (result) {
      setSubmittedSuccess(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1829] font-sans antialiased text-white selection:bg-[#c9a84e]/30">
      <div className="flex flex-1 flex-col lg:flex-row min-h-0">
        {/* ========================================================================= */}
        {/* LEFT PANEL (50% Width, Dark Navy Blue Theme) */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-1/2 relative bg-[#0d1829] overflow-hidden flex flex-col justify-between p-8 lg:p-14 border-b lg:border-b-0 border-[#1c2c44]">
          {/* Unsplash Factory/Textile Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-15"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1829]/95 via-[#0d1829]/85 to-[#0d1829]/92 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Logo Header Row */}
            <div className="flex items-center gap-5 mb-8">
              <img
                src="/ck-logo.png"
                alt="Chehar Krupa"
                className="w-32 lg:w-36 h-auto object-contain filter drop-shadow-md"
              />
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-[#d5aa4d] tracking-[3px] leading-tight pb-1 border-b-[2.5px] border-[#d5aa4d] whitespace-nowrap">
                  CHEHAR KRUPA
                </div>
                <div className="text-xs lg:text-sm font-medium text-white tracking-[7px] pt-1.5 text-center whitespace-nowrap">
                  GROUP OF INDUSTRIES
                </div>
              </div>
            </div>

            {/* Main Title */}
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white leading-tight tracking-wider text-center lg:text-left">
              TEXTILE PRODUCTION <br />
              <span className="text-[#c9a84e] font-bold block mt-1">
                & MANAGEMENT SYSTEM
              </span>
            </h1>

            <div className="w-14 h-1 bg-[#c9a84e] my-6" />

            <p className="text-sm lg:text-base text-white/70 leading-relaxed max-w-xl">
              Integrated platform for managing textile production, costing, inventory, quality, sales and business operations.
            </p>

            {/* Feature 2x3 Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-lg pt-4">
              <div className="flex items-center gap-3.5">
                <div className="size-11 min-w-[44px] rounded-xl bg-[#c9a84e]/10 border border-[#c9a84e]/25 flex items-center justify-center">
                  <LayoutGrid className="size-5 text-[#c9a84e]" />
                </div>
                <span className="text-xs font-medium text-white/90">Production Management</span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="size-11 min-w-[44px] rounded-xl bg-[#c9a84e]/10 border border-[#c9a84e]/25 flex items-center justify-center">
                  <ShieldCheck className="size-5 text-[#c9a84e]" />
                </div>
                <span className="text-xs font-medium text-white/90">Quality Control</span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="size-11 min-w-[44px] rounded-xl bg-[#c9a84e]/10 border border-[#c9a84e]/25 flex items-center justify-center">
                  <Palette className="size-5 text-[#c9a84e]" />
                </div>
                <span className="text-xs font-medium text-white/90">Design & Costing</span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="size-11 min-w-[44px] rounded-xl bg-[#c9a84e]/10 border border-[#c9a84e]/25 flex items-center justify-center">
                  <Truck className="size-5 text-[#c9a84e]" />
                </div>
                <span className="text-xs font-medium text-white/90">Sales & Dispatch</span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="size-11 min-w-[44px] rounded-xl bg-[#c9a84e]/10 border border-[#c9a84e]/25 flex items-center justify-center">
                  <Package className="size-5 text-[#c9a84e]" />
                </div>
                <span className="text-xs font-medium text-white/90">Inventory Management</span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="size-11 min-w-[44px] rounded-xl bg-[#c9a84e]/10 border border-[#c9a84e]/25 flex items-center justify-center">
                  <BarChart3 className="size-5 text-[#c9a84e]" />
                </div>
                <span className="text-xs font-medium text-white/90">Reports & Analytics</span>
              </div>
            </div>
          </div>

          {/* Left Footer Security Tag */}
          <div className="relative z-10 pt-8 border-t border-white/10 mt-8 text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#c9a84e] tracking-[2.5px] uppercase">
              <Lock className="size-4" /> Internal Use Only
            </div>
            <p className="text-xs text-white/40 font-mono">
              © 2024 Chehar Krupa Group of Industries. All rights reserved.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL (50% Width, Light Soft Blue/Grey Card Overlay Theme) */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-1/2 relative bg-[#d8dbe1] flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-5"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#dcdfdf]/95 to-[#d2d5dc]/98 pointer-events-none" />

          {/* Login Card */}
          <div className="relative z-10 w-full max-w-[424px] bg-white rounded-[18px] p-8 lg:p-9 shadow-2xl border border-white/50 space-y-5 my-auto">
            {/* Card Logo Row */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/ck-logo.png"
                alt="Chehar Krupa"
                className="w-20 h-auto object-contain"
              />
              <div>
                <div className="text-lg font-extrabold text-[#1a2a3e] tracking-[1.5px] pb-0.5 border-b border-[#1a2a3e] whitespace-nowrap">
                  CHEHAR KRUPA
                </div>
                <div className="text-[0.5625rem] font-medium text-[#1a2a3e] tracking-[4px] pt-1 text-center whitespace-nowrap">
                  GROUP OF INDUSTRIES
                </div>
              </div>
            </div>

            <h2 className="text-center text-xs font-bold text-[#1a2a3e] tracking-[2.5px] uppercase">
              Textile Production System
            </h2>
            <div className="w-16 h-[2.5px] bg-[#c9a84e] mx-auto my-3" />

            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#1a2a3e]">
                {activeTab === "signin" ? "Welcome Back" : "Request Access"}
              </h3>
              <p className="text-xs text-[#8a8f9c] mt-0.5">
                {activeTab === "signin"
                  ? "Sign in to the Textile Production System"
                  : "Submit details for Admin authorization"}
              </p>
            </div>

            {/* TAB 1: SIGN IN VIEW */}
            {activeTab === "signin" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  signIn();
                }}
                className="space-y-4 pt-2"
              >
                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="block text-xs font-medium text-[#2a3040]">
                    Email Address
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#a0a6b2]" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="Enter your email address"
                      className="pl-10 h-11 text-xs border-[#e2e4ea] bg-[#f7f8fa] text-[#1a2a3e] rounded-xl focus:border-[#1a7d6a] focus:ring-[#1a7d6a]/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="block text-xs font-medium text-[#2a3040]">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#a0a6b2]" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-11 text-xs border-[#e2e4ea] bg-[#f7f8fa] text-[#1a2a3e] rounded-xl focus:border-[#1a7d6a] focus:ring-[#1a7d6a]/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a0a6b2] hover:text-[#1a2a3e]"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-11 bg-gradient-to-r from-[#1a7d6a] to-[#14695a] hover:opacity-95 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md mt-4"
                >
                  <span>{busy ? "Signing in..." : "Sign In"}</span>
                  <ArrowRight className="size-4" />
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#e2e4ea]" />
                  <span className="text-xs text-[#a0a6b2]">or</span>
                  <div className="flex-1 h-px bg-[#e2e4ea]" />
                </div>

                {/* Footer Quick Links */}
                <div className="flex items-center justify-center gap-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-[#1a7d6a] hover:underline flex items-center gap-1.5 px-3 py-1"
                  >
                    <Lock className="size-3.5 text-[#1a7d6a]" />
                    Forgot Password?
                  </button>
                  <div className="w-px h-4 bg-[#dfe1e6]" />
                  <button
                    type="button"
                    onClick={() => setActiveTab("request")}
                    className="text-[#1a7d6a] hover:underline flex items-center gap-1.5 px-3 py-1 font-semibold"
                  >
                    <UserPlus className="size-3.5 text-[#1a7d6a]" />
                    Request Access
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REQUEST ACCESS VIEW (WORKFLOW B) */}
            {activeTab === "request" && (
              <div className="space-y-4 pt-2">
                {submittedSuccess ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2 text-center">
                    <div className="flex justify-center text-amber-600">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <h3 className="font-bold text-amber-900 text-sm">Access Request Submitted!</h3>
                    <p className="text-xs text-amber-800">
                      Your registration request is currently <span className="font-bold underline">PENDING APPROVAL</span> by an authorized System Admin.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSubmittedSuccess(false);
                        setActiveTab("signin");
                      }}
                      className="mt-2 text-xs bg-[#1a7d6a] text-white rounded-lg"
                    >
                      Return to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRequestAccess} className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-[#2a3040]">First Name *</Label>
                        <Input
                          required
                          placeholder="First Name"
                          className="h-9 text-xs bg-[#f7f8fa]"
                          value={reqFirstName}
                          onChange={(e) => setReqFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-[#2a3040]">Last Name *</Label>
                        <Input
                          required
                          placeholder="Last Name"
                          className="h-9 text-xs bg-[#f7f8fa]"
                          value={reqLastName}
                          onChange={(e) => setReqLastName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#2a3040]">Email Address *</Label>
                      <Input
                        required
                        type="email"
                        placeholder="name@sckt.com"
                        className="h-9 text-xs font-mono bg-[#f7f8fa]"
                        value={reqEmail}
                        onChange={(e) => setReqEmail(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-[#2a3040]">Mobile Number *</Label>
                        <Input
                          required
                          placeholder="+91 98765 43210"
                          className="h-9 text-xs font-mono bg-[#f7f8fa]"
                          value={reqMobile}
                          onChange={(e) => setReqMobile(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-[#2a3040]">Employee ID *</Label>
                        <Input
                          required
                          placeholder="EMP-104"
                          className="h-9 text-xs font-mono bg-[#f7f8fa]"
                          value={reqEmployeeId}
                          onChange={(e) => setReqEmployeeId(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-[#2a3040]">Department *</Label>
                        <Select value={reqDepartment} onValueChange={setReqDepartment}>
                          <SelectTrigger className="h-9 text-xs bg-[#f7f8fa]">
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
                        <Label className="text-xs font-medium text-[#2a3040]">Requested Role *</Label>
                        <Select value={reqRoleId} onValueChange={setReqRoleId}>
                          <SelectTrigger className="h-9 text-xs bg-[#f7f8fa]">
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
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#2a3040]">Reason for Access *</Label>
                      <Textarea
                        required
                        placeholder="Specify operational responsibilities requiring access..."
                        className="text-xs min-h-[50px] resize-none bg-[#f7f8fa]"
                        value={reqReason}
                        onChange={(e) => setReqReason(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("signin")}
                        className="h-9 text-xs flex-1 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="h-9 bg-[#1a7d6a] hover:bg-[#14695a] text-white font-semibold text-xs flex-1 gap-1.5 rounded-xl"
                      >
                        <UserPlus className="size-3.5" /> Submit Request
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM FEATURE BAR (4 Columns, Pure White with Divider Borders) */}
      {/* ========================================================================= */}
      <div className="bg-white border-t border-[#e8eaee] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3.5 p-5 lg:px-7 border-b sm:border-b-0 sm:border-r border-[#eaecf0]">
          <ShieldCheck className="size-9 text-[#1a7d6a] shrink-0" strokeWidth={1.4} />
          <div>
            <div className="text-sm font-semibold text-[#1a2a3e]">Secure & Reliable</div>
            <div className="text-xs text-[#8a8f9c]">Enterprise Grade Security</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-5 lg:px-7 border-b sm:border-b-0 lg:border-r border-[#eaecf0]">
          <Database className="size-9 text-[#c9a84e] shrink-0" strokeWidth={1.4} />
          <div>
            <div className="text-sm font-semibold text-[#1a2a3e]">Real-time Data</div>
            <div className="text-xs text-[#8a8f9c]">Accurate & Up-to-date</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-5 lg:px-7 border-b sm:border-b-0 sm:border-r border-[#eaecf0]">
          <Cpu className="size-9 text-[#1a7d6a] shrink-0" strokeWidth={1.4} />
          <div>
            <div className="text-sm font-semibold text-[#1a2a3e]">Integrated Operations</div>
            <div className="text-xs text-[#8a8f9c]">End-to-End Automation</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-5 lg:px-7">
          <Users className="size-9 text-[#c9a84e] shrink-0" strokeWidth={1.4} />
          <div>
            <div className="text-sm font-semibold text-[#1a2a3e]">Built for Performance</div>
            <div className="text-xs text-[#8a8f9c]">Scalable & Efficient</div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-sm text-xs space-y-3">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-[#1a7d6a]">
              <HelpCircle className="size-4" /> Password Recovery Assistance
            </DialogTitle>
            <DialogDescription className="text-xs">
              Contact your System Administrator or submit a support request.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-800">
            <p>
              To reset your password, please contact the <strong>Chehar Krupa Group IT Admin</strong> or your department manager.
            </p>
            <div className="font-mono text-[0.6875rem] bg-white p-2 rounded border border-slate-200">
              Admin Contact: <span className="font-bold text-[#1a7d6a]">admin@sckt.com</span>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setForgotModalOpen(false)} className="h-8 text-xs bg-[#1a7d6a] text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
