import { useState, useRef } from 'react';
import { ArrowLeft, Mic, Square, Play, Pause, Upload, Trash2, Check, Heart, MessageCircle, Palette } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cloudinaryUploadsConfigured, uploadImageToCloudinary } from '@/lib/cloudinary';
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
  { name: 'Seafoam', value: '#D9EEE9' },
  { name: 'Periwinkle', value: '#DFE5FA' },
  { name: 'Coral', value: '#F6D9D0' },
  { name: 'Lemon', value: '#F5EFBD' },
  { name: 'Lilac', value: '#E9DDF3' },
  { name: 'Ice', value: '#E3EFF5' },
  { name: 'Olive', value: '#E5EACF' },
  { name: 'Mauve', value: '#F0DFE8' },
];

interface ContributorScreenProps {
  pin: string;
  existingMessage: Message | null;
  onBack: () => void;
  onSaved: () => void;
}

export default function ContributorScreen({ pin, existingMessage, onBack, onSaved }: ContributorScreenProps) {
  const [senderName, setSenderName] = useState(existingMessage?.sender_name || '');
  const [message, setMessage] = useState(existingMessage?.message || '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => {
    const legacyPhotoUrl = existingMessage?.photo_path
      ? supabase.storage.from('birthday-media').getPublicUrl(existingMessage.photo_path).data.publicUrl
      : null;
    return Array.from(new Set([
      ...(existingMessage?.photo_urls ?? []),
      ...(legacyPhotoUrl ? [legacyPhotoUrl] : []),
    ]));
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<string | null>(null);
  const [voicePath, setVoicePath] = useState(existingMessage?.voice_path || null);
  const [cardColor, setCardColor] = useState<string | null>(existingMessage?.card_color || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const eligibleFiles = files.filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    const rejectedCount = files.length - eligibleFiles.length;
    if (eligibleFiles.length === 0) {
      setError('Choose image files under 10MB each.');
      return;
    }
    if (!cloudinaryUploadsConfigured()) {
      setError('Photo uploads need a Cloudinary unsigned upload preset. Configure it in .env.local.');
      return;
    }

    setError(null);
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    const failedNames: string[] = [];

    try {
      for (const [index, file] of eligibleFiles.entries()) {
        setPhotoUploadStatus(`Uploading image ${index + 1} of ${eligibleFiles.length}`);
        try {
          uploadedUrls.push(await uploadImageToCloudinary(file));
        } catch {
          failedNames.push(file.name);
        }
      }

      if (uploadedUrls.length > 0) {
        setPhotoUrls((currentUrls) => [...currentUrls, ...uploadedUrls]);
      }
      if (failedNames.length > 0 || rejectedCount > 0) {
        setError(`${failedNames.length + rejectedCount} image(s) could not be added. Check file type, size, and Cloudinary settings.`);
      }
    } finally {
      setUploadingPhotos(false);
      setPhotoUploadStatus(null);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((currentUrls) => currentUrls.filter((_, photoIndex) => photoIndex !== index));
  };

  const handleSave = async () => {
    if (!cardColor) {
      setError('Please choose a card color before saving');
      return;
    }
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
        photo_path: null,
        photo_urls: photoUrls,
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
            photo_urls: payload.photo_urls,
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
    <div className="relative isolate h-[100dvh] overflow-hidden flex flex-col">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-center scale-110 blur-md"
        style={{ backgroundImage: 'url(/images/bg.jpg)' }}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-cream-50/70" />
      {/* Header */}
      <div className="flex-shrink-0 bg-cream-50/90 backdrop-blur-md border-b border-sage-100">
        <div className="flex items-center px-4 py-2.5 max-w-3xl mx-auto">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 hover:bg-sage-200 transition-colors"
            aria-label="Back to home"
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

          <div>
            {/* Identity & Wish Form */}
            <div className="space-y-2.5">
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
                  Message to TJ
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your birthday message to TJ..."
                  rows={8}
                  className="w-full min-h-[220px] px-3.5 py-2.5 rounded-xl bg-white border border-sage-200 text-sm text-sage-700 placeholder:text-sage-300 focus:border-sage-500 focus:outline-none transition-colors resize-y"
                />
              </div>
            </div>
          </div>

          {/* Card Color Picker */}
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1.5 flex items-center gap-1.5">
              <Palette size={13} />
              Card color <span className="text-accent-rose">(required)</span>
            </label>
            <div className="flex items-center gap-2">
              <label
                className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-sage-300 text-sage-700 transition-colors hover:border-sage-500"
                style={{ backgroundColor: cardColor ?? '#FFFFFF' }}
                title="Choose a custom color"
              >
                <Palette size={15} className="pointer-events-none" />
                <input
                  type="color"
                  value={cardColor ?? CARD_COLORS[0].value}
                  onChange={(e) => setCardColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Choose a custom card color (required)"
                />
              </label>

              {[CARD_COLORS[0].value, CARD_COLORS[2].value, CARD_COLORS[4].value].map((sampleColor) => (
                <button
                  key={sampleColor}
                  type="button"
                  onClick={() => setCardColor(sampleColor)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    cardColor === sampleColor ? 'border-sage-600 scale-110' : 'border-sage-200 hover:border-sage-400'
                  }`}
                  style={{ backgroundColor: sampleColor }}
                  aria-label={`Use ${sampleColor} as card color`}
                  title="Sample card color"
                />
              ))}

              {!voicePath && !isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-9 h-9 rounded-full text-sage-600 flex items-center justify-center hover:bg-sage-100 transition-colors"
                  aria-label="Record voice message"
                >
                  <Mic size={16} />
                </button>
              ) : isRecording ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-rose animate-pulse" />
                    <span className="text-sage-700 font-mono text-sm">{formatTime(recordingTime)}</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="w-8 h-8 rounded-full bg-accent-rose text-cream-50 flex items-center justify-center hover:opacity-90 transition-opacity"
                    aria-label="Stop recording"
                  >
                    <Square size={12} />
                  </button>
                </div>
              ) : voicePath ? (
                <>
                  <button
                    onClick={togglePlayback}
                    className="w-9 h-9 rounded-full text-sage-600 flex items-center justify-center hover:bg-sage-100 transition-colors flex-shrink-0"
                    aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>
                  <div className="flex-1 h-2 bg-sage-100 rounded-full overflow-hidden min-w-[60px]">
                    <div className="h-full bg-sage-400 rounded-full" style={{ width: isPlaying ? '100%' : '30%' }} />
                  </div>
                  <button
                    onClick={deleteVoice}
                    className="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center text-sage-500 hover:bg-sage-200 transition-colors flex-shrink-0"
                    aria-label="Delete voice"
                  >
                    <Trash2 size={13} />
                  </button>
                  <audio
                    ref={audioRef}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </>
              ) : null}
            </div>
            {!cardColor && (
              <p className="mt-1 text-xs text-sage-500">Choose a color to enable saving.</p>
            )}
          </div>

          {/* Photo Upload */}
          <div className="min-w-0 flex-1 lg:flex-[1.35]">
            <label className="mb-1 block text-xs font-medium text-sage-600">
              Add your favorite photos together
            </label>
            {photoUrls.length > 0 && (
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photoUrls.map((photoUrl, index) => (
                  <div key={`${photoUrl}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-sage-100">
                    <img src={photoUrl} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-cream-50/90 text-accent-rose shadow-sm transition-colors hover:bg-cream-50"
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhotos}
              className="flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sage-200 px-4 py-3 text-sm font-medium text-sage-500 transition-colors hover:border-sage-400 hover:bg-sage-50 disabled:cursor-wait disabled:opacity-60"
            >
              <Upload size={20} />
              {photoUploadStatus || 'Add photos'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Error */}
          {error && !isRecording && <p className="text-sm text-accent-rose text-center">{error}</p>}
        </div>
      </div>

      {/* Save Button - fixed at bottom */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-cream-50/90 backdrop-blur-md border-t border-sage-100">
        <button
          onClick={handleSave}
          disabled={saving || uploadingPhotos || !cardColor}
          className="w-full max-w-3xl mx-auto py-3 rounded-2xl bg-sage-500 text-cream-50 font-medium flex items-center justify-center gap-2 hover:bg-sage-600 transition-all active:scale-[0.98] shadow-md shadow-sage-900/15 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadingPhotos ? 'Uploading photos...' : saving ? 'Saving...' : saved ? (
            <>
              <Check size={18} />
              Saved!
            </>
          ) : (
            'Save My Message'
          )}
        </button>
      </div>
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/50 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-confirm-title"
            className="w-full max-w-sm rounded-2xl bg-cream-50 p-5 shadow-xl"
          >
            <h2 id="leave-confirm-title" className="font-serif text-lg text-sage-800">
              Go back to the home screen?
            </h2>
            <p className="mt-2 text-sm text-sage-600">
              Your unsaved message and changes may be lost.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-sage-700 hover:bg-sage-100"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
              >
                Leave page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
