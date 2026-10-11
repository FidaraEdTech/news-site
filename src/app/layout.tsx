import { CATEGORIES, categorySlug } from "@/lib/categories";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
import "@fontsource-variable/inter";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/newsreader/wght-italic.css";

import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentAdminSession } from "@/lib/auth";
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/site";

import "./globals.css";
import "./newsroom.css";
import { getSiteSettings } from "@/lib/site-settings";
import { validGoogleVerification } from "@/lib/newsletter";

const baseMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large" } },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },

  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const token = settings?.google_site_verification || process.env.GOOGLE_SITE_VERIFICATION || "";
  return { ...baseMetadata, verification: { google: validGoogleVerification(token) ? token : undefined } };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAdmin } = await getCurrentAdminSession();
  const publishedCategories = CATEGORIES.map((label) => ({ label, slug: categorySlug(label) }));

  return (
    <html lang="en" className="light scroll-smooth" data-scroll-behavior="smooth">
      <body className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-white">
        <a className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-primary focus:text-white focus:rounded-lg focus:font-bold" href="#site-content">
          Skip to main content
        </a>
        <Navbar isAdmin={isAdmin} publishedCategories={publishedCategories} />
        <div id="site-content" tabIndex={-1}>
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
