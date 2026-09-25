import Link from "next/link";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function fetchSiteSettings() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("site_settings").select("*").single();

  if (error) {
    return null;
  }

  return data as any;
}

export async function SiteFooter() {
  const settings = await fetchSiteSettings();

  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 mt-16 md:mt-20 bg-zinc-100 dark:bg-zinc-950">
      <div className="w-full px-5 sm:px-8 py-10 md:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 max-w-7xl mx-auto">
        <div className="md:col-span-1">
          <div className="mb-6">
            <svg viewBox="0 0 400 40" className="h-6 md:h-7 w-full max-w-[260px] text-primary" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="50%" dominantBaseline="central" textAnchor="start" className="font-headline font-black italic fill-current tracking-tight" fontSize="38">
                <tspan className="text-red-900 dark:text-red-600">FRONTLINE</tspan>{' '}
                <tspan className="text-red-800 dark:text-red-500">DAILY</tspan>
              </text>
            </svg>
          </div>
          <p className="font-sans text-xs uppercase tracking-widest text-zinc-600 leading-loose mb-4">
            Setting the agenda for the global conversation through rigorous reporting and fearless analysis.
          </p>
          <div className="flex gap-4 mt-6">
            {settings?.social_twitter && (
              <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors">
                X
              </a>
            )}
            {settings?.social_linkedin && (
              <a href={settings.social_linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors">
                In
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-sans text-xs font-black text-red-900 dark:text-red-500 uppercase tracking-widest mb-6">The Newsroom</h4>
          <ul className="flex flex-col gap-3 font-sans text-xs uppercase tracking-widest">
            <li><Link className="text-zinc-600 dark:text-zinc-400 hover:text-red-700" href="/about">About Us</Link></li>
            <li><Link className="text-zinc-600 dark:text-zinc-400 hover:text-red-700" href="/editorial-standards">Ethics Code</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-sans text-xs font-black text-red-900 dark:text-red-500 uppercase tracking-widest mb-6">Network</h4>
          <ul className="flex flex-col gap-3 font-sans text-xs uppercase tracking-widest">
            <li><Link className="text-zinc-600 dark:text-zinc-400 hover:text-red-700" href="/#archive">The Archive</Link></li>
            <li><Link className="text-zinc-600 dark:text-zinc-400 hover:text-red-700" href="/contact">Contact Desk</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-sans text-xs font-black text-red-900 dark:text-red-500 uppercase tracking-widest mb-6">Legal</h4>
          <ul className="flex flex-col gap-3 font-sans text-xs uppercase tracking-widest">
            <li><Link className="text-zinc-600 dark:text-zinc-400 hover:text-red-700" href="/privacy">Privacy Policy</Link></li>
            <li><Link className="text-zinc-600 dark:text-zinc-400 hover:text-red-700" href="/terms">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="w-full px-5 sm:px-8 py-6 md:py-8 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="font-sans text-[11px] sm:text-xs uppercase tracking-widest text-zinc-600 leading-relaxed">Copyright {new Date().getFullYear()} Frontline Daily. Independent Journalism for the Digital Age.</p>
      </div>
    </footer>
  );
}
