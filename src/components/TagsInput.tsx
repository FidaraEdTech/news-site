"use client";

import { parseTags } from "@/lib/categories";

export function TagsInput({ id, helpId, tags = [] }: { id: string; helpId: string; tags?: string[] }) {
  return <input id={id} name="tags" defaultValue={tags.join(", ")} className="editor-input" aria-describedby={helpId}
    onChange={(event) => {
      try { parseTags(event.currentTarget.value); event.currentTarget.setCustomValidity(""); }
      catch { event.currentTarget.setCustomValidity("Use up to 10 comma-separated tags, each no longer than 40 characters."); }
    }} />;
}
