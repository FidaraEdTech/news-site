import { SubmitButton } from "@/components/SubmitButton";
import { CategorySelect } from "@/components/CategorySelect";
import { StoryEditor } from "@/components/StoryEditor";
import { TagsInput } from "@/components/TagsInput";
import { storyHtml } from "@/lib/story-content";
import { StatusBadge } from "@/components/StatusBadge";
import { MediaUploader } from "@/components/MediaUploader";
import {
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  VIDEO_ACCEPT,
  formatFileSize,
} from "@/lib/media";
import { getStoryImageUrl, getStoryVideoUrl, sortStoryMedia } from "@/lib/story-media";
import type { Story, StoryMedia } from "@/lib/types";

type StoryFormProps = {
  action: (formData: FormData) => Promise<void>;
  story?: Story;
  gallery?: StoryMedia[];
  title: string;
  description: string;
};

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function StoryForm({ action, story, gallery = [], title, description }: StoryFormProps) {
  const imageUrl = story ? getStoryImageUrl(story) : null;
  const videoUrl = story ? getStoryVideoUrl(story) : null;
  const sortedGallery = sortStoryMedia(gallery);
  const hasImage = Boolean(imageUrl);
  const hasVideo = Boolean(videoUrl);
  const hasUploadedImage = Boolean(story?.featured_image_path);
  const isPublishedStory = story?.status === "published";
  const imageUrlDefaultValue = story?.featured_image_path
    ? ""
    : imageUrl ?? "";
  const updatedAtLabel = story ? new Date(story.updated_at).toLocaleString() : null;
  const publishedAtLabel =
    story?.published_at ? new Date(story.published_at).toLocaleString() : null;
  const breakingExpiryDefaultValue = toDateTimeLocalValue(story?.breaking_expires_at);

  return (
    <form action={action} className="story-editor-wrapper">
      <input name="story_id" type="hidden" value={story?.id ?? ""} />

      <div className="story-editor-grid">
        {/* Content Column */}
        <div className="story-editor-main">
          
          {/* Title Area */}
          <div className="editor-panel editor-panel-primary">
            <textarea
              aria-label="Headline"
              name="title"
              minLength={3}
              defaultValue={story?.title ?? ""}
              required
              maxLength={180}
              className="editor-input-huge"
              placeholder="Enter headline..."
              rows={2}
            />
            
            <div className="editor-metadata-row">
              <div className="editor-metadata-field" style={{ flex: "1 1 100%", width: "100%" }}>
                <CategorySelect value={story?.category} id={`category-${story?.id ?? "new"}`} />
              </div>
              <div className="editor-metadata-field" style={{ flex: "1 1 100%", width: "100%" }}>
                <label className="editor-label">Location Context (Optional)</label>
                <input
                  aria-label="Location" name="location"
                  defaultValue={story?.location ?? ""}
                  maxLength={120}
                  className="editor-input"
                  placeholder="e.g. Washington, D.C."
                />
              </div>
            </div>
          </div>

          {/* Media Section */}
          <MediaUploader existingFeaturedUrl={imageUrl} existingGallery={sortedGallery} />

          <div className="editor-panel">
            <div className="editor-media-box">
              <div className="editor-media-header">
                <h3 className="editor-media-title">Story Video</h3>
                {hasVideo && <span style={{fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: '4px'}}>Attached</span>}
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                 <div>
                    <label className="editor-label">Upload Footage</label>
                    <input
                      aria-label="Upload video" name="video_file"
                      type="file"
                      accept={VIDEO_ACCEPT}
                      className="editor-file-input"
                    />
                 </div>
                 <div>
                    <label className="editor-label">Video Caption</label>
                    <input
                      aria-label="Video caption"
                      name="video_caption"
                      type="text"
                      defaultValue={story?.video_caption ?? ""}
                      maxLength={200}
                      className="editor-input"
                      placeholder="Optional caption..."
                    />
                 </div>
                 {hasVideo && (
                    <div style={{marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)'}}>
                       <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--danger)', cursor: 'pointer'}}>
                          <input name="remove_video" type="checkbox" style={{accentColor: 'var(--danger)'}} />
                          Remove video on save
                       </label>
                    </div>
                 )}
              </div>
            </div>
          </div>

          {/* Rich Text Area */}
          <div className="editor-panel">
            <label className="editor-label" style={{marginBottom: '1rem'}}>Excerpt (Abstract)</label>
            <textarea
              aria-label="Excerpt"
              name="excerpt"
              defaultValue={story?.excerpt ?? ""}
              maxLength={280}
              className="editor-textarea-excerpt"
              placeholder="Write a compelling lead..."
              rows={3}
            />
            
            <label className="editor-label" htmlFor={`byline-${story?.id ?? "new"}`}>Author / byline</label>
            <input id={`byline-${story?.id ?? "new"}`} name="byline" maxLength={120} defaultValue={story?.byline ?? ""} className="editor-input" placeholder="Leave blank for Newsroom Desk" />
            <label className="editor-label" htmlFor={`tags-${story?.id ?? "new"}`}>Tags</label>
            <TagsInput id={`tags-${story?.id ?? "new"}`} tags={story?.tags} helpId={`tags-help-${story?.id ?? "new"}`} />
            <p id={`tags-help-${story?.id ?? "new"}`} className="editor-help-text">Separate topics with commas. Up to 10 tags, 40 characters each. You can also assign multiple categories above.</p>
            <h2 className="editor-label">Story body</h2>
            <StoryEditor key={story?.id ?? "new"} initialHtml={storyHtml(story?.content ?? "", story?.content_format)} />
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="story-editor-sidebar">
          <div className="editor-sidebar-panel">
             <h3 className="editor-label" style={{borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>Publishing Status</h3>
             
             <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div className="editor-status-row">
                  <span className="editor-label" style={{marginBottom: 0}}>State</span>
                  {story ? <StatusBadge status={story.status} /> : <span style={{fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: 'var(--warning-soft)', color: 'var(--warning)', padding: '0.25rem 0.5rem', borderRadius: '4px'}}>New Draft</span>}
                </div>

                {story && (
                  <div style={{fontSize: '0.65rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--surface-muted)', padding: '0.75rem', borderRadius: 'var(--radius-sm)'}}>
                     <span>Updated: {updatedAtLabel}</span>
                     {publishedAtLabel && <span>Live: {publishedAtLabel}</span>}
                  </div>
                )}

                <div style={{paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem'}}>
                  <label style={{display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', cursor: 'pointer'}}>
                    <input
                      name="is_breaking"
                      type="checkbox"
                      defaultChecked={Boolean(story?.is_breaking)}
                      style={{accentColor: 'var(--accent)', marginTop: '0.15rem'}}
                    />
                    <span>Mark as Breaking News</span>
                  </label>

                  <div>
                    <label className="editor-label" htmlFor={`breaking-label-${story?.id ?? "new"}`}>Breaking ticker text</label>
                    <input
                      id={`breaking-label-${story?.id ?? "new"}`}
                      name="breaking_label"
                      type="text"
                      defaultValue={story?.breaking_label ?? ""}
                      maxLength={160}
                      className="editor-input"
                      placeholder="Optional short strip text"
                    />
                    <p className="editor-help-text">Optional short version for the red breaking strip.</p>
                  </div>

                  <div>
                    <label className="editor-label" htmlFor={`breaking-expiry-${story?.id ?? "new"}`}>Breaking expiry</label>
                    <input
                      id={`breaking-expiry-${story?.id ?? "new"}`}
                      name="breaking_expires_at"
                      type="datetime-local"
                      defaultValue={breakingExpiryDefaultValue}
                      className="editor-input"
                    />
                    <p className="editor-help-text">Defaults to 24 hours after publishing if left empty.</p>
                  </div>
                </div>
                
                <div style={{paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem'}}>
                   <SubmitButton
                     name="intent"
                     value="draft"
                     pendingBehavior="clicked"
                     pendingLabel={isPublishedStory ? "Moving to draft..." : "Saving draft..."}
                     className="editor-action-btn editor-action-btn-draft"
                   >
                     {isPublishedStory ? "Revert to Draft" : "Save as Draft"}
                   </SubmitButton>
                   
                   <SubmitButton
                     name="intent"
                     value="publish"
                     pendingBehavior="clicked"
                     pendingLabel={isPublishedStory ? "Updating live story..." : "Publishing story..."}
                     className="editor-action-btn editor-action-btn-publish"
                   >
                     {isPublishedStory ? "Update Live Story" : "Publish to World"}
                   </SubmitButton>
                </div>
             </div>
          </div>
        </div>

      </div>
    </form>
  );
}
