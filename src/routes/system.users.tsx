import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/system/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — WeaveOne" },
      {
        name: "description",
        content:
          "Review WeaveOne users and their roles: admin, manager, costing executive and viewer permissions.",
      },
      { property: "og:title", content: "Users & Roles — WeaveOne" },
      { property: "og:description", content: "Permission-controlled access to costing and masters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      return { profiles: profiles.data ?? [], roles: roles.data ?? [] };
    },
  });

  return (
    <AppShell title="Users & Roles" breadcrumb={[{ label: "System" }, { label: "Users & Roles" }]}>
      <Card className="gap-0 rounded-sm py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="h-8">Name</TableHead>
                <TableHead className="h-8">Email</TableHead>
                <TableHead className="h-8">Roles</TableHead>
                <TableHead className="h-8 w-44">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.profiles ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="py-1.5 font-medium">{p.full_name ?? "—"}</TableCell>
                  <TableCell className="py-1.5">{p.email ?? "—"}</TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex gap-1">
                      {(data?.roles ?? [])
                        .filter((r) => r.user_id === p.id)
                        .map((r) => (
                          <Badge key={r.id} variant="outline" className="text-[0.625rem] capitalize">
                            {r.role}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="num py-1.5">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">
        Roles are stored separately from profiles and checked server-side, so a role cannot be
        escalated from the browser. New accounts start as costing executives.
      </p>
    </AppShell>
  );
}
