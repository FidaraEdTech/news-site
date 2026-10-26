"use client";

import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  categorySlug,
  formatStoryCategories,
  normalizeCategory,
  parseStoryCategories,
} from "@/lib/categories";

const CUSTOM_CATEGORIES_STORAGE_KEY = "frontline_custom_categories_v1";
const REMOVED_CATEGORIES_STORAGE_KEY = "frontline_removed_categories_v1";

export function CategorySelect({
  value = "",
  id = "story-category",
}: {
  value?: string;
  id?: string;
}) {
  const initialSelected = parseStoryCategories(value);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [removedDefaults, setRemovedDefaults] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showAddBox, setShowAddBox] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [manageMode, setManageMode] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          setCustomCategories(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
      const savedRemoved = localStorage.getItem(REMOVED_CATEGORIES_STORAGE_KEY);
      if (savedRemoved) {
        const parsed = JSON.parse(savedRemoved);
        if (Array.isArray(parsed)) {
          setRemovedDefaults(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const saveCustomCategories = (next: string[]) => {
    setCustomCategories(next);
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const saveRemovedDefaults = (next: string[]) => {
    setRemovedDefaults(next);
    try {
      localStorage.setItem(REMOVED_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  // Build available category list: active defaults + custom categories + any categories currently on this story
  const availableCategories = (() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const removedSet = new Set(removedDefaults.map((c) => categorySlug(c)));

    for (const cat of CATEGORIES) {
      const slug = categorySlug(cat);
      if (!removedSet.has(slug) && !seen.has(slug)) {
        seen.add(slug);
        list.push(cat);
      }
    }

    for (const cat of [...customCategories, ...selected]) {
      const normalized = normalizeCategory(cat);
      const slug = categorySlug(normalized);
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        list.push(normalized);
      }
    }

    return list;
  })();

  const isSelected = (cat: string) =>
    selected.some((item) => categorySlug(item) === categorySlug(cat));

  const toggleCategory = (cat: string) => {
    const normalized = normalizeCategory(cat);
    const slug = categorySlug(normalized);
    if (!slug) return;

    setSelected((prev) =>
      prev.some((item) => categorySlug(item) === slug)
        ? prev.filter((item) => categorySlug(item) !== slug)
        : [...prev, normalized],
    );
  };

  const removeFromStory = (cat: string) => {
    const slug = categorySlug(cat);
    setSelected((prev) => prev.filter((item) => categorySlug(item) !== slug));
    if (editingCategory && categorySlug(editingCategory) === slug) {
      setEditingCategory(null);
      setEditingValue("");
    }
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 60) {
      addInputRef.current?.focus();
      return;
    }

    const normalized = normalizeCategory(trimmed);
    const slug = categorySlug(normalized);
    if (!slug) return;

    // Un-remove if it was a removed default
    if (removedDefaults.some((c) => categorySlug(c) === slug)) {
      saveRemovedDefaults(removedDefaults.filter((c) => categorySlug(c) !== slug));
    }

    // Add to custom categories if not in defaults
    if (
      !CATEGORIES.some((c) => categorySlug(c) === slug) &&
      !customCategories.some((c) => categorySlug(c) === slug)
    ) {
      saveCustomCategories([...customCategories, normalized]);
    }

    // Add to this story's selected categories
    if (!selected.some((c) => categorySlug(c) === slug)) {
      setSelected((prev) => [...prev, normalized]);
    }

    setNewCategoryInput("");
  };

  const startEditingCategory = (cat: string) => {
    setEditingCategory(cat);
    setEditingValue(cat);
  };

  const saveEditedCategory = (oldCat: string) => {
    const trimmed = editingValue.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 60) {
      setEditingCategory(null);
      return;
    }
    const normalized = normalizeCategory(trimmed);
    const oldSlug = categorySlug(oldCat);
    const newSlug = categorySlug(normalized);

    setSelected((prev) => {
      if (!prev.some((c) => categorySlug(c) === oldSlug)) return prev;
      const next = prev.map((c) => (categorySlug(c) === oldSlug ? normalized : c));
      return parseStoryCategories(next.join(", "));
    });

    // If renaming a default category, mark old default removed and add new to custom
    if (CATEGORIES.some((c) => categorySlug(c) === oldSlug) && oldSlug !== newSlug) {
      if (!removedDefaults.some((c) => categorySlug(c) === oldSlug)) {
        saveRemovedDefaults([...removedDefaults, oldCat]);
      }
    }

    const nextCustom = customCategories.filter((c) => categorySlug(c) !== oldSlug);
    if (
      !CATEGORIES.some((c) => categorySlug(c) === newSlug) &&
      !nextCustom.some((c) => categorySlug(c) === newSlug)
    ) {
      nextCustom.push(normalized);
    }
    saveCustomCategories(nextCustom);

    setEditingCategory(null);
    setEditingValue("");
  };

  const deleteCategoryFromList = (cat: string) => {
    const slug = categorySlug(cat);
    setSelected((prev) => prev.filter((item) => categorySlug(item) !== slug));

    if (customCategories.some((c) => categorySlug(c) === slug)) {
      saveCustomCategories(customCategories.filter((c) => categorySlug(c) !== slug));
    } else if (CATEGORIES.some((c) => categorySlug(c) === slug)) {
      if (!removedDefaults.some((c) => categorySlug(c) === slug)) {
        saveRemovedDefaults([...removedDefaults, cat]);
      }
    }
  };

  const formattedValue = formatStoryCategories(selected);
  const primarySelectValue = selected[0] ?? "";

  return (
    <div className="category-editor-box">
      <input type="hidden" name="category" value={formattedValue} />

      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="editor-label" htmlFor={id} style={{ marginBottom: 0 }}>
          Main category
        </label>
        <button
          type="button"
          onClick={() => setManageMode((prev) => !prev)}
          className="text-[11px] font-bold text-primary underline cursor-pointer"
        >
          {manageMode ? "Done editing category list" : "Edit / Delete categories"}
        </button>
      </div>

      {/* Category Select Dropdown + Plus (+) Icon Button right beside it */}
      <div className="flex items-stretch gap-2 mb-2.5">
        <select
          id={id}
          name="category_picker"
          required={selected.length === 0}
          value={availableCategories.includes(primarySelectValue) ? primarySelectValue : ""}
          onChange={(e) => {
            const picked = e.target.value;
            if (!picked) return;
            setSelected((prev) => {
              if (prev.some((item) => categorySlug(item) === categorySlug(picked))) {
                return prev;
              }
              return [...prev, picked];
            });
          }}
          className="editor-input flex-1"
          style={{ marginBottom: 0 }}
        >
          <option value="" disabled>
            Choose category ({selected.length} selected)
          </option>
          {availableCategories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setShowAddBox(true);
            setTimeout(() => addInputRef.current?.focus(), 20);
          }}
          title="Add a new category"
          aria-label="Add new category"
          className="px-3.5 py-2 rounded border border-primary bg-primary text-white font-bold text-base leading-none flex items-center justify-center gap-1 hover:opacity-90 cursor-pointer flex-shrink-0"
        >
          <span aria-hidden="true" className="text-lg font-black leading-none">+</span>
          <span className="text-xs font-bold uppercase tracking-wider">New</span>
        </button>
      </div>

      {/* Add New Custom Category Input Box (with + button) */}
      {showAddBox && (
        <div className="flex gap-2 items-center mb-3 p-2 rounded border border-border bg-surface-muted">
          <input
            ref={addInputRef}
            type="text"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddNewCategory();
              }
            }}
            maxLength={60}
            placeholder="Type a new category name (e.g. Sports, Education) & click +"
            aria-label="New category name"
            className="editor-input text-xs flex-1 bg-white"
            style={{ marginBottom: 0 }}
          />
          <button
            type="button"
            onClick={handleAddNewCategory}
            disabled={newCategoryInput.trim().length < 2}
            className="px-3 py-2 rounded bg-primary text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center gap-1 flex-shrink-0"
          >
            <span aria-hidden="true" className="text-sm font-black leading-none">+</span>
            <span>Add Category</span>
          </button>
        </div>
      )}

      {/* Active Categories Assigned to This Story (with Edit & Remove buttons) */}
      <div className="mb-3">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface mb-1.5">
          Assigned to this story ({selected.length}):
        </span>

        {selected.length === 0 ? (
          <p className="text-xs text-muted italic">
            No category selected yet. Choose one or more categories below, or add a new category above.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => startEditingCategory(cat)}
                  title={`Rename "${cat}"`}
                  aria-label={`Rename ${cat} category`}
                  className="text-white hover:underline text-xs px-0.5 leading-none cursor-pointer"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => removeFromStory(cat)}
                  title={`Remove "${cat}" from this story`}
                  aria-label={`Remove ${cat} from story`}
                  className="text-white hover:underline font-bold text-sm px-0.5 leading-none cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Inline Rename Box when editing a category */}
      {editingCategory && (
        <div className="mb-3 p-2.5 rounded border border-primary bg-surface-muted flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-on-surface">
            Rename &ldquo;{editingCategory}&rdquo;:
          </span>
          <input
            type="text"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEditedCategory(editingCategory);
              } else if (e.key === "Escape") {
                setEditingCategory(null);
              }
            }}
            aria-label={`Edit category ${editingCategory}`}
            className="editor-input text-xs bg-white flex-1 min-w-[150px]"
            style={{ marginBottom: 0 }}
          />
          <button
            type="button"
            onClick={() => saveEditedCategory(editingCategory)}
            className="px-2.5 py-1 rounded bg-primary text-white text-xs font-bold cursor-pointer"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditingCategory(null)}
            className="px-2 py-1 rounded border border-border bg-white text-on-surface text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Multi-Category Quick Toggle Chips & Edit/Delete Controls */}
      <div className="p-2.5 rounded border border-border bg-surface-muted">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface mb-2">
          {manageMode
            ? "Edit (✎) or Delete (×) any category below:"
            : "Click to assign multiple categories to this story (or click ✎ to rename):"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {availableCategories.map((cat) => {
            const active = isSelected(cat);
            return (
              <div key={cat} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-pressed={active}
                  className={`text-xs font-semibold px-2.5 py-1 border transition-colors cursor-pointer rounded-l ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-on-surface border-border hover:border-primary"
                  }`}
                >
                  {active ? `✓ ${cat}` : `+ ${cat}`}
                </button>
                <button
                  type="button"
                  onClick={() => startEditingCategory(cat)}
                  title={`Rename "${cat}"`}
                  aria-label={`Edit ${cat} category name`}
                  className={`text-xs px-1.5 py-1 bg-white text-on-surface border-y border-r border-border hover:text-primary cursor-pointer ${
                    manageMode ? "" : "rounded-r"
                  }`}
                >
                  ✎
                </button>
                {manageMode && (
                  <button
                    type="button"
                    onClick={() => deleteCategoryFromList(cat)}
                    title={`Delete "${cat}" from category list`}
                    aria-label={`Delete ${cat} from category list`}
                    className="text-xs font-bold px-1.5 py-1 bg-danger-soft text-danger border border-l-0 border-border rounded-r hover:opacity-90 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {removedDefaults.length > 0 && (
          <button
            type="button"
            onClick={() => saveRemovedDefaults([])}
            className="mt-2 text-[11px] font-bold text-primary underline cursor-pointer"
          >
            Restore deleted default categories ({removedDefaults.length})
          </button>
        )}
      </div>
    </div>
  );
}
