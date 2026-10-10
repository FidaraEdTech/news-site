"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Comment, CommentWithReplies } from "@/lib/types";
import { addCommentAction, deleteCommentAction, type CommentActionState } from "@/app/story/[id]/actions";
import { SubmitButton } from "@/components/SubmitButton";

type CommentSectionProps = {
  storyId: string;
  initialComments: Comment[];
  isAdmin?: boolean;
};

const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length === 0 ? "R" : parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function buildCommentTree(comments: Comment[]): CommentWithReplies[] {
  const topLevel: CommentWithReplies[] = [];
  const replyMap: Record<string, Comment[]> = {};

  for (const c of comments) {
    if (c.parent_id) {
      if (!replyMap[c.parent_id]) replyMap[c.parent_id] = [];
      replyMap[c.parent_id].push(c);
    } else {
      topLevel.push({ ...c, replies: [] });
    }
  }

  for (const top of topLevel) {
    top.replies = replyMap[top.id] ?? [];
  }

  return topLevel;
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatter.format(new Date(dateString));
}

export function CommentSection({ storyId, initialComments, isAdmin }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    const result = await deleteCommentAction(commentId, storyId);

    if (result.status === "success") {
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
      return;
    }

    alert(result.message);
  };

  // Main comment form
  const [mainState, mainAction] = useActionState<CommentActionState, FormData>(
    addCommentAction,
    { status: "idle", message: "" }
  );

  // Reply form
  const [replyState, replyAction] = useActionState<CommentActionState, FormData>(
    addCommentAction,
    { status: "idle", message: "" }
  );

  const mainFormRef = useRef<HTMLFormElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const newCommentRef = useRef<HTMLElement>(null);

  // Handle successful main comment
  useEffect(() => {
    if (mainState.status === "success" && mainState.newComment) {
      setComments((prev) => [mainState.newComment!, ...prev]);
      setHighlightedId(mainState.newComment.id);
      mainFormRef.current?.reset();
      setTimeout(() => {
        document.getElementById(`comment-${mainState.newComment!.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, [mainState]);

  // Handle successful reply
  useEffect(() => {
    if (replyState.status === "success" && replyState.newComment) {
      setComments((prev) => [...prev, replyState.newComment!]);
      setHighlightedId(replyState.newComment.id);
      setReplyingTo(null);
      replyFormRef.current?.reset();
      setTimeout(() => {
        document.getElementById(`comment-${replyState.newComment!.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, [replyState]);

  const tree = buildCommentTree(comments);
  const commentCount = comments.length;

  return (
    <div className="comment-section" id="story-discussion">
      {/* Header */}
      <div className="comment-section-header">
        <h3 className="comment-section-title">
          Discussion
          <span className="comment-count-badge">{commentCount}</span>
        </h3>
      </div>

      {/* Main Comment Form */}
      <form ref={mainFormRef} action={mainAction} className="comment-compose">
        <input type="hidden" name="story_id" value={storyId} />
        <input type="hidden" name="parent_id" value="" />

        <div className="comment-compose-avatar">
          <div className="comment-avatar comment-avatar-compose">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
        </div>

        <div className="comment-compose-body">
          <input
            name="author_name"
            type="text"
            placeholder="Your name"
            required
            maxLength={80}
            className="comment-input-name"
          />
          <textarea
            name="body"
            placeholder="Share your thoughts on this story..."
            required
            maxLength={1000}
            rows={3}
            className="comment-input-body"
          />

          {mainState.status === "error" && (
            <p className="comment-error">{mainState.message}</p>
          )}

          <div className="comment-compose-actions">
            <span className="comment-compose-hint">Be respectful and on-topic</span>
            <SubmitButton pendingLabel={<><span className="comment-spinner" /> Posting...</>} className="comment-submit-btn">
              Post Comment
            </SubmitButton>
          </div>
        </div>
      </form>

      {/* Comment List */}
      {commentCount === 0 ? (
        <div className="comment-empty">
          <div className="comment-empty-icon">...</div>
          <h4>No comments yet</h4>
          <p>Be the first to share your thoughts on this story.</p>
        </div>
      ) : (
        <div className="comment-thread-list">
          {tree.map((comment) => (
            <div key={comment.id} className="comment-thread">
              {/* Top-level comment */}
              <article
                id={`comment-${comment.id}`}
                ref={highlightedId === comment.id ? newCommentRef : undefined}
                className={`comment-card ${highlightedId === comment.id ? "comment-highlight" : ""}`}
              >
                <div className="comment-avatar">{getInitials(comment.author_name)}</div>
                <div className="comment-card-body">
                  <div className="comment-card-header">
                    <span className="comment-card-author">{comment.author_name}</span>
                    <time className="comment-card-time" dateTime={comment.created_at}>
                      {timeAgo(comment.created_at)}
                    </time>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="comment-delete-btn"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="comment-card-text">{comment.body}</p>
                  <div className="comment-card-actions">
                    <button
                      type="button"
                      className="comment-reply-btn"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                      Reply
                    </button>
                    <span className="comment-reply-count">
                      {comment.replies.length > 0 && `${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
                    </span>
                  </div>
                </div>
              </article>

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="comment-replies">
                  {comment.replies.map((reply) => (
                    <article
                      key={reply.id}
                      id={`comment-${reply.id}`}
                      ref={highlightedId === reply.id ? newCommentRef : undefined}
                      className={`comment-card comment-card-reply ${highlightedId === reply.id ? "comment-highlight" : ""}`}
                    >
                      <div className="comment-avatar comment-avatar-sm">{getInitials(reply.author_name)}</div>
                      <div className="comment-card-body">
                        <div className="comment-card-header">
                          <span className="comment-card-author">{reply.author_name}</span>
                          <time className="comment-card-time" dateTime={reply.created_at}>
                            {timeAgo(reply.created_at)}
                          </time>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(reply.id)}
                              className="comment-delete-btn"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="comment-card-text">{reply.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Inline Reply Form */}
              {replyingTo === comment.id && (
                <div className="comment-replies">
                  <form ref={replyFormRef} action={replyAction} className="comment-compose comment-compose-reply">
                    <input type="hidden" name="story_id" value={storyId} />
                    <input type="hidden" name="parent_id" value={comment.id} />

                    <div className="comment-compose-avatar">
                      <div className="comment-avatar comment-avatar-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                    </div>

                    <div className="comment-compose-body">
                      <input
                        name="author_name"
                        type="text"
                        placeholder="Your name"
                        required
                        maxLength={80}
                        className="comment-input-name comment-input-sm"
                      />
                      <textarea
                        name="body"
                        placeholder={`Reply to ${comment.author_name}...`}
                        required
                        maxLength={1000}
                        rows={2}
                        className="comment-input-body comment-input-sm"
                        autoFocus
                      />

                      {replyState.status === "error" && (
                        <p className="comment-error">{replyState.message}</p>
                      )}

                      <div className="comment-compose-actions">
                        <button
                          type="button"
                          className="comment-cancel-btn"
                          onClick={() => setReplyingTo(null)}
                        >
                          Cancel
                        </button>
                        <SubmitButton pendingLabel={<><span className="comment-spinner" /> Replying...</>} className="comment-submit-btn comment-submit-btn-sm">
                          Reply
                        </SubmitButton>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
