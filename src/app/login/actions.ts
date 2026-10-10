"use server";

import { redirect } from "next/navigation";

import {
  getNewsroomAdminEmail,
  hasSupabaseEnv,
  normalizeEmail,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/login?error=missing-config");
  }

  const email = normalizeEmail(formData.get("email")?.toString());
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    redirect("/login?error=missing-credentials");
  }

  if (email !== getNewsroomAdminEmail()) {
    redirect("/login?error=admin-email-mismatch");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  redirect("/dashboard");
}
