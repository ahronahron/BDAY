import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, MessageCircle, Play, Pause, Quote, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

interface TjWallProps {
  onBack: () => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
}

function getCardTextColor(color: string) {
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#2D4A3E';

  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const linearize = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);

  return luminance > 0.45 ? '#2D4A3E' : '#FFFDF9';
}

function getMessagePhotoUrls(message: Message) {
  const photoUrls = message.photo_urls ?? [];
  if (!message.photo_path) return photoUrls;

  const { data } = supabase.storage.from('birthday-media').getPublicUrl(message.photo_path);
  return photoUrls.includes(data.publicUrl) ? photoUrls : [data.publicUrl, ...photoUrls];
}

export default function TjWall({ onBack, isMusicPlaying, onToggleMusic }: TjWallProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [coverProgress, setCoverProgress] = useState(0);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  const goToMessage = useCallback((direction: 'prev' | 'next') => {
    if (messages.length === 0) return;

    const currentIndex = messages.findIndex((msg) => msg.id === selectedMessageId);
    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % messages.length
        : (currentIndex - 1 + messages.length) % messages.length;

    setSelectedMessageId(messages[nextIndex].id);
  }, [messages, selectedMessageId]);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!selectedMessageId && !fullImageUrl && !replyingTo) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (fullImageUrl) {
          setFullImageUrl(null);
        } else if (replyingTo) {
          setReplyingTo(null);
        } else {
          setSelectedMessageId(null);
        }
      }
      if (fullImageUrl || replyingTo || !selectedMessageId) return;
      if (event.key === 'ArrowRight') {
        goToMessage('next');
      }
      if (event.key === 'ArrowLeft') {
        goToMessage('prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMessageId, fullImageUrl, replyingTo, messages, goToMessage]);

  useEffect(() => {
    const scrollArea = modalScrollRef.current;
    if (!scrollArea || !selectedMessageId) return;

    const handleScroll = () => {
      const nextProgress = Math.min(scrollArea.scrollTop / 260, 1);
      setCoverProgress(nextProgress);
    };

    handleScroll();
    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [selectedMessageId]);

  const selectedMessage = messages.find((msg) => msg.id === selectedMessageId) ?? null;
  const selectedPhotoUrls = selectedMessage ? getMessagePhotoUrls(selectedMessage) : [];
  const activeStoryPhoto = selectedPhotoUrls.length > 0
    ? selectedPhotoUrls[activeStoryIndex % selectedPhotoUrls.length]
    : null;
  const replyTarget = messages.find((msg) => msg.id === replyingTo) ?? null;

  const changeStoryPhoto = (direction: 'prev' | 'next') => {
    if (selectedPhotoUrls.length < 2) return;
    setActiveStoryIndex((index) => (
      direction === 'next'
        ? (index + 1) % selectedPhotoUrls.length
        : (index - 1 + selectedPhotoUrls.length) % selectedPhotoUrls.length
    ));
  };

  useEffect(() => {
    setActiveStoryIndex(0);
  }, [selectedMessageId]);

  useEffect(() => {
    if (!selectedMessageId || selectedPhotoUrls.length < 2 || fullImageUrl) return;

    const timeoutId = window.setTimeout(() => {
      setActiveStoryIndex((index) => (index + 1) % selectedPhotoUrls.length);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [selectedMessageId, selectedPhotoUrls.length, activeStoryIndex, fullImageUrl]);

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
    setSavingReply(true);
    setReplyError(null);
    try {
      const { error } = await supabase
        .from('messages')
        .update({ reply: replyText.trim() })
        .eq('id', msg.id);
      if (error) throw error;
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, reply: replyText.trim() } : m))
      );
      setReplyingTo(null);
      setReplyText('');
    } catch {
      setReplyError('Could not save the reply. Please try again.');
    } finally {
      setSavingReply(false);
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

  return (
    <div className="relative isolate h-[100dvh] overflow-hidden flex flex-col">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-center scale-110 blur-md"
        style={{ backgroundImage: 'url(/images/bg.jpg)' }}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-sage-900/55" />

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
          <span className="mr-3 text-xs font-medium text-cream-50/80" aria-live="polite">
            {loading ? '—' : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
          </span>
          <button
            type="button"
            onClick={onToggleMusic}
            className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-sage-600 text-cream-50 transition-colors hover:bg-sage-500"
            aria-label={isMusicPlaying ? 'Pause background music' : 'Resume background music'}
            aria-pressed={isMusicPlaying}
            title={isMusicPlaying ? 'Pause background music' : 'Resume background music'}
          >
            {isMusicPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <Quote size={16} className="text-cream-50/40 flex-shrink-0" />
        </div>
        <div className="px-4 pb-2 max-w-5xl mx-auto">
          <p className="font-serif text-xs sm:text-sm text-cream-50/80 italic">
            "Connections that are threads woven through every season of my life."
          </p>
        </div>
      </div>

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
            <div className="grid grid-cols-2 items-start gap-3 sm:gap-4">
              {messages.map((msg) => {
                const cardColor = msg.card_color || '#FAF8F5';
                const cardTextColor = getCardTextColor(cardColor);
                const highlight = msg.message?.trim() || 'Birthday wish for TJ';
                const photoUrls = getMessagePhotoUrls(msg);

                return (
                  <article
                    key={msg.id}
                    className="cursor-pointer overflow-hidden rounded-lg shadow-md shadow-sage-900/15 animate-slide-up transition-transform hover:-translate-y-0.5"
                    style={{ backgroundColor: cardColor }}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest('button, textarea')) return;
                      setSelectedMessageId(msg.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedMessageId(msg.id);
                      }
                    }}
                  >
                    <div className="flex h-28 sm:h-32">
                      <div className="relative h-full w-14 flex-shrink-0 bg-sage-100 sm:w-24">
                        {photoUrls.length > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setFullImageUrl(photoUrls[0]);
                            }}
                            className="h-full w-full cursor-zoom-in"
                            aria-label={`View ${msg.sender_name}'s photo full size`}
                          >
                            <img
                              src={photoUrls[0]}
                              alt={`${msg.sender_name}'s photo`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ) : (
                          <div className="flex h-full items-center justify-center text-sage-300">
                            <Heart size={22} />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col p-2 sm:p-3">
                        <div className="flex min-h-0 items-start justify-between gap-1">
                          <p
                            className="min-w-0 flex-1 text-xs font-semibold leading-snug sm:text-sm"
                            style={{
                              color: cardTextColor,
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                            }}
                            title={highlight}
                          >
                            {highlight}
                          </p>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleHeart(msg);
                            }}
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/70 transition-transform active:scale-90"
                            aria-label={`${msg.hearted ? 'Unheart' : 'Heart'} ${msg.sender_name}'s message`}
                            aria-pressed={msg.hearted}
                          >
                            <Heart
                              size={14}
                              className={msg.hearted ? 'fill-accent-rose text-accent-rose' : 'text-sage-400'}
                            />
                          </button>
                        </div>

                        <p className="mt-1 truncate text-[10px] font-medium opacity-75 sm:text-xs" style={{ color: cardTextColor }}>
                          {msg.sender_name}
                        </p>

                        <div className="mt-auto flex items-center gap-1 pt-1">
                          {msg.voice_path && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleAudio(msg);
                              }}
                              className="flex h-7 items-center gap-1 rounded-full bg-white/70 px-1.5 text-sage-700 transition-colors hover:bg-white sm:px-2"
                              aria-label={`${playingAudio === msg.id ? 'Pause' : 'Play'} voice message from ${msg.sender_name}`}
                            >
                              {playingAudio === msg.id ? <Pause size={12} /> : <Play size={12} />}
                              <span className="hidden text-[10px] sm:inline">Voice</span>
                            </button>
                          )}
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setReplyingTo(msg.id);
                              setReplyText(msg.reply || '');
                              setReplyError(null);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-sage-700 transition-colors hover:bg-white"
                            aria-label={`${msg.reply ? 'Edit reply to' : 'Reply to'} ${msg.sender_name}`}
                          >
                            <MessageCircle size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {msg.reply && replyingTo !== msg.id && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setReplyingTo(msg.id);
                          setReplyText(msg.reply || '');
                          setReplyError(null);
                        }}
                        className="flex h-7 w-full min-w-0 items-center overflow-hidden border-t border-sage-900/10 px-2 text-left text-[10px] hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-500 sm:px-3 sm:text-xs"
                        style={{ color: cardTextColor }}
                        aria-label={`View TJ's full reply to ${msg.sender_name}`}
                        title="Click to view full reply"
                      >
                        <span className="block min-w-0 truncate">
                          <span className="font-semibold">TJ:</span> {msg.reply}
                        </span>
                      </button>
                    )}

                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/65 p-2 backdrop-blur-xl sm:p-6">
          <div className="relative h-[88vh] w-full max-w-4xl overflow-hidden rounded-[26px] border border-white/15 bg-[#f7f4ef] text-sage-800 shadow-2xl shadow-sage-950/45">
            <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6">
              <button
                onClick={() => setSelectedMessageId(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-sage-900/45 text-cream-50 backdrop-blur-md transition-colors hover:bg-sage-900/65"
                aria-label="Close message"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToMessage('prev')}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-sage-900/45 text-cream-50 backdrop-blur-md transition-colors hover:bg-sage-900/65"
                  aria-label="Previous message"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => goToMessage('next')}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-sage-900/45 text-cream-50 backdrop-blur-md transition-colors hover:bg-sage-900/65"
                  aria-label="Next message"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div ref={modalScrollRef} className="relative h-full overflow-y-auto scrollbar-hide">
              <div className="relative bg-[#f7f4ef] pb-8">
                <div
                  className="sticky top-0 z-10 overflow-hidden bg-[#f7f4ef] px-3 pb-2 pt-14 sm:px-5 sm:pt-16"
                  style={{
                    height: `${Math.max(180, 330 - coverProgress * 170)}px`,
                    transition: 'height 150ms ease-out',
                  }}
                >
                  <div
                    className="relative h-full overflow-hidden rounded-[24px] border border-white/10 bg-sage-900 shadow-lg shadow-sage-950/40"
                    style={{
                      transform: `translateY(${coverProgress * -24}px) scale(${1 - coverProgress * 0.12})`,
                      filter: `blur(${coverProgress * 5}px)`,
                      opacity: `${1 - coverProgress * 0.9}`,
                      transition: 'transform 150ms ease-out, filter 150ms ease-out, opacity 150ms ease-out',
                    }}
                  >
                    {activeStoryPhoto ? (
                      <button
                        type="button"
                        onClick={() => setFullImageUrl(activeStoryPhoto)}
                        className="absolute inset-0 z-0 cursor-zoom-in"
                        aria-label={`View ${selectedMessage.sender_name}'s photo full size`}
                      >
                        <img
                          key={activeStoryPhoto}
                          src={activeStoryPhoto}
                          alt={`${selectedMessage.sender_name}'s message photo`}
                          className="h-full w-full animate-story-fade object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-sage-200 via-sage-500 to-sage-900">
                        <Heart size={52} className="text-cream-50/80" />
                      </div>
                    )}
                    {selectedPhotoUrls.length > 1 && (
                      <>
                        <div className="pointer-events-none absolute inset-x-4 top-3 z-20 flex gap-1.5">
                          {selectedPhotoUrls.map((_, index) => (
                            <span key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/45">
                              <span
                                key={index === activeStoryIndex ? `${selectedMessage.id}-${activeStoryIndex}` : index}
                                className={`block h-full rounded-full bg-white ${
                                  index < activeStoryIndex
                                    ? 'w-full'
                                    : index === activeStoryIndex
                                      ? 'animate-story-progress'
                                      : 'w-0'
                                }`}
                              />
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => changeStoryPhoto('prev')}
                          className="absolute inset-y-8 left-2 z-20 flex w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-black/20 sm:left-3"
                          aria-label="Previous photo in story"
                        >
                          <ChevronLeft size={26} />
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStoryPhoto('next')}
                          className="absolute inset-y-8 right-2 z-20 flex w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-black/20 sm:right-3"
                          aria-label="Next photo in story"
                        >
                          <ChevronRight size={26} />
                        </button>
                      </>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sage-950/55 via-sage-900/15 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-cream-50 sm:p-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-cream-100/70">From</p>
                        <p className="text-xl font-semibold leading-none">{selectedMessage.sender_name}</p>
                      </div>
                      <button
                        onClick={() => toggleHeart(selectedMessage)}
                        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/12 backdrop-blur-sm transition-colors hover:bg-white/20"
                        aria-label="Heart this message"
                      >
                        <Heart
                          size={18}
                          className={selectedMessage.hearted ? 'fill-accent-rose text-accent-rose' : 'text-cream-50'}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative z-20 mx-3 rounded-[20px] bg-[#f7f4ef] px-4 pb-5 pt-4 sm:mx-5 sm:px-6">
                  <div className="mb-3 flex items-center justify-between border-b border-sage-200 pb-2.5">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-sage-500">Birthday Wish</p>
                      <p className="mt-1 text-base font-semibold text-sage-800">{selectedMessage.sender_name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sage-500">
                      <Quote size={14} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="whitespace-pre-line text-base leading-7 text-sage-800 sm:text-lg sm:leading-8">
                      {selectedMessage.message || 'Happy birthday, TJ!'}
                    </p>

                    {selectedMessage.reply && (
                      <div className="rounded-2xl border border-sage-200 bg-white/70 p-4">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-sage-500">TJ's reply</p>
                        <p className="italic text-sage-700">“{selectedMessage.reply}”</p>
                      </div>
                    )}

                    {selectedMessage.voice_path && (
                      <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-white/80 p-3">
                        <button
                          onClick={() => toggleAudio(selectedMessage)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-500 text-cream-50 transition-colors hover:bg-sage-600"
                          aria-label={playingAudio === selectedMessage.id ? 'Pause voice message' : 'Play voice message'}
                        >
                          {playingAudio === selectedMessage.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </button>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-sage-500">Voice note</p>
                          <p className="text-sm font-medium text-sage-700">Tap to listen</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {fullImageUrl && (
        <button
          type="button"
          onClick={() => setFullImageUrl(null)}
          className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-8"
          aria-label="Close full-size image"
        >
          <img
            src={fullImageUrl}
            alt="Full-size message photo"
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </button>
      )}
      {replyTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-sage-950/65 px-4 py-6 backdrop-blur-md"
          onClick={() => setReplyingTo(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reply-modal-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-sage-200 bg-[#f7f4ef] text-sage-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sage-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-sage-500">TJ's reply</p>
                <h2 id="reply-modal-title" className="mt-1 font-serif text-lg text-sage-800">
                  Reply to {replyTarget.sender_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-sage-600 transition-colors hover:bg-sage-200"
                aria-label="Close reply editor"
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveReply(replyTarget);
              }}
              className="space-y-4 p-5"
            >
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write a reply..."
                aria-label={`Reply to ${replyTarget.sender_name}`}
                rows={6}
                autoFocus
                className="w-full resize-y rounded-xl border border-sage-200 bg-white px-4 py-3 text-sm leading-relaxed text-sage-700 placeholder:text-sage-300 focus:border-sage-500 focus:outline-none"
              />
              {replyError && <p className="text-sm text-accent-rose">{replyError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-sage-700 transition-colors hover:bg-sage-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replyText.trim() || savingReply}
                  className="rounded-xl bg-sage-600 px-5 py-2.5 text-sm font-medium text-cream-50 transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingReply ? 'Saving...' : 'Save reply'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
