import { AdminRoot } from "@/components/admin/admin-root";

/**
 * A static page on purpose: it works on GitHub Pages too. Everything happens in the browser,
 * and every action is checked by the database (or by /api/admin in demo mode).
 */
export default function AdminPage() {
  return <AdminRoot />;
}
