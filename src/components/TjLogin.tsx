import { useState, useRef, useEffect } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';

interface TjLoginProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TJ_SECRET_CODE = '2201';

export default function TjLogin({ onClose, onSuccess }: TjLoginProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = code.split('');
    newCode[index] = value;
    const updated = newCode.join('').slice(0, 4);
    setCode(updated);
    setError(false);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    if (updated.length === 4) {
      inputRefs.current[index]?.blur();
      if (updated === TJ_SECRET_CODE) {
        setTimeout(onSuccess, 200);
      } else {
        setError(true);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
          <div className="inline-flex w-12 h-12 rounded-full bg-sage-100 items-center justify-center mb-3">
            <Lock size={22} className="text-sage-600" />
          </div>
          <h3 className="font-serif text-xl text-sage-700 mb-1">TJ's Secret Code</h3>
          <p className="text-sm text-sage-500">Enter your 4-digit secret code</p>
        </div>

        <div className="flex gap-3 justify-center mb-4">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={code[i] || ''}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-serif text-sage-700 bg-white border-2 border-sage-200 rounded-xl focus:border-sage-500 focus:outline-none transition-colors"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-sm text-accent-rose animate-fade-in">
            <AlertCircle size={15} />
            <span>Incorrect code. Try again.</span>
          </div>
        )}
      </div>
    </div>
  );
}
