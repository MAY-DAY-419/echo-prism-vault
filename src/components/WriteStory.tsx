import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const storySchema = z.object({
  content: z.string().trim().min(10, "Story must be at least 10 characters").max(2000, "Story must be less than 2000 characters"),
});

interface WriteStoryProps {
  userId: string;
  onStoryPosted: () => void;
}

export const WriteStory = ({ userId, onStoryPosted }: WriteStoryProps) => {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      storySchema.parse({ content });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("stories").insert({
        author_id: userId,
        content: content,
        is_anonymous: isAnonymous,
      });

      if (error) throw error;

      toast.success("Your echo has been shared");
      setContent("");
      onStoryPosted();
    } catch (err) {
      toast.error("Failed to post story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 animate-scale-in">
      <div className="flex items-center gap-2 mb-4">
        <PenLine className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Share Your Echo</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="What's on your mind? Share your story..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="glass-card min-h-[150px] resize-none text-base"
          required
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
            <Label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
              Post anonymously
            </Label>
          </div>

          <Button
            type="submit"
            disabled={loading || !content.trim()}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
          >
            {loading ? "Posting..." : "Share Echo"}
          </Button>
        </div>
      </form>
    </div>
  );
};
