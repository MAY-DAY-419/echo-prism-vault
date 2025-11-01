import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Frown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters"),
  alias: z.string().trim().max(50, "Alias must be less than 50 characters").optional(),
});

interface Reaction {
  id: string;
  reaction_type: string;
  user_id: string;
}

interface Comment {
  id: string;
  content: string;
  commenter_alias: string | null;
  created_at: string;
  user_id: string;
}

interface StoryCardProps {
  id: string;
  content: string;
  createdAt: string;
  isAnonymous: boolean;
  authorUsername?: string;
  reactions: Reaction[];
  comments: Comment[];
  currentUserId: string | null;
  onReactionUpdate: () => void;
  onCommentAdd: () => void;
}

export const StoryCard = ({
  id,
  content,
  createdAt,
  isAnonymous,
  authorUsername,
  reactions,
  comments,
  currentUserId,
  onReactionUpdate,
  onCommentAdd,
}: StoryCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentAlias, setCommentAlias] = useState("");
  const [loading, setLoading] = useState(false);

  const reactionCounts = {
    heart: reactions.filter((r) => r.reaction_type === "heart").length,
    sad: reactions.filter((r) => r.reaction_type === "sad").length,
    wow: reactions.filter((r) => r.reaction_type === "wow").length,
  };

  const userReactions = reactions
    .filter((r) => r.user_id === currentUserId)
    .map((r) => r.reaction_type);

  const handleReaction = async (type: "heart" | "sad" | "wow") => {
    if (!currentUserId) {
      toast.error("Please login to react");
      return;
    }

    try {
      if (userReactions.includes(type)) {
        // Remove reaction
        const reactionToRemove = reactions.find(
          (r) => r.user_id === currentUserId && r.reaction_type === type
        );
        
        if (reactionToRemove) {
          const { error } = await supabase
            .from("reactions")
            .delete()
            .eq("id", reactionToRemove.id);

          if (error) throw error;
        }
      } else {
        // Add reaction
        const { error } = await supabase.from("reactions").insert({
          story_id: id,
          user_id: currentUserId,
          reaction_type: type,
        });

        if (error) throw error;
      }

      onReactionUpdate();
    } catch (err) {
      toast.error("Failed to update reaction");
    }
  };

  const handleAddComment = async () => {
    if (!currentUserId) {
      toast.error("Please login to comment");
      return;
    }

    try {
      commentSchema.parse({ content: newComment, alias: commentAlias });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("comments").insert({
        story_id: id,
        user_id: currentUserId,
        content: newComment,
        commenter_alias: commentAlias || null,
      });

      if (error) throw error;

      toast.success("Comment added");
      setNewComment("");
      setCommentAlias("");
      onCommentAdd();
    } catch (err) {
      toast.error("Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-4 animate-fade-in hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">
            {isAnonymous ? "Anonymous" : authorUsername || "Unknown"} •{" "}
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
          <p className="text-foreground leading-relaxed">{content}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReaction("heart")}
          className={`gap-1 ${
            userReactions.includes("heart") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Heart className="w-4 h-4" fill={userReactions.includes("heart") ? "currentColor" : "none"} />
          {reactionCounts.heart > 0 && reactionCounts.heart}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReaction("sad")}
          className={`gap-1 ${
            userReactions.includes("sad") ? "text-secondary" : "text-muted-foreground"
          }`}
        >
          <Frown className="w-4 h-4" />
          {reactionCounts.sad > 0 && reactionCounts.sad}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReaction("wow")}
          className={`gap-1 ${
            userReactions.includes("wow") ? "text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {reactionCounts.wow > 0 && reactionCounts.wow}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="gap-1 text-muted-foreground ml-auto"
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length > 0 && comments.length}
        </Button>
      </div>

      {showComments && (
        <div className="space-y-3 pt-3 border-t border-border">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {comment.commenter_alias || "Anonymous"} •{" "}
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
              <p className="text-sm">{comment.content}</p>
            </div>
          ))}

          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="glass-card resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Your alias (optional)"
                value={commentAlias}
                onChange={(e) => setCommentAlias(e.target.value)}
                className="flex-1 px-3 py-2 glass-card text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
