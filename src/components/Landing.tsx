import { useState } from 'react';
import { PenLine, Eye, Heart, Share2, Check } from 'lucide-react';
import StoryCarousel from './StoryCarousel';
import PinModal from './PinModal';
import ShareModal from './ShareModal';

interface LandingProps {
  onCreatePin: (pin: string) => Promise<void>;
  onEnterPin: (pin: string) => Promise<void>;
  onTjClick: () => void;
  showShareModal: boolean;
  onCloseShareModal: () => void;
}

export default function Landing({ onCreatePin, onEnterPin, onTjClick, showShareModal, onCloseShareModal }: LandingProps) {
  const [modalMode, setModalMode] = useState<'create' | 'enter' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (pin: string) => {
    setError(null);
    setLoading(true);
    try {
      if (modalMode === 'create') {
        await onCreatePin(pin);
      } else {
        await onEnterPin(pin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden relative flex flex-col">
      {/* Blurred background */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110 blur-md"
        style={{ backgroundImage: 'url(/images/bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-cream-50/70" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 px-4 lg:px-8 py-3 min-h-0">
        {/* Left: Story Carousel */}
        <div className="flex-shrink-0 w-full max-w-[200px] sm:max-w-[240px] lg:max-w-[260px]">
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
          </div>

          {/* Intro Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm shadow-sage-900/5 border border-sage-100 mb-3">
            <h2 className="font-serif text-base sm:text-lg text-sage-700 mb-1.5 flex items-center gap-2">
              <Heart size={15} className="text-accent-rose" />
              A Friend of TJ
            </h2>
            <p className="text-xs sm:text-sm text-sage-600 leading-relaxed">
              This is a <strong className="text-sage-700">secret surprise birthday app</strong> for TJ.
              She doesn't know about it yet — she'll see everything on{' '}
              <strong className="text-sage-700">October 1, 2026</strong>. Leave a message,
              a photo, or a voice note to make her day unforgettable.
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
      <button
        onClick={onTjClick}
        className="relative pb-3 pt-1 text-center text-xs text-sage-500 hover:text-sage-700 transition-colors flex-shrink-0"
      >
        If you're TJ, click here
      </button>

      {modalMode && (
        <PinModal
          mode={modalMode}
          onClose={() => { setModalMode(null); setError(null); }}
          onSubmit={handleSubmit}
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
