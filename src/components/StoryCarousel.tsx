import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STORIES = [
  '/images/img1.jpg',
  '/images/img2.jpg',
  '/images/img3.jpg',
  '/images/img5.jpg',
  '/images/bg.jpg',
];

const STORY_DURATION = 5000;

export default function StoryCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % STORIES.length);
    setProgress(0);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + STORIES.length) % STORIES.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (currentIndex === STORIES.length - 1) {
            setCurrentIndex(0);
          } else {
            setCurrentIndex((prev) => prev + 1);
          }
          return 0;
        }
        return p + 100 / (STORY_DURATION / 50);
      });
    }, 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentIndex, paused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="w-full max-w-sm mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars */}
      <div className="flex gap-1 mb-2 px-1">
        {STORIES.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-sage-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-sage-500 rounded-full transition-all duration-75"
              style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Story image */}
      <div
        className="relative rounded-2xl overflow-hidden bg-sage-100 aspect-[4/5] shadow-lg shadow-sage-900/10"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
      >
        {STORIES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`TJ story ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              i === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-sage-900/30 via-transparent to-transparent pointer-events-none" />

        {/* Nav arrows */}
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cream-50/80 backdrop-blur-sm flex items-center justify-center text-sage-700 hover:bg-cream-50 transition-all active:scale-90"
          aria-label="Previous story"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cream-50/80 backdrop-blur-sm flex items-center justify-center text-sage-700 hover:bg-cream-50 transition-all active:scale-90"
          aria-label="Next story"
        >
          <ChevronRight size={18} />
        </button>

        {/* Counter */}
        <div className="absolute bottom-2 right-3 text-xs text-cream-50 font-medium drop-shadow-sm">
          {currentIndex + 1} / {STORIES.length}
        </div>
      </div>
    </div>
  );
}
