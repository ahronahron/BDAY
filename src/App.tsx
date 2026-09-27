import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import Landing from '@/components/Landing';
import ContributorScreen from '@/components/ContributorScreen';
import TjWall from '@/components/TjWall';
import TjLogin from '@/components/TjLogin';
import { supabase } from '@/lib/supabase';
import type { Message, View } from '@/types';

function App() {
  const [view, setView] = useState<View>('landing');
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [existingMessage, setExistingMessage] = useState<Message | null>(null);
  const [showTjLogin, setShowTjLogin] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = backgroundAudioRef.current;
    if (!audio || sessionStorage.getItem('birthday-intro-audio-attempted')) return;

    sessionStorage.setItem('birthday-intro-audio-attempted', 'true');
    void audio.play().catch(() => setIsMusicPlaying(false));
  }, []);

  const toggleBackgroundMusic = () => {
    const audio = backgroundAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch(() => setIsMusicPlaying(false));
    } else {
      audio.pause();
    }
  };

  const handleCreatePin = async (pin: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('pin', pin)
      .maybeSingle();

    if (error) throw new Error('Something went wrong. Please try again.');
    if (data) throw new Error('That code is already taken. Pick another one.');

    setCurrentPin(pin);
    setExistingMessage(null);
    setView('contributor');
  };

  const handleVerifyIdentity = async (pin: string, name: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('pin', pin)
      .maybeSingle();

    if (error) throw new Error('Something went wrong. Please try again.');
    if (!data) throw new Error('No message found with that code.');

    const fetchedData = data as Message;
    if (fetchedData.sender_name.toLowerCase().trim() !== name.toLowerCase().trim()) {
      throw new Error('Name does not match this code. Please check and try again.');
    }

    setCurrentPin(pin);
    setExistingMessage(fetchedData);
    setView('contributor');
  };

  const handleBackToLanding = () => {
    setView('landing');
    setCurrentPin(null);
    setExistingMessage(null);
  };

  const handleSaved = () => {
    setView('landing');
    setCurrentPin(null);
    setExistingMessage(null);
    setShowShareModal(true);
  };

  let currentScreen;
  if (view === 'contributor' && currentPin) {
    currentScreen = (
      <ContributorScreen
        pin={currentPin}
        existingMessage={existingMessage}
        onBack={handleBackToLanding}
        onSaved={handleSaved}
      />
    );
  } else if (view === 'tj-wall') {
    currentScreen = (
      <TjWall
        onBack={handleBackToLanding}
        isMusicPlaying={isMusicPlaying}
        onToggleMusic={toggleBackgroundMusic}
      />
    );
  } else {
    currentScreen = (
      <>
      <Landing
        onCreatePin={handleCreatePin}
        onVerifyIdentity={handleVerifyIdentity}
        onTjClick={() => setShowTjLogin(true)}
        showShareModal={showShareModal}
        onCloseShareModal={() => setShowShareModal(false)}
        isMusicPlaying={isMusicPlaying}
        onToggleMusic={toggleBackgroundMusic}
      />
      {showTjLogin && (
        <TjLogin
          onClose={() => setShowTjLogin(false)}
          onSuccess={() => {
            setShowTjLogin(false);
            setView('tj-wall');
          }}
        />
      )}
      </>
    );
  }

  return (
    <>
      {currentScreen}
      <audio
        ref={backgroundAudioRef}
        src="/audio/IV%20OF%20SPADES%20-%20Tangerine%20Boulevard%20(Official%20Lyric%20Video).mp3"
        preload="auto"
        onPlay={() => setIsMusicPlaying(true)}
        onPause={() => setIsMusicPlaying(false)}
        onEnded={() => setIsMusicPlaying(false)}
        className="hidden"
      />
    </>
  );
}

export default App;
