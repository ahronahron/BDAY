import { useState } from 'react';
import { X, Share2, Copy, Check, MessageCircle } from 'lucide-react';

interface ShareModalProps {
  onClose: () => void;
}

export default function ShareModal({ onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback - select text
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "TJ's 22nd Birthday Wall",
          text: "Help me surprise TJ for her 22nd birthday! Leave her a message, photo, or voice note.",
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-sage-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-cream-50 rounded-3xl shadow-2xl shadow-sage-900/20 w-full max-w-sm p-6 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 hover:bg-sage-200 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex w-14 h-14 rounded-full bg-mint-100 items-center justify-center mb-3">
            <Share2 size={26} className="text-sage-600" />
          </div>
          <h3 className="font-serif text-xl text-sage-700 mb-1.5">Your message is saved!</h3>
          <p className="text-sm text-sage-500 leading-relaxed">
            Share this app with friends who know TJ so they can leave a message too.
            The more love, the better the surprise!
          </p>
        </div>

        {/* Info card */}
        <div className="bg-mint-100 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-start gap-2 text-xs text-sage-600">
            <Check size={14} className="text-sage-500 flex-shrink-0 mt-0.5" />
            <span>Re-enter your 4-digit code anytime to edit your message or add more.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-sage-600">
            <MessageCircle size={14} className="text-sage-500 flex-shrink-0 mt-0.5" />
            <span>After TJ's birthday on October 1, come back to see her replies and reactions!</span>
          </div>
        </div>

        {/* Share buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleNativeShare}
            className="w-full py-3 rounded-xl bg-sage-500 text-cream-50 font-medium flex items-center justify-center gap-2 hover:bg-sage-600 transition-colors active:scale-[0.98]"
          >
            <Share2 size={18} />
            Share with friends
          </button>
          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-xl bg-white text-sage-700 font-medium flex items-center justify-center gap-2 hover:bg-cream-200 transition-colors border-2 border-sage-200 active:scale-[0.98]"
          >
            {copied ? <Check size={18} className="text-sage-500" /> : <Copy size={18} />}
            {copied ? 'Link copied!' : 'Copy link'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2.5 text-sm text-sage-500 hover:text-sage-700 transition-colors font-medium"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
