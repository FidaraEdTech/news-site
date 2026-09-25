import { CATEGORIES, isMainCategory, normalizeCategory } from "@/lib/categories";

export function CategorySelect({ value = "", id = "story-category" }: { value?: string; id?: string }) {
  const category = normalizeCategory(value);
  return <div>
    <label className="editor-label" htmlFor={id}>Main category</label>
    <select id={id} name="category" required defaultValue={isMainCategory(category) ? category : ""} className="editor-input">
      <option value="" disabled>Choose a category</option>
      {CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}
    </select>
    {value && !isMainCategory(category) && <p className="editor-help-text">Previously “{value}”. Choose a main category and keep the original topic as a tag if appropriate.</p>}
  </div>;
}
