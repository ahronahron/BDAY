import { useState, useEffect, useRef } from 'react';
import { X, Lock, AlertCircle, User } from 'lucide-react';

interface PinModalProps {
  mode: 'create' | 'enter';
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  onVerifyIdentity?: (pin: string, name: string) => Promise<void>;
  expectedName?: string | null;
  error?: string | null;
  loading?: boolean;
}

export default function PinModal({ mode, onClose, onSubmit, onVerifyIdentity, expectedName, error, loading }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState<'pin' | 'name'>('pin');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (step === 'pin') {
      inputRefs.current[0]?.focus();
    } else {
      nameInputRef.current?.focus();
    }
  }, [step]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = pin.split('');
    newPin[index] = value;
    const updated = newPin.join('').slice(0, 4);
    setPin(updated);
    setLocalError(null);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (updated.length === 4) {
      inputRefs.current[index]?.blur();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setLocalError('Please enter all 4 digits');
      return;
    }
    if (mode === 'enter' && onVerifyIdentity) {
      setStep('name');
    } else {
      await onSubmit(pin);
    }
  };

  const handleNameSubmit = async () => {
    if (!name.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    if (onVerifyIdentity) {
      await onVerifyIdentity(pin, name.trim());
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-sage-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-cream-50 rounded-3xl shadow-2xl shadow-sage-900/20 w-full max-w-sm p-6 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 hover:bg-sage-200 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {step === 'pin' ? (
          <>
            <div className="text-center mb-5">
              <div className="inline-flex w-12 h-12 rounded-full bg-sage-100 items-center justify-center mb-3">
                <Lock size={22} className="text-sage-600" />
              </div>
              <h3 className="font-serif text-xl text-sage-700 mb-1">
                {mode === 'create' ? 'Create Your PIN' : 'Enter Your PIN'}
              </h3>
              <p className="text-sm text-sage-500">
                {mode === 'create'
                  ? 'Pick a 4-digit code to protect your message'
                  : 'Enter your 4-digit code to view your message'}
              </p>
            </div>

            <div className="flex gap-3 justify-center mb-4">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={pin[i] || ''}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center text-xl font-serif text-sage-700 bg-white border-2 border-sage-200 rounded-xl focus:border-sage-500 focus:outline-none transition-colors"
                />
              ))}
            </div>

            {displayError && (
              <div className="flex items-center justify-center gap-2 text-sm text-accent-rose mb-3 animate-fade-in">
                <AlertCircle size={15} />
                <span>{displayError}</span>
              </div>
            )}

            <button
              onClick={handlePinSubmit}
              disabled={pin.length !== 4 || loading}
              className="w-full py-3 rounded-xl bg-sage-500 text-cream-50 font-medium hover:bg-sage-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Checking...' : mode === 'create' ? 'Create & Continue' : 'Continue'}
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="inline-flex w-12 h-12 rounded-full bg-sage-100 items-center justify-center mb-3">
                <User size={22} className="text-sage-600" />
              </div>
              <h3 className="font-serif text-xl text-sage-700 mb-1">Confirm Your Identity</h3>
              <p className="text-sm text-sage-500">
                Enter the name you used when you created your message
              </p>
            </div>

            <div className="mb-4">
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setLocalError(null); }}
                placeholder="Your name"
                disabled={loading}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSubmit(); }}
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-sage-200 text-sage-700 placeholder:text-sage-300 focus:border-sage-500 focus:outline-none transition-colors text-center"
              />
            </div>

            {displayError && (
              <div className="flex items-center justify-center gap-2 text-sm text-accent-rose mb-3 animate-fade-in">
                <AlertCircle size={15} />
                <span>{displayError}</span>
              </div>
            )}

            <button
              onClick={handleNameSubmit}
              disabled={!name.trim() || loading}
              className="w-full py-3 rounded-xl bg-sage-500 text-cream-50 font-medium hover:bg-sage-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'View My Message'}
            </button>
            <button
              onClick={() => { setStep('pin'); setLocalError(null); setName(''); }}
              className="w-full mt-2 py-2 text-sm text-sage-500 hover:text-sage-700 transition-colors"
            >
              Back to PIN
            </button>
          </>
        )}
      </div>
    </div>
  );
}
