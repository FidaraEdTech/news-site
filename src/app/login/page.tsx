import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import { AuthForm } from "@/components/AuthForm";
import { signInAction } from "./actions";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const loginMessages: Record<string, string> = {
  "admin-email-mismatch": "This app only allows the configured newsroom admin email to sign in.",
  "admin-required": "Sign in with the newsroom admin account to reach the dashboard.",
  "invalid-credentials": "Your Supabase email or password was not accepted.",
  "missing-config": "Set the Supabase URL, anon key, and newsroom admin email before signing in.",
  "missing-credentials": "Enter both your email and password to continue.",
  "signed-out": "You have been signed out.",
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorCode = readParam(searchParams?.error);
  const noticeCode = readParam(searchParams?.notice);
  const messageCode = errorCode ?? noticeCode;
  const message = messageCode ? loginMessages[messageCode] : undefined;

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-surface-strong p-8 md:p-20 flex flex-col justify-between border-r border-border min-h-[40vh] md:min-h-screen">
          <div className="brand">
             <span className="font-bold text-[10px] tracking-widest uppercase text-muted">Frontline Daily</span>
          </div>

          <div className="hero-text my-auto">
             <h1 className="font-headline text-5xl md:text-7xl font-black leading-none mb-6">
                 Staff<br/><span className="text-primary italic">Sign-in</span>
             </h1>
             <div className="w-16 h-2 bg-primary mb-6"></div>
             <p className="max-w-sm text-lg text-muted font-medium leading-relaxed">
                 Authorized newsroom staff can sign in to manage publishing and site operations.
             </p>
          </div>
          
          <div className="footer-note hidden md:block">
             <p className="text-xs text-muted opacity-50 uppercase tracking-widest font-bold">Authorized Staff Only</p>
          </div>
      </div>
      
      <div className="md:w-1/2 bg-white p-8 md:p-20 flex items-center justify-center min-h-[60vh] md:min-h-screen">
         <div className="w-full max-w-md">
             <div className="mb-12">
                <span className="bg-surface-muted text-primary text-[10px] uppercase tracking-widest font-bold px-3 py-1 mb-4 inline-block border border-border">Newsroom Dashboard</span>
                <h2 className="font-headline text-3xl font-bold">Staff Login</h2>
             </div>
             
             <AuthForm
               action={signInAction}
               message={message}
               messageTone={errorCode ? "error" : "success"}
             />
         </div>
      </div>
    </div>
  );
}
