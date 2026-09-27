import { useEffect, useState } from 'react';
import { PenLine, Eye, Heart, Play, Pause } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StoryCarousel from './StoryCarousel';
import PinModal from './PinModal';
import ShareModal from './ShareModal';

interface LandingProps {
  onCreatePin: (pin: string) => Promise<void>;
  onVerifyIdentity: (pin: string, name: string) => Promise<void>;
  onTjClick: () => void;
  showShareModal: boolean;
  onCloseShareModal: () => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
}

export default function Landing({ onCreatePin, onVerifyIdentity, onTjClick, showShareModal, onCloseShareModal, isMusicPlaying, onToggleMusic }: LandingProps) {
  const [modalMode, setModalMode] = useState<'create' | 'enter' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const updateMessageCount = async () => {
      const { count, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true });
      if (!countError && isMounted) setMessageCount(count ?? 0);
    };

    void updateMessageCount();
    const channel = supabase
      .channel('landing-message-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void updateMessageCount();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (pin: string) => {
    setError(null);
    setLoading(true);
    try {
      await onCreatePin(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIdentity = async (pin: string, name: string) => {
    setError(null);
    setLoading(true);
    try {
      await onVerifyIdentity(pin, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto lg:overflow-hidden">
      {/* Blurred background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center blur-[5px]"
          style={{ backgroundImage: 'url(/images/bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-cream-50/70" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col lg:flex-row items-center justify-center gap-3 sm:gap-4 lg:gap-8 px-4 lg:px-8 py-3 lg:min-h-0">
        {/* Left: Story Carousel */}
        <div className="flex-shrink-0 w-full max-w-[clamp(140px,28dvh,200px)] sm:max-w-[240px] lg:max-w-[260px]">
          <StoryCarousel />
        </div>

        {/* Right: Header + Intro + Actions */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full min-h-0">
          {/* Header */}
          <div className="text-center lg:text-left mb-3">
            <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl text-sage-700 leading-tight">
              TJ's 22nd Birthday Wall
            </h1>
            <p className="text-xs sm:text-sm text-sage-500 mt-0.5 font-medium tracking-wide">
              October 1, 2026
            </p>
            {messageCount !== null && (
              <p className="mt-1 text-xs font-medium text-sage-500" aria-live="polite">
                {messageCount} {messageCount === 1 ? 'message' : 'messages'}
              </p>
            )}
          </div>

          {/* Intro Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm shadow-sage-900/5 border border-sage-100 mb-3">
            <h2 className="font-serif text-base sm:text-lg text-sage-700 mb-1.5 flex items-center gap-2">
              <Heart size={15} className="text-accent-rose" />
              A Message for Tj
            </h2>
            <p className="text-xs sm:text-sm text-sage-600 leading-relaxed">
              This is a <strong className="text-sage-700">secret surprise birthday app</strong> for TJ.
              She doesn't know about it yet — she'll see everything on{' '}
              <strong className="text-sage-700">October 1, 2026</strong>. Leave a message,
              a photo, or a voice note to make her day better.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => { setModalMode('create'); setError(null); }}
              className="w-full py-3 sm:py-3.5 rounded-2xl bg-sage-500 text-cream-50 font-medium flex items-center justify-center gap-2.5 hover:bg-sage-600 transition-all active:scale-[0.98] shadow-md shadow-sage-900/15"
            >
              <PenLine size={18} />
              Leave a Message
            </button>
            <button
              onClick={() => { setModalMode('enter'); setError(null); }}
              className="w-full py-3 sm:py-3.5 rounded-2xl bg-white text-sage-700 font-medium flex items-center justify-center gap-2.5 hover:bg-cream-200 transition-all active:scale-[0.98] border-2 border-sage-200"
            >
              <Eye size={18} />
              Edit / View My Message
            </button>
          </div>
        </div>
      </div>

      {/* TJ Secret Entry */}
      <div className="relative flex flex-shrink-0 items-center justify-center px-12 pb-3 pt-1">
        <button
          onClick={onTjClick}
          className="text-center text-xs text-sage-500 transition-colors hover:text-sage-700"
        >
          If you're TJ, click here
        </button>
        <button
          onClick={onToggleMusic}
          className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full bg-cream-50/80 text-sage-600 transition-colors hover:bg-cream-50"
          aria-label={isMusicPlaying ? 'Pause background music' : 'Play background music'}
          aria-pressed={isMusicPlaying}
          title={isMusicPlaying ? 'Pause background music' : 'Play background music'}
        >
          {isMusicPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
      {modalMode && (
        <PinModal
          mode={modalMode}
          onClose={() => { setModalMode(null); setError(null); }}
          onSubmit={handleSubmit}
          onVerifyIdentity={handleVerifyIdentity}
          error={error}
          loading={loading}
        />
      )}

      {showShareModal && (
        <ShareModal onClose={onCloseShareModal} />
      )}
    </div>
  );
}
