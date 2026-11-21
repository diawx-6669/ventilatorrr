import { getAdmin } from "@/lib/admin-auth";
import { env, hasSupabase } from "@/lib/env";
import { AdminApp } from "@/components/admin/admin-app";
import { AdminLogin } from "@/components/admin/admin-login";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await getAdmin();
  const { error } = await searchParams;
  if (!admin) {
    return <AdminLogin mode={hasSupabase ? "supabase" : env.demoAdminPassword ? "demo" : "disabled"} linkError={error === "link"} />;
  }
  return <AdminApp email={admin.email} mode={admin.mode} />;
}
