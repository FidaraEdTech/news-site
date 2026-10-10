import { redirect } from "next/navigation";

import { isAdminEmail, hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function hasDatabaseAdminRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  email?: string | null,
) {
  if (!isAdminEmail(email)) {
    return false;
  }

  const { data, error } = await (supabase as any)
    .from("admin_users")
    .select("email")
    .eq("email", email?.trim().toLowerCase())
    .maybeSingle();

  return !error && Boolean(data);
}

export async function getCurrentAdminSession() {
  if (!hasSupabaseEnv()) {
    return {
      user: null,
      isAdmin: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = await hasDatabaseAdminRow(supabase, user?.email);

  return {
    user,
    isAdmin,
  };
}

export async function requireAdminUser() {
  if (!hasSupabaseEnv()) {
    redirect("/login?error=missing-config");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !(await hasDatabaseAdminRow(supabase, user.email))) {
    redirect("/login?error=admin-required");
  }

  return user;
}
