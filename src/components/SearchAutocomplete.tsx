"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchSuggestion } from "@/lib/search";

export function SearchAutocomplete({ initialQuery = "", compact = false }: { initialQuery?: string; compact?: boolean }) {
  const id = useId(), router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const focused = useRef(false);
  useEffect(() => { setQuery(initialQuery); setOpen(false); }, [initialQuery]);
  useEffect(() => {
    setSuggestions([]); setActive(-1); setStatus("");
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("Finding suggestions…");
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Suggestions unavailable");
        const result = await response.json();
        if (controller.signal.aborted) return;
        setSuggestions(result.suggestions); setOpen(focused.current);
        setStatus(result.suggestions.length ? `${result.suggestions.length} suggestions available. Use the arrow keys to explore.` : "No suggestions. Press Enter to search all stories.");
      } catch {
        if (!controller.signal.aborted) setStatus("Suggestions unavailable. Press Enter to search all stories.");
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const expanded = open && suggestions.length > 0;
  function choose(suggestion: SearchSuggestion) { setOpen(false); router.push(suggestion.href); }
  return <div className={`search-autocomplete${compact ? " search-autocomplete-compact" : ""}`}>
    <label htmlFor={id} className={compact ? "sr-only" : undefined}>Search stories</label>
    <div className="search-input-wrap">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
      <input id={id} type="search" name="q" value={query} maxLength={120} placeholder="Search headlines, topics, authors…" autoComplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-suggestions`} aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
        onChange={event => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => { focused.current = true; setOpen(true); }} onBlur={() => { focused.current = false; setOpen(false); }}
        onKeyDown={event => {
          if (event.key === "Escape") { setOpen(false); setActive(-1); }
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length) {
            event.preventDefault(); setOpen(true);
            setActive(index => event.key === "ArrowDown" ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length - 1 : index - 1));
          }
          if (event.key === "Enter") {
            if (expanded && active >= 0) { event.preventDefault(); choose(suggestions[active]); }
            else setOpen(false);
          }
        }} />
    </div>
    <ul id={`${id}-suggestions`} role="listbox" aria-label="Search suggestions" className="search-suggestions" hidden={!expanded}>
      {suggestions.map((suggestion, index) => <li key={`${suggestion.kind}:${suggestion.href}`} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(suggestion)} onMouseMove={() => setActive(index)}>
        <span className="suggestion-kind">{suggestion.kind}</span><span>{suggestion.label}</span>
      </li>)}
    </ul>
    <span role="status" className="sr-only">{status}</span>
  </div>;
}
