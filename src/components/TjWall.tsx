import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, Play, Pause, Quote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

interface TjWallProps {
  onBack: () => void;
}

export default function TjWall({ onBack }: TjWallProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to load messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const toggleHeart = async (msg: Message) => {
    const newHearted = !msg.hearted;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, hearted: newHearted } : m))
    );
    const { error } = await supabase
      .from('messages')
      .update({ hearted: newHearted })
      .eq('id', msg.id);
    if (error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, hearted: msg.hearted } : m))
      );
    }
  };

  const saveReply = async (msg: Message) => {
    if (!replyText.trim()) return;
    const { error } = await supabase
      .from('messages')
      .update({ reply: replyText.trim() })
      .eq('id', msg.id);
    if (!error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, reply: replyText.trim() } : m))
      );
      setReplyingTo(null);
      setReplyText('');
    }
  };

  const toggleAudio = (msg: Message) => {
    if (!msg.voice_path) return;
    if (playingAudio === msg.id) {
      audioElement?.pause();
      setPlayingAudio(null);
    } else {
      audioElement?.pause();
      const { data } = supabase.storage.from('birthday-media').getPublicUrl(msg.voice_path);
      const audio = new Audio(data.publicUrl);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
      setAudioElement(audio);
      setPlayingAudio(msg.id);
    }
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('birthday-media').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-sage-700 via-sage-600 to-sage-700 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-sage-700/90 backdrop-blur-md">
        <div className="flex items-center px-4 py-2.5 max-w-5xl mx-auto">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-sage-600 flex items-center justify-center text-cream-50 hover:bg-sage-500 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="ml-2.5 flex-1 flex items-center gap-2">
            <h2 className="font-serif text-base sm:text-lg text-cream-50">TJ's 22nd Birthday Wall</h2>
          </div>
          <Quote size={16} className="text-cream-50/40 flex-shrink-0" />
        </div>
        {/* Quote */}
        <div className="px-4 pb-2 max-w-5xl mx-auto">
          <p className="font-serif text-xs sm:text-sm text-cream-50/80 italic">
            "Connections that are threads woven through every season of my life."
          </p>
        </div>
      </div>

      {/* Masonry Grid - internal scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-cream-50/30 border-t-cream-50 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-cream-50/60">
              <p className="font-serif text-lg">No messages yet</p>
              <p className="text-sm mt-1">Your friends' birthday wishes will appear here.</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="break-inside-avoid rounded-2xl overflow-hidden shadow-lg shadow-sage-900/20 animate-slide-up"
                  style={{ backgroundColor: msg.card_color || '#FAF8F5' }}
                >
                  {/* Photo */}
                  {msg.photo_path && (
                    <div className="relative">
                      <img
                        src={getPhotoUrl(msg.photo_path)}
                        alt={msg.sender_name}
                        className="w-full object-cover max-h-48"
                        loading="lazy"
                      />
                      {/* Heart button */}
                      <button
                        onClick={() => toggleHeart(msg)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-cream-50/90 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90 hover:bg-cream-50"
                        aria-label="Heart"
                      >
                        <Heart
                          size={16}
                          className={`transition-all ${
                            msg.hearted
                              ? 'fill-accent-rose text-accent-rose animate-heart-pop'
                              : 'text-sage-400'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Heart button when no photo */}
                  {!msg.photo_path && (
                    <div className="flex justify-end pt-2 pr-2">
                      <button
                        onClick={() => toggleHeart(msg)}
                        className="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center transition-all active:scale-90 hover:bg-sage-200"
                        aria-label="Heart"
                      >
                        <Heart
                          size={14}
                          className={`transition-all ${
                            msg.hearted
                              ? 'fill-accent-rose text-accent-rose animate-heart-pop'
                              : 'text-sage-400'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Voice player */}
                  {msg.voice_path && (
                    <div className="px-3 pt-1.5">
                      <button
                        onClick={() => toggleAudio(msg)}
                        className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-xl bg-mint-100 hover:bg-mint-200 transition-colors"
                      >
                        <span className="w-7 h-7 rounded-full bg-sage-500 text-cream-50 flex items-center justify-center flex-shrink-0">
                          {playingAudio === msg.id ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                        </span>
                        <div className="flex-1 flex items-center gap-0.5">
                          {[...Array(16)].map((_, i) => (
                            <span
                              key={i}
                              className="w-0.5 bg-sage-400 rounded-full"
                              style={{
                                height: `${3 + Math.sin(i * 0.8) * 5 + Math.random() * 3}px`,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-sage-500 flex-shrink-0">Voice</span>
                      </button>
                    </div>
                  )}

                  {/* Message body */}
                  <div className="p-3">
                    <p className={`text-xs sm:text-sm text-sage-700 leading-relaxed ${!msg.photo_path ? 'pt-0' : 'pt-0.5'}`}>
                      {msg.message && msg.message.length > 200
                        ? `${msg.message.slice(0, 200)}... `
                        : msg.message}
                      {msg.message && msg.message.length > 200 && (
                        <span className="text-sage-500 font-medium">Read More</span>
                      )}
                    </p>
                    <p className="text-xs text-sage-500 font-medium mt-1.5">
                      — {msg.sender_name}
                    </p>

                    {/* Reply section */}
                    {msg.reply && !replyingTo && (
                      <div className="mt-2 bg-mint-100 rounded-xl p-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-sage-500 mb-0.5">
                          <MessageCircle size={11} />
                          Your reply
                        </div>
                        <p className="text-xs sm:text-sm text-sage-700 italic">"{msg.reply}"</p>
                      </div>
                    )}

                    {/* Reply input */}
                    {replyingTo === msg.id ? (
                      <div className="mt-2 animate-fade-in">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply to this friend..."
                          rows={2}
                          autoFocus
                          className="w-full px-2.5 py-2 rounded-xl bg-white border border-sage-200 text-sm text-sage-700 placeholder:text-sage-300 focus:border-sage-500 focus:outline-none resize-none"
                        />
                        <div className="flex gap-2 mt-1.5">
                          <button
                            onClick={() => saveReply(msg)}
                            className="flex-1 py-1.5 rounded-lg bg-sage-500 text-cream-50 text-sm font-medium hover:bg-sage-600 transition-colors"
                          >
                            Save Reply
                          </button>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            className="px-3 py-1.5 rounded-lg bg-sage-100 text-sage-600 text-sm font-medium hover:bg-sage-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingTo(msg.id); setReplyText(msg.reply || ''); }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-sage-500 hover:text-sage-700 transition-colors font-medium"
                      >
                        <MessageCircle size={12} />
                        {msg.reply ? 'Edit reply' : 'Reply to this friend'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
