import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Shield, Delete, AlertCircle, Sparkles, Smartphone } from 'lucide-react';

interface IPhoneLockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
}

// Subtle audio synthesizer for iOS mechanical keypad click & unlock sound
function playKeypadSound(type: 'click' | 'success' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Audio context may be restricted by browser policy before first interaction
  }
}

export const IPhoneLockScreen: React.FC<IPhoneLockScreenProps> = ({
  isLocked,
  onUnlock,
}) => {
  const [passcode, setPasscode] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnlockedSuccess, setIsUnlockedSuccess] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Update real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);

      // Thai formatted date e.g. "วันจันทร์ที่ 7 กันยายน"
      const dateStr = now.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      setCurrentDate(dateStr);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle number input
  const handleDigitPress = useCallback((digit: string) => {
    if (passcode.length >= 4 || isUnlockedSuccess) return;

    playKeypadSound('click');
    const nextCode = passcode + digit;
    setPasscode(nextCode);
    setErrorMessage(null);

    // Check passcode when 4 digits are entered
    if (nextCode.length === 4) {
      if (nextCode === '0723') {
        playKeypadSound('success');
        setIsUnlockedSuccess(true);
        setTimeout(() => {
          onUnlock();
          setPasscode('');
          setIsUnlockedSuccess(false);
        }, 450);
      } else {
        playKeypadSound('error');
        setIsShaking(true);
        setErrorMessage('รหัสผ่านไม่ถูกต้อง (รหัสเจ้าหน้าที่: 0723)');
        setTimeout(() => {
          setIsShaking(false);
          setPasscode('');
        }, 500);
      }
    }
  }, [passcode, isUnlockedSuccess, onUnlock]);

  // Handle Delete
  const handleDelete = () => {
    if (passcode.length > 0) {
      playKeypadSound('click');
      setPasscode(prev => prev.slice(0, -1));
      setErrorMessage(null);
    }
  };

  // Keyboard listener for physical keyboard typing
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, handleDigitPress]);

  if (!isLocked) return null;

  const keypadButtons = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-radial from-zinc-900 via-zinc-950 to-black text-white select-none backdrop-blur-2xl animate-in fade-in duration-300">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Section: Clock, Date, Lock Status */}
      <div className="relative w-full max-w-sm flex flex-col items-center pt-8 sm:pt-12 space-y-2 z-10 text-center">
        
        {/* Animated Padlock */}
        <div className={`p-3 rounded-full transition-all duration-300 ${
          isUnlockedSuccess ? 'bg-emerald-500/20 text-emerald-400 scale-110' : 'bg-white/10 text-white/90'
        }`}>
          {isUnlockedSuccess ? (
            <Unlock className="w-6 h-6 animate-bounce" />
          ) : (
            <Lock className="w-6 h-6" />
          )}
        </div>

        {/* Real-time Clock in iOS Display Style */}
        <h1 className="text-5xl sm:text-6xl font-extralight tracking-tight text-white/95 font-sans">
          {currentTime || '12:00'}
        </h1>
        <p className="text-xs sm:text-sm font-medium text-white/70">
          {currentDate}
        </p>

        {/* Hospital Sub-Header */}
        <div className="pt-2">
          <p className="text-[11px] uppercase tracking-widest text-blue-400 font-semibold">
            ระบบทะเบียนฟันปลอม รพ.พยุหะคีรี
          </p>
          <h2 className="text-sm sm:text-base font-semibold text-white/90 mt-1">
            {isUnlockedSuccess ? 'ปลดล็อคสำเร็จ...' : 'ใส่รหัสผ่าน (Enter Passcode)'}
          </h2>
        </div>

        {/* Passcode 4-Dot Indicators */}
        <div className={`flex items-center space-x-5 pt-3 transition-transform ${
          isShaking ? 'translate-x-[-10px] animate-pulse text-red-400' : ''
        }`}>
          {[0, 1, 2, 3].map(index => {
            const isFilled = passcode.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  isFilled
                    ? isUnlockedSuccess
                      ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                      : 'bg-white scale-105 shadow-sm shadow-white/50'
                    : isShaking
                    ? 'border-2 border-red-400/80 bg-red-500/20'
                    : 'border-2 border-white/40 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Hint Notification */}
        {errorMessage ? (
          <p className="text-xs text-red-300 bg-red-950/60 border border-red-800/60 px-3 py-1 rounded-full animate-shake mt-2">
            {errorMessage}
          </p>
        ) : (
          <p className="text-[11px] text-white/40 pt-1">
            (รหัสผ่านปลดล็อค: <span className="text-blue-300 font-mono font-semibold">0723</span>)
          </p>
        )}
      </div>

      {/* Middle/Bottom Section: iOS Circular Number Keypad */}
      <div className="relative w-full max-w-[280px] sm:max-w-[300px] z-10 pb-6">
        <div className="grid grid-cols-3 gap-x-5 gap-y-4 justify-items-center">
          
          {/* Numbers 1 to 9 */}
          {keypadButtons.map(btn => (
            <button
              key={btn.num}
              type="button"
              onClick={() => handleDigitPress(btn.num)}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/15 backdrop-blur-md active:scale-95 transition-all duration-100 text-white shadow-lg"
            >
              <span className="text-2xl sm:text-3xl font-light leading-none">
                {btn.num}
              </span>
              {btn.letters && (
                <span className="text-[9px] sm:text-[10px] tracking-widest text-white/60 font-semibold mt-0.5">
                  {btn.letters}
                </span>
              )}
            </button>
          ))}

          {/* Bottom Row: Clear / Zero / Delete */}
          <button
            type="button"
            onClick={() => setPasscode('')}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xs font-medium text-white/60 hover:text-white transition-colors"
          >
            {passcode.length > 0 ? 'ยกเลิก' : 'ฉุกเฉิน'}
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/15 backdrop-blur-md active:scale-95 transition-all duration-100 text-white shadow-lg"
          >
            <span className="text-2xl sm:text-3xl font-light leading-none">
              0
            </span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xs font-medium text-white/80 hover:text-white transition-colors active:scale-90"
          >
            {passcode.length > 0 ? (
              <span className="flex items-center space-x-1">
                <Delete className="w-5 h-5 text-white/90" />
              </span>
            ) : (
              <span className="text-transparent">.</span>
            )}
          </button>

        </div>

        {/* Quick Helper Pill for instant click-to-unlock if user wants convenience */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setPasscode('0723');
              playKeypadSound('success');
              setIsUnlockedSuccess(true);
              setTimeout(() => {
                onUnlock();
                setPasscode('');
                setIsUnlockedSuccess(false);
              }, 300);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[11px] text-zinc-400 hover:text-zinc-200 border border-white/10 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>กดปลดล็อคด่วนด้วยรหัส 0723</span>
          </button>
        </div>

      </div>

      {/* Footer Safe Area */}
      <div className="w-32 h-1 bg-white/30 rounded-full mb-1" />

    </div>
  );
};
