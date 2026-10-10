import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdminUser();

  const supabase = await createSupabaseServerClient();
  const { data: settings, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  if (error || !settings) {
    return <div role="alert" className="notice notice-error">Website settings could not be loaded. Refresh the page before editing so your existing profile is preserved.</div>;
  }

  return (
    <div className="max-w-3xl w-full mx-auto">
       <SettingsForm settings={settings} />
    </div>
  );
}
