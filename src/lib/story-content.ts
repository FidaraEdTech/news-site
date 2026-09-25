import sanitizeHtml from "sanitize-html";

export function sanitizeStoryHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "small", "h2", "h3", "blockquote", "ul", "ol", "li", "a", "hr"],
    allowedAttributes: { a: ["href", "title", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}

export function plainTextToHtml(value: string): string {
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return escaped.split(/\r?\n\s*\r?\n/).map((paragraph) => `<p>${paragraph.replace(/\r?\n/g, "<br>")}</p>`).join("");
}

export function storyHtml(value: string, format?: string): string {
  return format === "html" ? sanitizeStoryHtml(value) : plainTextToHtml(value);
}

export function storyText(value: string): string {
  return sanitizeHtml(value.replace(/<[^>]+>/g, " "), { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, " ").trim();
}
