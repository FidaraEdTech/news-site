export function searchTerms(value: string): string[] {
  return (value.slice(0, 120).match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
}

// Only letters/numbers reach to_tsquery; operators from reader input are never evaluated.
export function prefixSearchQuery(value: string): string {
  return searchTerms(value).map(term => `${term}:*`).join(" & ");
}

export type SearchSuggestion = { label: string; href: string; kind: "Category" | "Story" | "Author" };
