import { useState } from 'react';
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
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const handleCreatePin = async (pin: string) => {
    setPinError(null);
    setPinLoading(true);
    try {
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
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPinLoading(false);
    }
  };

  const handleEnterPin = async (pin: string) => {
    // This is called for create mode; for enter mode we use handleVerifyIdentity
  };

  const handleVerifyIdentity = async (pin: string, name: string) => {
    setPinError(null);
    setPinLoading(true);
    try {
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
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPinLoading(false);
    }
  };

  const handleBackToLanding = () => {
    setView('landing');
    setCurrentPin(null);
    setExistingMessage(null);
    setPinError(null);
  };

  const handleSaved = () => {
    setView('landing');
    setCurrentPin(null);
    setExistingMessage(null);
    setShowShareModal(true);
  };

  if (view === 'contributor' && currentPin) {
    return (
      <ContributorScreen
        pin={currentPin}
        existingMessage={existingMessage}
        onBack={handleBackToLanding}
        onSaved={handleSaved}
      />
    );
  }

  if (view === 'tj-wall') {
    return <TjWall onBack={handleBackToLanding} />;
  }

  return (
    <>
      <Landing
        onCreatePin={handleCreatePin}
        onEnterPin={handleEnterPin}
        onTjClick={() => setShowTjLogin(true)}
        showShareModal={showShareModal}
        onCloseShareModal={() => setShowShareModal(false)}
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

export default App;
