import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { WriteStory } from "@/components/WriteStory";
import { StoryCard } from "@/components/StoryCard";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

interface Story {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author_id: string;
  profiles?: {
    username: string;
  } | null;
}

interface Reaction {
  id: string;
  story_id: string;
  user_id: string;
  reaction_type: string;
}

interface Comment {
  id: string;
  story_id: string;
  content: string;
  commenter_alias: string | null;
  created_at: string;
  user_id: string;
}

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (storiesError) throw storiesError;

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username");

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Attach profiles to stories
      const storiesWithProfiles = storiesData?.map(story => ({
        ...story,
        profiles: profilesMap.get(story.author_id) || null
      })) || [];

      const { data: reactionsData, error: reactionsError } = await supabase
        .from("reactions")
        .select("*");

      if (reactionsError) throw reactionsError;

      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      setStories(storiesWithProfiles);
      setReactions(reactionsData || []);
      setComments(commentsData || []);
    } catch (err) {
      toast.error("Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchStories();
    }
  }, [session]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                EchoVerse
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                People judge, but we don't — share your echo
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Write Story */}
        <WriteStory userId={session.user.id} onStoryPosted={fetchStories} />

        {/* Stories Feed */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Recent Echoes</h2>
          
          {loading ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">Loading echoes...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No echoes yet. Be the first to share!</p>
            </div>
          ) : (
            stories.map((story) => (
              <StoryCard
                key={story.id}
                id={story.id}
                content={story.content}
                createdAt={story.created_at}
                isAnonymous={story.is_anonymous}
                authorUsername={story.profiles?.username}
                reactions={reactions.filter((r) => r.story_id === story.id)}
                comments={comments.filter((c) => c.story_id === story.id)}
                currentUserId={session.user.id}
                onReactionUpdate={fetchStories}
                onCommentAdd={fetchStories}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
