"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  CATEGORIES,
  categorySlug,
  formatStoryCategories,
  normalizeCategory,
  parseStoryCategories,
} from "@/lib/categories";
import {
  deleteCategoryAcrossStoriesAction,
  renameCategoryAcrossStoriesAction,
  updateStoryCategoriesAction,
} from "@/app/dashboard/actions";

const CUSTOM_CATEGORIES_STORAGE_KEY = "frontline_custom_categories_v1";
const REMOVED_CATEGORIES_STORAGE_KEY = "frontline_removed_categories_v1";

export type CategoryStoryItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  story_type?: string;
  updated_at: string;
};

export function CategoriesManagerClient({
  initialStories,
  compact = false,
}: {
  initialStories: CategoryStoryItem[];
  compact?: boolean;
}) {
  const [stories, setStories] = useState<CategoryStoryItem[]>(initialStories);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [removedDefaults, setRemovedDefaults] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customPerStoryInput, setCustomPerStoryInput] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

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
      // Ignore storage errors
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

  // Build master list of categories from defaults + custom + stories
  const allCategories = (() => {
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

    for (const cat of customCategories) {
      const normalized = normalizeCategory(cat);
      const slug = categorySlug(normalized);
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        list.push(normalized);
      }
    }

    for (const story of stories) {
      for (const cat of parseStoryCategories(story.category)) {
        const normalized = normalizeCategory(cat);
        const slug = categorySlug(normalized);
        if (slug && !seen.has(slug)) {
          seen.add(slug);
          list.push(normalized);
        }
      }
    }

    return list;
  })();

  const countStoriesForCategory = (cat: string) => {
    const targetSlug = categorySlug(cat);
    return stories.filter((story) =>
      parseStoryCategories(story.category).some((c) => categorySlug(c) === targetSlug),
    ).length;
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 60) {
      setStatusMessage({
        type: "error",
        text: "Category name must be between 2 and 60 characters.",
      });
      return;
    }

    const normalized = normalizeCategory(trimmed);
    const slug = categorySlug(normalized);

    if (removedDefaults.some((c) => categorySlug(c) === slug)) {
      saveRemovedDefaults(removedDefaults.filter((c) => categorySlug(c) !== slug));
    }

    if (
      !CATEGORIES.some((c) => categorySlug(c) === slug) &&
      !customCategories.some((c) => categorySlug(c) === slug)
    ) {
      saveCustomCategories([...customCategories, normalized]);
    }

    setNewCategoryName("");
    setStatusMessage({
      type: "success",
      text: `Added category "${normalized}". It is now available in the category list and story editor.`,
    });
  };

  const handleRenameCategory = (oldCat: string) => {
    const trimmed = renameInput.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 60) {
      setStatusMessage({
        type: "error",
        text: "New category name must be between 2 and 60 characters.",
      });
      return;
    }

    const normalizedNew = normalizeCategory(trimmed);
    const oldSlug = categorySlug(oldCat);
    const newSlug = categorySlug(normalizedNew);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("old_category", oldCat);
      formData.set("new_category", normalizedNew);

      const res = await renameCategoryAcrossStoriesAction(formData);
      if (!res.ok) {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to rename category.",
        });
        return;
      }

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
        nextCustom.push(normalizedNew);
      }
      saveCustomCategories(nextCustom);

      setStories((prev) =>
        prev.map((story) => {
          const cats = parseStoryCategories(story.category);
          if (!cats.some((c) => categorySlug(c) === oldSlug)) return story;
          const updated = cats.map((c) => (categorySlug(c) === oldSlug ? normalizedNew : c));
          return { ...story, category: formatStoryCategories(updated) };
        }),
      );

      setRenamingCategory(null);
      setRenameInput("");
      setStatusMessage({
        type: "success",
        text: `Renamed "${oldCat}" to "${normalizedNew}" (${res.updatedCount ?? 0} stories updated).`,
      });
    });
  };

  const handleDeleteCategory = (cat: string) => {
    const targetSlug = categorySlug(cat);
    const fallback =
      allCategories.find((c) => categorySlug(c) !== targetSlug) ?? "Public Affairs";

    startTransition(async () => {
      const formData = new FormData();
      formData.set("target_category", cat);
      formData.set("fallback_category", fallback);

      const res = await deleteCategoryAcrossStoriesAction(formData);
      if (!res.ok) {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to delete category.",
        });
        return;
      }

      if (customCategories.some((c) => categorySlug(c) === targetSlug)) {
        saveCustomCategories(customCategories.filter((c) => categorySlug(c) !== targetSlug));
      }
      if (CATEGORIES.some((c) => categorySlug(c) === targetSlug)) {
        if (!removedDefaults.some((c) => categorySlug(c) === targetSlug)) {
          saveRemovedDefaults([...removedDefaults, cat]);
        }
      }

      setStories((prev) =>
        prev.map((story) => {
          const cats = parseStoryCategories(story.category);
          if (!cats.some((c) => categorySlug(c) === targetSlug)) return story;
          const remaining = cats.filter((c) => categorySlug(c) !== targetSlug);
          const nextCats = remaining.length > 0 ? remaining : [fallback];
          return { ...story, category: formatStoryCategories(nextCats) };
        }),
      );

      if (selectedFilter === targetSlug) {
        setSelectedFilter("all");
      }

      setStatusMessage({
        type: "success",
        text: `Deleted category "${cat}" (${res.updatedCount ?? 0} stories updated).`,
      });
    });
  };

  const handleToggleStoryCategory = (story: CategoryStoryItem, cat: string) => {
    const currentCats = parseStoryCategories(story.category);
    const targetSlug = categorySlug(cat);
    const exists = currentCats.some((c) => categorySlug(c) === targetSlug);

    if (exists && currentCats.length <= 1) {
      setStatusMessage({
        type: "error",
        text: "A story must have at least one category. Add another category first before removing the last one.",
      });
      return;
    }

    const nextCats = exists
      ? currentCats.filter((c) => categorySlug(c) !== targetSlug)
      : [...currentCats, normalizeCategory(cat)];

    const formatted = formatStoryCategories(nextCats);

    setStories((prev) =>
      prev.map((item) => (item.id === story.id ? { ...item, category: formatted } : item)),
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.set("story_id", story.id);
      formData.set("category", formatted);

      const res = await updateStoryCategoriesAction(formData);
      if (!res.ok) {
        setStories((prev) =>
          prev.map((item) =>
            item.id === story.id ? { ...item, category: story.category } : item,
          ),
        );
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to update story categories.",
        });
        return;
      }

      setStatusMessage({
        type: "success",
        text: `Updated categories for "${story.title}": ${res.category}`,
      });
    });
  };

  const handleAddCustomCategoryToStory = (story: CategoryStoryItem) => {
    const raw = (customPerStoryInput[story.id] ?? "").trim().replace(/\s+/g, " ");
    if (raw.length < 2 || raw.length > 60) return;

    const normalized = normalizeCategory(raw);
    const slug = categorySlug(normalized);
    if (!slug) return;

    if (
      !CATEGORIES.some((c) => categorySlug(c) === slug) &&
      !customCategories.some((c) => categorySlug(c) === slug)
    ) {
      saveCustomCategories([...customCategories, normalized]);
    }

    setCustomPerStoryInput((prev) => ({ ...prev, [story.id]: "" }));

    const currentCats = parseStoryCategories(story.category);
    if (!currentCats.some((c) => categorySlug(c) === slug)) {
      handleToggleStoryCategory(story, normalized);
    }
  };

  const filteredStories = stories.filter((story) => {
    const storyCats = parseStoryCategories(story.category);
    const matchesCategory =
      selectedFilter === "all" ||
      storyCats.some((c) => categorySlug(c) === selectedFilter);
    const matchesQuery =
      !searchQuery.trim() ||
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div
          role={statusMessage.type === "error" ? "alert" : "status"}
          className={`p-4 rounded border flex items-center justify-between gap-4 ${
            statusMessage.type === "error"
              ? "bg-danger-soft text-danger border-danger"
              : "bg-success-soft text-success border-success"
          }`}
        >
          <span className="text-sm font-semibold">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Create & Manage Categories */}
      <section className="bg-surface-container-lowest border border-border rounded-lg p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-headline text-2xl font-bold text-on-surface">
              Add, Rename, or Delete Created Categories ({allCategories.length})
            </h3>
            <p className="text-sm text-muted mt-1">
              Add new categories with the + button below, rename any existing category across all stories, or delete categories you no longer need.
            </p>
          </div>
          {removedDefaults.length > 0 && (
            <button
              type="button"
              onClick={() => saveRemovedDefaults([])}
              className="button secondary button-compact text-xs"
            >
              Restore Deleted Defaults ({removedDefaults.length})
            </button>
          )}
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleCreateCategory} className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            maxLength={60}
            placeholder="Type a new category name (e.g. Sports, Education, Environment)..."
            aria-label="Create new category"
            className="editor-input flex-1 min-w-[240px]"
            style={{ marginBottom: 0 }}
          />
          <button
            type="submit"
            disabled={isPending || newCategoryName.trim().length < 2}
            className="px-5 py-2.5 rounded bg-primary text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <span aria-hidden="true" className="text-base font-black leading-none">+</span>
            <span>Add Category</span>
          </button>
        </form>

        {/* All Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCategories.map((cat) => {
            const slug = categorySlug(cat);
            const count = countStoriesForCategory(cat);
            const isRenaming = renamingCategory === cat;

            return (
              <div
                key={slug}
                className={`p-3.5 rounded border transition-colors ${
                  selectedFilter === slug
                    ? "border-primary bg-accent-soft"
                    : "border-border bg-surface-muted"
                }`}
              >
                {isRenaming ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={renameInput}
                      onChange={(e) => setRenameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRenameCategory(cat);
                        } else if (e.key === "Escape") {
                          setRenamingCategory(null);
                        }
                      }}
                      aria-label={`Rename ${cat}`}
                      className="editor-input text-sm bg-white"
                      style={{ marginBottom: 0 }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRenameCategory(cat)}
                        className="px-3 py-1.5 rounded bg-primary text-white text-xs font-bold cursor-pointer"
                      >
                        Save Name
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingCategory(null)}
                        className="px-3 py-1.5 rounded border border-border bg-white text-on-surface text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFilter((prev) => (prev === slug ? "all" : slug))
                        }
                        className="font-bold text-sm text-on-surface hover:text-primary text-left cursor-pointer"
                      >
                        {cat}
                      </button>
                      <span className="block text-xs text-muted">
                        {count} {count === 1 ? "story" : "stories"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingCategory(cat);
                          setRenameInput(cat);
                        }}
                        disabled={isPending}
                        className="text-xs font-bold px-2.5 py-1 rounded border border-border bg-white text-on-surface hover:border-primary cursor-pointer"
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={isPending}
                        className="text-xs font-bold px-2.5 py-1 rounded border border-border bg-danger-soft text-danger hover:opacity-90 cursor-pointer"
                      >
                        × Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Assign Multiple Categories to Stories (shown on full /dashboard/categories page) */}
      {!compact && (
        <section className="bg-surface-container-lowest border border-border rounded-lg p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">
                Assign or Remove Multiple Categories on Stories
              </h3>
              <p className="text-sm text-muted mt-1">
                Every story can belong to multiple categories. Click any category chip below a story to add (+) or remove (×) it immediately.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter("all")}
                  className="button secondary button-compact text-xs"
                >
                  Clear category filter
                </button>
              )}
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter stories by title or category..."
                aria-label="Filter stories"
                className="editor-input text-sm w-64"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          {filteredStories.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              No stories match the current filter.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredStories.map((story) => {
                const assignedCats = parseStoryCategories(story.category);
                const unassignedCats = allCategories.filter(
                  (cat) => !assignedCats.some((a) => categorySlug(a) === categorySlug(cat)),
                );

                return (
                  <div
                    key={story.id}
                    className="p-4 rounded-lg border border-border bg-surface-muted space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                              story.status === "published"
                                ? "bg-success-soft text-success"
                                : "bg-warning-soft text-warning"
                            }`}
                          >
                            {story.status}
                          </span>
                          {story.story_type === "photo_desk" && (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-accent-soft text-primary">
                              Photo Desk
                            </span>
                          )}
                        </div>
                        <h4 className="font-headline text-lg font-bold text-on-surface">
                          {story.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={
                            story.story_type === "photo_desk"
                              ? `/dashboard/photo-desk/${story.id}`
                              : `/dashboard/stories/${story.id}`
                          }
                          className="px-3 py-1.5 rounded bg-primary text-white text-xs font-bold uppercase tracking-wider hover:opacity-90"
                        >
                          Edit Full Story →
                        </Link>
                      </div>
                    </div>

                    {/* Assigned Categories */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface mb-1.5">
                        Assigned Categories ({assignedCats.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedCats.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded"
                          >
                            <span>{cat}</span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleToggleStoryCategory(story, cat)}
                              title={`Remove "${cat}" from this story`}
                              aria-label={`Remove ${cat} from ${story.title}`}
                              className="text-white hover:underline font-bold text-sm px-0.5 leading-none cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick Add Existing Category + Inline Add Custom Category */}
                    <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-muted mr-1">
                          + Add to story:
                        </span>
                        {unassignedCats.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleStoryCategory(story, cat)}
                            className="text-xs font-semibold px-2 py-0.5 rounded border border-border bg-white text-on-surface hover:border-primary hover:text-primary cursor-pointer"
                          >
                            + {cat}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customPerStoryInput[story.id] ?? ""}
                          onChange={(e) =>
                            setCustomPerStoryInput((prev) => ({
                              ...prev,
                              [story.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomCategoryToStory(story);
                            }
                          }}
                          placeholder="New category..."
                          aria-label={`New category for ${story.title}`}
                          className="editor-input text-xs py-1 px-2 w-40 bg-white"
                          style={{ marginBottom: 0 }}
                        />
                        <button
                          type="button"
                          disabled={
                            isPending ||
                            (customPerStoryInput[story.id] ?? "").trim().length < 2
                          }
                          onClick={() => handleAddCustomCategoryToStory(story)}
                          className="px-3 py-1 rounded bg-primary text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
