import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("About", "Meet Frontline Daily and learn about our independent public-interest journalism.", "/about");
import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <div className="bg-surface min-h-screen text-on-surface">
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-8 flex flex-col gap-8">
             <div className="border-l-4 border-primary pl-5 sm:pl-8 mb-4 sm:mb-8">
               <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-4 text-on-surface">
                  The Newsroom Desk
               </h1>
               <div className="text-on-surface-variant text-sm sm:text-xl uppercase tracking-widest font-bold font-sans leading-relaxed">
                  Independent Digital Journalism
               </div>
             </div>

             <article className="prose prose-stone max-w-none prose-lg">
                <p className="font-headline text-xl sm:text-2xl italic text-on-surface leading-relaxed border-b border-outline-variant/30 pb-6 sm:pb-8">
                   Frontline Daily is an independent digital publication focused on public affairs, accountability, business, technology, and culture.
                </p>
                <section aria-labelledby="about-author-title" className="mt-8">
                  <h2 id="about-author-title" className="font-headline text-3xl font-bold mb-5">About the author</h2>
                  <div className="text-on-surface text-base sm:text-lg font-body leading-relaxed sm:leading-loose whitespace-pre-wrap break-words">
                   {settings?.author_bio || "The newsroom focuses on verified reporting, clear analysis, and accountable public-interest journalism for global readers."}
                  </div>
                </section>

                <div className="mt-10 sm:mt-16 bg-surface-muted p-5 sm:p-8 rounded-lg border-l-4 border-border">
                  <h3 className="font-bold uppercase tracking-widest text-sm text-primary mb-4">What This Publication Covers</h3>
                  <ul className="list-disc pl-5 space-y-2 text-on-surface-variant font-medium">
                    <li>Public-interest reporting and accountability</li>
                    <li>Nigerian politics, governance, and institutions</li>
                    <li>Business, technology, and infrastructure</li>
                    <li>Culture, society, and information ecosystems</li>
                    <li>Corrections, transparency, and reader accountability</li>
                  </ul>
                </div>
             </article>
          </div>

          <aside className="lg:col-span-4 flex flex-col gap-8 lg:gap-10">
             <div className="border-b-2 border-primary w-24 mb-4"></div>
             <h3 className="font-headline text-2xl font-bold uppercase tracking-tight italic">Contact & Network</h3>
             
             <div className="flex flex-col gap-6">
                {settings?.social_twitter && (
                  <a href={settings.social_twitter} className="flex items-center gap-4 group">
                     <span className="w-12 h-12 bg-surface-muted flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">XP</span>
                     <div>
                       <div className="font-bold text-sm uppercase tracking-widest group-hover:text-primary transition-colors">Follow on X</div>
                       <div className="text-xs text-muted">Real-time updates</div>
                     </div>
                  </a>
                )}
                {settings?.social_linkedin && (
                  <a href={settings.social_linkedin} className="flex items-center gap-4 group">
                     <span className="w-12 h-12 bg-surface-muted flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">In</span>
                     <div>
                       <div className="font-bold text-sm uppercase tracking-widest group-hover:text-primary transition-colors">Professional Network</div>
                       <div className="text-xs text-muted">LinkedIn</div>
                     </div>
                  </a>
                )}
                <Link href="/contact" className="flex items-center gap-4 group mt-4">
                   <span className="w-12 h-12 bg-primary text-white flex items-center justify-center font-bold">@</span>
                   <div>
                     <div className="font-bold text-sm uppercase tracking-widest text-primary">Get In Touch</div>
                       <div className="text-xs text-muted">Contact Desk</div>
                   </div>
                </Link>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
