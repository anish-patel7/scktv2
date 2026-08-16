import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Users, CreditCard, AlertTriangle, ShieldCheck, Search, Building, Phone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSales } from "@/hooks/useSales";
import { fmt } from "@/lib/costing";
import { uid, type CustomerItem } from "@/lib/sales-store";

export const Route = createFileRoute("/sales/customers")({
  head: () => ({
    meta: [
      { title: "Customer Directory & Credit Control — SCKT ERP" },
      {
        name: "description",
        content:
          "Customer directory, credit limits, outstanding balances, credit status alerts, payment terms, and broker commission mapping.",
      },
      { property: "og:title", content: "Customers — SCKT ERP" },
      { property: "og:description", content: "Client accounts and credit limit governance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { data, update } = useSales();
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  // Form state
  const [form, setForm] = useState({
    party_name: "",
    gst_no: "",
    city: "Surat",
    contact_person: "",
    mobile: "",
    credit_limit_inr: "1000000",
    broker_name: "Rajeshwar Trading Co.",
    broker_commission_pct: "1.5",
    payment_terms_days: "30",
  });

  // KPI calculations
  const totalOutstanding = data.customers.reduce((sum, c) => sum + c.current_outstanding_inr, 0);
  const creditExceededCount = data.customers.filter((c) => c.current_outstanding_inr > c.credit_limit_inr).length;
  const totalCreditLimit = data.customers.reduce((sum, c) => sum + c.credit_limit_inr, 0);

  const filteredCustomers = data.customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.party_name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.gst_no.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.broker_name.toLowerCase().includes(q)
    );
  });

  const handleOpenCreate = () => {
    setForm({
      party_name: "",
      gst_no: "24AAAA" + Math.floor(1000 + Math.random() * 9000) + "F1Z5",
      city: "Surat",
      contact_person: "",
      mobile: "9825" + Math.floor(100000 + Math.random() * 900000),
      credit_limit_inr: "1000000",
      broker_name: "Rajeshwar Trading Co.",
      broker_commission_pct: "1.5",
      payment_terms_days: "30",
    });
    setOpenCreate(true);
  };

  const handleCreateCustomer = () => {
    if (!form.party_name.trim()) {
      toast.error("Customer Party Name is required");
      return;
    }

    const creditLimit = Number(form.credit_limit_inr) || 0;
    const commPct = Number(form.broker_commission_pct) || 0;
    const terms = Number(form.payment_terms_days) || 30;

    const newCust: CustomerItem = {
      id: uid("cust"),
      code: `CUST-00${data.customers.length + 1}`,
      party_name: form.party_name.trim(),
      gst_no: form.gst_no.trim(),
      city: form.city.trim() || "Surat",
      contact_person: form.contact_person.trim() || "Owner",
      mobile: form.mobile.trim(),
      credit_limit_inr: creditLimit,
      current_outstanding_inr: 0,
      broker_name: form.broker_name.trim() || "Direct",
      broker_commission_pct: commPct,
      payment_terms_days: terms,
      status: "active",
      created_at: new Date().toISOString(),
    };

    update((prev) => ({
      ...prev,
      customers: [newCust, ...prev.customers],
    }));

    toast.success(`Customer ${newCust.party_name} added to directory`);
    setOpenCreate(false);
  };

  return (
    <AppShell
      title="Customer Directory & Credit Control (M32)"
      breadcrumb={[{ label: "Sales" }, { label: "Customers" }]}
      actions={
        <Button size="sm" onClick={handleOpenCreate} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" /> New Customer
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Accounts</span>
                <Users className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{data.customers.length} Accounts</p>
              <span className="text-[0.6875rem] text-muted-foreground">Verified party profiles</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Receivables</span>
                <CreditCard className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">₹{fmt(totalOutstanding, 2)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">Across all customer ledgers</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Credit Exceeded Alerts</span>
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-rose-600">{creditExceededCount} Accounts</p>
              <span className="text-[0.6875rem] text-muted-foreground">Requires credit override</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Credit Sanctioned</span>
                <ShieldCheck className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">₹{fmt(totalCreditLimit, 0)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">Aggregate credit threshold</span>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by Name, Code, GSTIN, City, Broker..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Customer Directory Table */}
        <Card className="rounded-md border border-border">
          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                  <TableHead className="h-8">Code & Name</TableHead>
                  <TableHead className="h-8">GSTIN & City</TableHead>
                  <TableHead className="h-8">Contact & Phone</TableHead>
                  <TableHead className="h-8 text-right">Credit Limit (₹)</TableHead>
                  <TableHead className="h-8 text-right">Outstanding (₹)</TableHead>
                  <TableHead className="h-8 w-32">Credit Usage</TableHead>
                  <TableHead className="h-8">Credit Status</TableHead>
                  <TableHead className="h-8">Broker & Comm %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((cust) => {
                  const utilPct = cust.credit_limit_inr > 0 ? (cust.current_outstanding_inr / cust.credit_limit_inr) * 100 : 0;
                  const isExceeded = cust.current_outstanding_inr > cust.credit_limit_inr;
                  const isNearLimit = utilPct >= 85 && !isExceeded;

                  return (
                    <TableRow key={cust.id} className="hover:bg-muted/40">
                      <TableCell className="py-2">
                        <div className="font-mono font-bold text-primary">{cust.code}</div>
                        <div className="font-semibold text-foreground">{cust.party_name}</div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-mono text-[0.6875rem]">{cust.gst_no}</div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Building className="size-3" /> {cust.city}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div>{cust.contact_person}</div>
                        <div className="text-muted-foreground flex items-center gap-1 font-mono text-[0.6875rem]">
                          <Phone className="size-3" /> {cust.mobile}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono font-bold">
                        ₹{fmt(cust.credit_limit_inr, 0)}
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono font-bold text-foreground">
                        ₹{fmt(cust.current_outstanding_inr, 2)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="space-y-1">
                          <Progress
                            value={Math.min(utilPct, 100)}
                            className={`h-1.5 ${isExceeded ? "[&>div]:bg-rose-600" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
                          />
                          <span className="text-[0.625rem] font-mono text-muted-foreground">
                            {fmt(utilPct, 1)}% Used ({cust.payment_terms_days}d terms)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {isExceeded ? (
                          <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[0.625rem] font-bold">
                            Credit Exceeded
                          </Badge>
                        ) : isNearLimit ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-black text-[0.625rem]">
                            Near Limit
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[0.625rem]">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-medium">{cust.broker_name}</div>
                        <div className="text-[0.6875rem] font-mono text-muted-foreground">
                          {cust.broker_commission_pct}% commission
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredCustomers.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No customers found matching search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* New Customer Entry Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">New Customer Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Party Name *</Label>
              <Input
                className="h-8 text-xs font-semibold"
                value={form.party_name}
                onChange={(e) => setForm({ ...form, party_name: e.target.value })}
                placeholder="e.g. Shree Fabrics Pvt Ltd"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">GSTIN</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={form.gst_no}
                  onChange={(e) => setForm({ ...form, gst_no: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">City</Label>
                <Input
                  className="h-8 text-xs"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Contact Person</Label>
                <Input
                  className="h-8 text-xs"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Mobile Number</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Credit Limit (₹) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  value={form.credit_limit_inr}
                  onChange={(e) => setForm({ ...form, credit_limit_inr: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Payment Terms (Days)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={form.payment_terms_days}
                  onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Broker Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={form.broker_name}
                  onChange={(e) => setForm({ ...form, broker_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Broker Comm %</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={form.broker_commission_pct}
                  onChange={(e) => setForm({ ...form, broker_commission_pct: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateCustomer}>
              Save Customer Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
