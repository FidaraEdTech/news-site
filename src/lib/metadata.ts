import type { Metadata } from "next";
import { getCanonicalUrl, SITE_NAME } from "@/lib/site";

export function pageMetadata(title: string, description: string, path: string, absoluteTitle = false): Metadata {
  return {
    // Next 14 drops query parameters on root-path URLs when metadataBase is set.
    // These URLs are already absolute; preserve each category's canonical URL.
    ...(path.includes("?") ? { metadataBase: null } : {}),
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: getCanonicalUrl(path),
      types: {
        "application/rss+xml": getCanonicalUrl("/feed.xml"),
      },
    },
    openGraph: { type: "website", title, description, siteName: SITE_NAME, url: getCanonicalUrl(path) },
    twitter: { card: "summary", title, description },
  };
}
