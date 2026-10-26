"use client";

import { CategorySelect } from "@/components/CategorySelect";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InlineMessage } from "@/components/InlineMessage";
import { savePhotoDeskAction } from "./actions";

type PhotoSlot = {
  id: string;
  file: File | null;
  previewUrl: string;
  caption: string;
  existingItem?: any;
};

export default function PhotoDeskAdminPage() {
  const searchParams = useSearchParams();
  const noticeText = searchParams?.get("notice");
  const errorText = searchParams?.get("error");
  const formRef = useRef<HTMLFormElement>(null);

  const [slots, setSlots] = useState<PhotoSlot[]>([
    { id: crypto.randomUUID(), file: null, previewUrl: "", caption: "" },
  ]);

  const [isBreaking, setIsBreaking] = useState(false);

  useEffect(() => {
    return () => {
      slots.forEach((slot) => {
        if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
      });
    };
  }, [slots]);

  const addSlot = () => {
    setSlots([...slots, { id: crypto.randomUUID(), file: null, previewUrl: "", caption: "" }]);
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    setSlots(slots.map((s) => (s.id === id ? { ...s, caption } : s)));
  };

  const handleFileSelect = (id: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setSlots(
      slots.map((s) => {
        if (s.id === id) {
          if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
          return { ...s, file, previewUrl };
        }
        return s;
      })
    );
  };

  const hasPhotos = slots.some((s) => s.file !== null || s.existingItem);

  return (
    <div className="photo-desk-admin max-w-4xl mx-auto py-8">
      <header className="photo-desk-admin-header mb-8 border-b border-outline-variant/30 pb-6">
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-primary italic tracking-tight mb-2">
          Photo Desk
        </h1>
        <p className="text-on-surface-variant font-body">
          Create immersive photo stories with captions overlaid on each image.
        </p>
      </header>

      {noticeText && (
        <div className="mb-6">
          <InlineMessage tone="success" title="Success">
            {noticeText === "published"
              ? "Photo desk story published successfully."
              : "Photo desk draft saved."}
          </InlineMessage>
        </div>
      )}

      {errorText && (
        <div className="mb-6">
          <InlineMessage tone="error" title="Error">
            {errorText === "validation" && "Please provide a title (3+ chars), category, and at least one photo to publish."}
            {errorText === "save-failed" && "A database error occurred. Please try again."}
            {errorText === "upload-failed" && "Failed to upload one or more images."}
            {errorText === "image-type" && "Unsupported image format. Use JPG, PNG, or WebP."}
            {errorText === "image-size" && "Image exceeds the 5MB size limit."}
            {!["validation", "save-failed", "upload-failed", "image-type", "image-size"].includes(errorText) && errorText}
          </InlineMessage>
        </div>
      )}

      <form ref={formRef} action={savePhotoDeskAction} className="photo-desk-admin-form space-y-8">
        <input type="hidden" name="story_id" value="" />
        <input type="hidden" name="existing_items" value="[]" />

        <div className="editor-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="editor-label">
                Admin Title <span className="text-danger">*</span>
              </label>
              <input type="text" name="title" aria-label="Photo story title" required className="editor-input" placeholder="Enter title..." />
              <p className="editor-help-text">Internal reference only — never shown publicly.</p>
            </div>
            <div className="sm:col-span-2">
              <CategorySelect id="photo-category" />
            </div>
            <div>
              <label className="editor-label">Location</label>
              <input type="text" name="location" aria-label="Location" className="editor-input" placeholder="e.g. Lagos, Nigeria" />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-outline-variant/20">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_breaking"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                className="w-5 h-5 text-danger border-outline-variant rounded focus:ring-danger cursor-pointer"
              />
              <span className="font-body text-base font-bold text-danger uppercase tracking-wider">
                Mark as Breaking News
              </span>
            </label>
            {isBreaking && (
              <div className="mt-4 pl-8">
                <label className="editor-label">Breaking Label</label>
                <input
                  type="text"
                  name="breaking_label"
                  className="editor-input"
                  placeholder="e.g. BREAKING or EXCLUSIVE"
                  maxLength={160}
                />
              </div>
            )}
          </div>
        </div>

        <div className="editor-panel">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-2xl font-bold">Photo Slides</h3>
            <span className="bg-surface-strong px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {slots.length} {slots.length === 1 ? "Slide" : "Slides"}
            </span>
          </div>

          <div className="space-y-6">
            {slots.map((slot, index) => (
              <div key={slot.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-sans text-sm font-bold text-primary uppercase tracking-widest">
                    Slide {index + 1}
                  </h4>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="text-danger hover:bg-danger-soft p-1.5 rounded-sm transition-colors"
                      title="Remove Slide"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <input
                      type="file"
                      id={`photo-input-${slot.id}`}
                      name="photo_file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) handleFileSelect(slot.id, e.target.files[0]);
                      }}
                    />
                    {slot.previewUrl ? (
                      <div className="relative aspect-video rounded-md overflow-hidden bg-surface-strong group">
                        <img src={slot.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <label
                            htmlFor={`photo-input-${slot.id}`}
                            className="cursor-pointer text-white font-bold px-4 py-2 bg-black/50 rounded hover:bg-black/70"
                          >
                            Change Photo
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor={`photo-input-${slot.id}`}
                        className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-outline-variant/50 rounded-md bg-surface hover:bg-surface-container-low transition-colors cursor-pointer group"
                      >
                        <svg className="w-10 h-10 text-outline-variant group-hover:text-primary transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary">
                          Click to select image
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="editor-label">Caption</label>
                    <textarea
                      name="photo_caption"
                      value={slot.caption}
                      onChange={(e) => updateCaption(slot.id, e.target.value)}
                      maxLength={280}
                      className="editor-input resize-none flex-1 min-h-[120px]"
                      placeholder="Caption text overlaid on this photo..."
                    />
                    <div className="mt-2 flex justify-between items-start text-xs">
                      {slot.caption.length > 200 ? (
                        <span className="text-warning font-medium">
                          Caption getting long — consider moving some text to the next photo.
                        </span>
                      ) : (
                        <span></span>
                      )}
                      <span className={`font-mono font-medium ${slot.caption.length > 200 ? 'text-warning' : 'text-on-surface-variant'}`}>
                        {slot.caption.length} / 280
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSlot}
            className="mt-6 w-full py-4 border-2 border-dashed border-outline-variant/40 rounded-lg text-on-surface-variant font-bold hover:bg-surface-container-low hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Another Photo
          </button>
        </div>

        <div className="flex justify-end gap-4 border-t border-outline-variant/30 pt-6">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="px-6 py-3 font-bold rounded-sm border border-outline-variant text-on-surface hover:bg-surface-container-lowest transition-colors"
          >
            Save Draft
          </button>
          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={!hasPhotos}
            className="px-8 py-3 font-bold rounded-sm bg-primary text-white hover:bg-accent-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publish Photo Desk
          </button>
        </div>
      </form>
    </div>
  );
}
