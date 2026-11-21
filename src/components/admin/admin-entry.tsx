import { getAdmin } from "@/lib/admin-auth";
import { env, hasSupabase } from "@/lib/env";
import { AdminApp } from "./admin-app";
import { AdminLogin } from "./admin-login";

export async function AdminEntry({ error }: { error?: string }) {
  const admin = await getAdmin();
  if (!admin) {
    return <AdminLogin mode={hasSupabase ? "supabase" : env.demoAdminPassword ? "demo" : "disabled"} linkError={error === "link"} />;
  }
  return <AdminApp email={admin.email} mode={admin.mode} />;
}
