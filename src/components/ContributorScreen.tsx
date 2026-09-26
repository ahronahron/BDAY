import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, Square, Play, Pause, Upload, Trash2, Check, Heart, MessageCircle, Palette } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

const CARD_COLORS = [
  { name: 'Mint', value: '#E8F0EC' },
  { name: 'Sage', value: '#D0DFD6' },
  { name: 'Cream', value: '#FAF8F5' },
  { name: 'Rose', value: '#F5E0E2' },
  { name: 'Sky', value: '#DCE8F0' },
  { name: 'Gold', value: '#F5EDD8' },
  { name: 'Lavender', value: '#E8E0F0' },
  { name: 'Peach', value: '#FAE8DC' },
];

interface ContributorScreenProps {
  pin: string;
  existingMessage: Message | null;
  onBack: () => void;
  onSaved: () => void;
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => { if (blob) resolve(blob); else reject(new Error('Compression failed')); },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function ContributorScreen({ pin, existingMessage, onBack, onSaved }: ContributorScreenProps) {
  const [senderName, setSenderName] = useState(existingMessage?.sender_name || '');
  const [message, setMessage] = useState(existingMessage?.message || '');
  const [photoPath, setPhotoPath] = useState(existingMessage?.photo_path || null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [voicePath, setVoicePath] = useState(existingMessage?.voice_path || null);
  const [cardColor, setCardColor] = useState(existingMessage?.card_color || CARD_COLORS[0].value);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (existingMessage?.photo_path) {
      const { data } = supabase.storage.from('birthday-media').getPublicUrl(existingMessage.photo_path);
      setPhotoPreview(data.publicUrl);
    }
  }, [existingMessage]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileName = `voice/${pin}-${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('birthday-media')
          .upload(fileName, blob, { contentType: 'audio/webm', upsert: true });
        if (uploadError) {
          setError('Failed to save voice message');
        } else {
          setVoicePath(fileName);
          const url = URL.createObjectURL(blob);
          if (audioRef.current) {
            audioRef.current.src = url;
          }
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteVoice = () => {
    setVoicePath(null);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10MB');
      return;
    }
    try {
      const compressed = await compressImage(file, 1280, 0.75);
      if (compressed.size > 5 * 1024 * 1024) {
        const moreCompressed = await compressImage(file, 800, 0.6);
        const fileName = `photos/${pin}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('birthday-media')
          .upload(fileName, moreCompressed, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw new Error('Failed to upload photo');
        setPhotoPath(fileName);
        setPhotoPreview(URL.createObjectURL(moreCompressed));
      } else {
        const fileName = `photos/${pin}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('birthday-media')
          .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw new Error('Failed to upload photo');
        setPhotoPath(fileName);
        setPhotoPreview(URL.createObjectURL(compressed));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    }
  };

  const removePhoto = () => {
    setPhotoPath(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoPlaying) {
      videoRef.current.pause();
      setVideoPlaying(false);
    } else {
      videoRef.current.play();
      setVideoPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!senderName.trim()) {
      setError('Please enter your name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        pin,
        sender_name: senderName.trim(),
        message: message.trim() || null,
        photo_path: photoPath,
        voice_path: voicePath,
        card_color: cardColor,
      };

      if (existingMessage) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            sender_name: payload.sender_name,
            message: payload.message,
            photo_path: payload.photo_path,
            voice_path: payload.voice_path,
            card_color: payload.card_color,
          })
          .eq('pin', pin);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('messages')
          .insert(payload);
        if (insertError) throw insertError;
      }

      setSaved(true);
      setTimeout(() => {
        onSaved();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-cream-50 via-cream-100 to-mint-100 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-cream-50/90 backdrop-blur-md border-b border-sage-100">
        <div className="flex items-center px-4 py-2.5 max-w-3xl mx-auto">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 hover:bg-sage-200 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-serif text-base sm:text-lg text-sage-700 ml-2.5">
            {existingMessage ? 'Your Message' : 'Write Your Message'}
          </h2>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
          {/* TJ's Response Section (if re-entering) */}
          {existingMessage && (existingMessage.hearted || existingMessage.reply) && (
            <div className="bg-mint-100 rounded-2xl p-3 border border-sage-200 animate-slide-up">
              {existingMessage.hearted && (
                <div className="flex items-center gap-2 text-sage-700 font-medium mb-1.5 text-sm">
                  <Heart size={16} className="fill-accent-rose text-accent-rose" />
                  <span>TJ loved your note!</span>
                </div>
              )}
              {existingMessage.reply && (
                <div className="mt-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-sage-500 mb-1">
                    <MessageCircle size={12} />
                    TJ's reply to you:
                  </div>
                  <p className="text-sm text-sage-700 bg-white/60 rounded-xl p-2.5 italic">
                    "{existingMessage.reply}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Two-column layout on desktop: video left, form right */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Video - tap to play/pause */}
            <div
              className="relative rounded-2xl overflow-hidden bg-sage-800 aspect-video lg:w-1/3 lg:aspect-auto lg:min-h-[130px] shadow-lg shadow-sage-900/10 flex-shrink-0 cursor-pointer group"
              onClick={toggleVideo}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onEnded={() => setVideoPlaying(false)}
                playsInline
                preload="metadata"
              >
                <source src="/images/bg.jpg" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-br from-sage-600/40 to-sage-900/40 pointer-events-none" />
              {!videoPlaying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-cream-50 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-cream-50/20 backdrop-blur-sm flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <Play size={20} className="ml-0.5" />
                  </div>
                  <p className="text-xs font-medium">Tap to play</p>
                </div>
              )}
              {videoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-cream-50/15 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pause size={18} className="text-cream-50" />
                  </div>
                </div>
              )}
            </div>

            {/* Identity & Wish Form */}
            <div className="flex-1 space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-sage-600 mb-1">
                  Who are you?
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-sage-200 text-sm text-sage-700 placeholder:text-sage-300 focus:border-sage-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-sage-600 mb-1">
                  Birthday Wish
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your birthday message to TJ..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-sage-200 text-sm text-sage-700 placeholder:text-sage-300 focus:border-sage-500 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card Color Picker */}
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1.5 flex items-center gap-1.5">
              <Palette size={13} />
              Card Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setCardColor(color.value)}
                  className={`w-9 h-9 rounded-full border-2 transition-all active:scale-90 ${
                    cardColor === color.value
                      ? 'border-sage-600 scale-110 shadow-md'
                      : 'border-sage-200 hover:border-sage-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-label={color.name}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Voice Recorder + Photo Upload side by side on desktop */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Voice Recorder */}
            <div className="relative flex-1">
              <div className="absolute -top-2 left-3 bg-gradient-to-r from-sage-500 to-sage-600 text-cream-50 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm z-10">
                Voice Message
              </div>
              <div className="bg-white rounded-2xl border-2 border-sage-200 p-3 pt-4">
                {!voicePath && !isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mint-100 text-sage-700 font-medium text-sm hover:bg-mint-200 transition-colors active:scale-[0.98]"
                  >
                    <Mic size={18} />
                    Record a voice greeting
                  </button>
                ) : isRecording ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-rose animate-pulse" />
                      <span className="text-sage-700 font-mono text-sm">{formatTime(recordingTime)}</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-rose text-cream-50 text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Square size={14} />
                      Stop
                    </button>
                  </div>
                ) : voicePath ? (
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={togglePlayback}
                      className="w-9 h-9 rounded-full bg-sage-500 text-cream-50 flex items-center justify-center hover:bg-sage-600 transition-colors flex-shrink-0"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>
                    <div className="flex-1 h-2 bg-sage-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sage-400 rounded-full" style={{ width: isPlaying ? '100%' : '30%' }} />
                    </div>
                    <button
                      onClick={deleteVoice}
                      className="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center text-sage-500 hover:bg-sage-200 transition-colors flex-shrink-0"
                      aria-label="Delete voice"
                    >
                      <Trash2 size={14} />
                    </button>
                    <audio
                      ref={audioRef}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Photo Upload - wider preview */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-sage-600 mb-1">
                Add a Photo
              </label>
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden group">
                  <img src={photoPreview} alt="Upload preview" className="w-full h-32 object-cover" />
                  <button
                    onClick={removePhoto}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-cream-50/90 flex items-center justify-center text-accent-rose hover:bg-cream-50 transition-colors shadow-sm"
                    aria-label="Remove photo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-sage-200 text-sage-500 hover:border-sage-400 hover:bg-sage-50 transition-colors flex flex-col items-center justify-center gap-2 text-sm font-medium"
                >
                  <Upload size={22} />
                  Upload a photo with TJ
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Error */}
          {error && !isRecording && <p className="text-sm text-accent-rose text-center">{error}</p>}
        </div>
      </div>

      {/* Save Button - fixed at bottom */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-cream-50/90 backdrop-blur-md border-t border-sage-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full max-w-3xl mx-auto py-3 rounded-2xl bg-sage-500 text-cream-50 font-medium flex items-center justify-center gap-2 hover:bg-sage-600 transition-all active:scale-[0.98] shadow-md shadow-sage-900/15 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? (
            <>
              <Check size={18} />
              Saved!
            </>
          ) : (
            'Save My Message'
          )}
        </button>
      </div>
    </div>
  );
}
