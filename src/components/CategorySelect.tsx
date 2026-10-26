"use client";

import { useEffect, useState } from "react";
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [manageMode, setManageMode] = useState(false);

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
    if (editingIndex !== null) {
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 60) return;

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

  const startEditingCategory = (index: number, currentLabel: string) => {
    setEditingIndex(index);
    setEditingValue(currentLabel);
  };

  const saveEditedCategory = (index: number) => {
    const trimmed = editingValue.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 60) {
      setEditingIndex(null);
      return;
    }
    const oldCat = selected[index];
    const normalized = normalizeCategory(trimmed);

    setSelected((prev) => {
      const next = [...prev];
      next[index] = normalized;
      return parseStoryCategories(next.join(", "));
    });

    // Also update in customCategories if applicable
    if (oldCat) {
      const oldSlug = categorySlug(oldCat);
      if (customCategories.some((c) => categorySlug(c) === oldSlug)) {
        saveCustomCategories(
          customCategories.map((c) => (categorySlug(c) === oldSlug ? normalized : c)),
        );
      } else if (!CATEGORIES.some((c) => categorySlug(c) === categorySlug(normalized))) {
        saveCustomCategories([...customCategories, normalized]);
      }
    }

    setEditingIndex(null);
    setEditingValue("");
  };

  const deleteCategoryFromList = (cat: string) => {
    const slug = categorySlug(cat);
    // Remove from story selection as well
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
          {manageMode ? "Done managing categories" : "Edit / Manage categories"}
        </button>
      </div>

      {/* Primary accessible select (also supports Playwright getByLabel('Main category').selectOption) */}
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
        className="editor-input mb-2"
      >
        <option value="" disabled>
          Choose or add a category ({selected.length} selected)
        </option>
        {availableCategories.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {/* Active Categories Assigned to This Story (with Edit & Delete buttons) */}
      <div className="mb-3">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface mb-1.5">
          Assigned to this story ({selected.length}):
        </span>

        {selected.length === 0 ? (
          <p className="text-xs text-muted italic">
            No category selected yet. Pick one or more categories below, or add a new category.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((cat, idx) =>
              editingIndex === idx ? (
                <div
                  key={`${cat}-${idx}`}
                  className="inline-flex items-center gap-1 bg-surface-muted border border-primary rounded px-2 py-1"
                >
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEditedCategory(idx);
                      } else if (e.key === "Escape") {
                        setEditingIndex(null);
                      }
                    }}
                    aria-label={`Edit category ${cat}`}
                    className="text-xs px-1.5 py-0.5 border border-border rounded bg-white text-on-surface w-36"
                  />
                  <button
                    type="button"
                    onClick={() => saveEditedCategory(idx)}
                    className="text-[11px] font-bold text-primary px-1.5 py-0.5 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingIndex(null)}
                    className="text-[11px] text-on-surface px-1 py-0.5 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => startEditingCategory(idx, cat)}
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
              ),
            )}
          </div>
        )}
      </div>

      {/* Multi-Category Quick Toggle Chips */}
      <div className="p-2.5 rounded border border-border bg-surface-muted mb-2.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface mb-2">
          {manageMode
            ? "Click × on any category to delete it from the list:"
            : "Click to add or remove multiple categories for this story:"}
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
                  className={`text-xs font-semibold px-2.5 py-1 border transition-colors cursor-pointer ${
                    manageMode ? "rounded-l" : "rounded"
                  } ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-on-surface border-border hover:border-primary"
                  }`}
                >
                  {active ? `✓ ${cat}` : `+ ${cat}`}
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
        {manageMode && removedDefaults.length > 0 && (
          <button
            type="button"
            onClick={() => saveRemovedDefaults([])}
            className="mt-2 text-[11px] font-bold text-primary underline cursor-pointer"
          >
            Restore deleted default categories ({removedDefaults.length})
          </button>
        )}
      </div>

      {/* Add New Custom Category Input */}
      <div className="flex gap-2 items-center">
        <input
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
          placeholder="Add a new category (e.g. Sports, Education, Energy)..."
          aria-label="New category name"
          className="editor-input text-xs flex-1"
          style={{ marginBottom: 0 }}
        />
        <button
          type="button"
          onClick={handleAddNewCategory}
          disabled={newCategoryInput.trim().length < 2}
          className="button secondary button-compact text-xs flex-shrink-0"
        >
          + Add Category
        </button>
      </div>
    </div>
  );
}
