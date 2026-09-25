"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryMedia } from "@/lib/types";

type MediaUploaderProps = {
  existingFeaturedUrl: string | null;
  existingGallery: StoryMedia[];
};

export function MediaUploader({ existingFeaturedUrl, existingGallery }: MediaUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [removeFeatured, setRemoveFeatured] = useState(false);

  const featuredInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate object URLs for previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);

    // Cleanup URLs
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  useEffect(() => {
    if (!featuredInputRef.current || !galleryInputRef.current) return;

    const dtFeatured = new DataTransfer();
    const dtGallery = new DataTransfer();

    let featuredFile = null;
    let galleryFiles = selectedFiles;

    // If there's no existing featured image, or if the user is removing it,
    // we take the first newly selected file to be the featured image.
    if ((!existingFeaturedUrl || removeFeatured) && selectedFiles.length > 0) {
      featuredFile = selectedFiles[0];
      galleryFiles = selectedFiles.slice(1);
    }

    if (featuredFile) {
      dtFeatured.items.add(featuredFile);
    }

    galleryFiles.forEach(file => {
      dtGallery.items.add(file);
    });

    featuredInputRef.current.files = dtFeatured.files;
    galleryInputRef.current.files = dtGallery.files;
  }, [selectedFiles, existingFeaturedUrl, removeFeatured]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    // Reset the input so the same files can be selected again if needed
    e.target.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  return (
    <div className="editor-panel editor-gallery-panel">
      <div className="editor-media-header">
        <div>
          <h3 className="editor-media-title">Story Media</h3>
          <p className="editor-help-text">
            Upload all images for this story here. The first image will automatically be set as the Featured Cover Image.
          </p>
        </div>
      </div>

      <div className="editor-gallery-upload" style={{ border: '2px dashed var(--border)', padding: '2rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', position: 'relative' }}>
        <input
          aria-label="Upload story images"
          type="file"
          accept="image/jpeg, image/png, image/webp, image/gif, image/avif"
          multiple
          onChange={handleFileSelect}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
        />
        <div style={{ pointerEvents: 'none' }}>
          <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>Click or Drag Images Here</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Supports JPG, PNG, WebP up to 5MB</span>
        </div>
      </div>

      {/* Hidden inputs for the backend */}
      <input type="file" name="featured_image_file" ref={featuredInputRef} style={{ display: "none" }} />
      <input type="file" name="gallery_images" multiple ref={galleryInputRef} style={{ display: "none" }} />

      {/* Unified Media Grid */}
      {(existingFeaturedUrl || existingGallery.length > 0 || previews.length > 0) && (
        <div className="editor-gallery-grid" style={{ marginTop: '2rem' }}>
          
          {/* Existing Featured Image */}
          {existingFeaturedUrl && (
            <div className="editor-gallery-item" style={{ opacity: removeFeatured ? 0.5 : 1 }}>
              <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', zIndex: 10 }}>Cover</div>
              <img src={existingFeaturedUrl} alt="Cover" className="editor-gallery-thumb" />
              <div className="editor-gallery-fields">
                <div className="editor-gallery-controls">
                  <label className="editor-gallery-remove" style={{ color: 'var(--danger)' }}>
                    <input 
                      name="remove_featured_image" 
                      type="checkbox" 
                      checked={removeFeatured}
                      onChange={(e) => setRemoveFeatured(e.target.checked)}
                    />
                    Remove Cover
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Existing Gallery Images */}
          {existingGallery.map((media) => (
            <div className="editor-gallery-item" key={media.id}>
              <input name="gallery_media_id" type="hidden" value={media.id} />
              <img
                src={media.url}
                alt={media.alt_text ?? media.caption ?? "Story gallery image"}
                className="editor-gallery-thumb"
              />
              <div className="editor-gallery-fields">
                <div>
                  <label className="editor-label" htmlFor={`gallery-caption-${media.id}`}>Caption</label>
                  <input
                    id={`gallery-caption-${media.id}`}
                    name={`gallery_caption_${media.id}`}
                    type="text"
                    defaultValue={media.caption ?? ""}
                    maxLength={240}
                    className="editor-input"
                    placeholder="Optional caption"
                  />
                </div>
                <div>
                  <label className="editor-label" htmlFor={`gallery-alt-${media.id}`}>Alt text</label>
                  <input
                    id={`gallery-alt-${media.id}`}
                    name={`gallery_alt_${media.id}`}
                    type="text"
                    defaultValue={media.alt_text ?? ""}
                    maxLength={180}
                    className="editor-input"
                    placeholder="Describe the image"
                  />
                </div>
                <div className="editor-gallery-controls">
                  <div>
                    <label className="editor-label" htmlFor={`gallery-sort-${media.id}`}>Order</label>
                    <input
                      id={`gallery-sort-${media.id}`}
                      name={`gallery_sort_${media.id}`}
                      type="number"
                      defaultValue={media.sort_order}
                      className="editor-input"
                    />
                  </div>
                  <label className="editor-gallery-remove">
                    <input name={`gallery_remove_${media.id}`} type="checkbox" />
                    Remove
                  </label>
                </div>
              </div>
            </div>
          ))}

          {/* Newly Selected Previews */}
          {previews.map((previewUrl, index) => (
            <div className="editor-gallery-item" key={previewUrl} style={{ border: '2px dashed var(--border)' }}>
              <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'var(--accent)', color: 'white', fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', zIndex: 10 }}>
                {(!existingFeaturedUrl || removeFeatured) && index === 0 ? "New Cover" : "New Media"}
              </div>
              <img src={previewUrl} alt={`Preview ${index}`} className="editor-gallery-thumb" />
              <div className="editor-gallery-fields">
                <button 
                  type="button" 
                  onClick={() => removeSelectedFile(index)}
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--danger-soft)', color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Discard Upload
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
