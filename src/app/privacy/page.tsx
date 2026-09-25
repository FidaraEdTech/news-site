import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Privacy", "How Frontline Daily handles your personal information.", "/privacy");

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
      <h1 className="font-headline text-4xl sm:text-5xl font-black mb-6 leading-tight">Privacy Policy</h1>
      <div className="prose prose-stone max-w-none text-on-surface prose-p:leading-relaxed prose-headings:font-headline prose-headings:tracking-tight">
        <p>
          Frontline Daily collects only the information needed to publish the site,
          receive reader messages, operate comments, measure article performance,
          and protect the newsroom from abuse.
        </p>
        <h2>Information we collect</h2>
        <p>
          If you submit a comment or contact message, we collect the name, email
          address where provided, message content, timestamps, and limited
          technical signals used for spam prevention and rate limiting. We do not
          sell reader contact details.
        </p>
        <h2>How we use information</h2>
        <p>
          We use submitted information to operate reader discussions, respond to
          inquiries, improve editorial services, prevent abuse, and comply with
          legal obligations.
        </p>
        <h2>Data protection rights</h2>
        <p>
          Nigerian readers may request access, correction, or deletion of
          personal information where applicable under Nigerian data protection
          law. Contact the newsroom through the Contact Desk for privacy requests.
        </p>
        <h2>Retention</h2>
        <p>
          Reader submissions and moderation records are retained only as long as
          needed for editorial operations, safety, accountability, and legal
          compliance.
        </p>
        <h2>Third-party services</h2>
        <p>
          The site uses infrastructure providers such as hosting, database,
          storage, email/newsletter, and analytics services. These providers may
          process limited technical data to deliver the service.
        </p>
      </div>
    </div>
  );
}
