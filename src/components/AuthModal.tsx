import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { IconFeather, IconBook } from './Icons';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(getErrorMessage(error));
        } else {
          onClose();
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setError(getErrorMessage(error));
        } else {
          onClose();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="pop-in w-full max-w-md overflow-hidden rounded-xl border border-night-500/60 bg-night-800 shadow-[0_40px_90px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-night-600 bg-gradient-to-b from-night-700/70 to-night-800/70 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-md p-1.5 text-mist-500 transition-colors hover:bg-night-700 hover:text-mist-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="flex items-center justify-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold-500/15 text-gold-400">
              <IconBook size={22} />
            </span>
            <div>
              <h2 className="font-display text-xl text-mist-100">
                {mode === 'login' ? 'ورود به کتابخانه' : 'عضویت در کتابخانه'}
              </h2>
              <p className="text-xs text-mist-500">
                {mode === 'login' ? 'به حساب کاربری خود وارد شوید' : 'حساب جدید ایجاد کنید'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-mist-400">نام نمایشی</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="نام شما"
                className="w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-gold-500/60 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-mist-400">ایمیل</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              dir="ltr"
              className="w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-gold-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-mist-400">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="حداقل ۶ نویسه"
              required
              minLength={6}
              dir="ltr"
              className="w-full rounded-md border border-night-500 bg-night-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-gold-500/60 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 px-6 py-3 text-sm font-bold text-night-900 transition-all hover:bg-gold-400 disabled:opacity-50"
          >
            {loading ? (
              <span className="spin-slow h-5 w-5 rounded-full border-2 border-night-900/30 border-t-night-900" style={{ animationDuration: '1s' }} />
            ) : (
              <>
                <IconFeather size={18} />
                {mode === 'login' ? 'ورود' : 'ایجاد حساب'}
              </>
            )}
          </button>

          <div className="text-center text-xs text-mist-500">
            {mode === 'login' ? (
              <>
                هنوز حساب ندارید؟{' '}
                <button type="button" onClick={() => setMode('register')} className="font-bold text-gold-400 hover:underline">
                  عضویت
                </button>
              </>
            ) : (
              <>
                قبلاً عضو شده‌اید؟{' '}
                <button type="button" onClick={() => setMode('login')} className="font-bold text-gold-400 hover:underline">
                  ورود
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function getErrorMessage(error: string): string {
  if (error.includes('Invalid login credentials')) {
    return 'ایمیل یا رمز عبور اشتباه است.';
  }
  if (error.includes('User already registered')) {
    return 'این ایمیل قبلاً ثبت شده است.';
  }
  if (error.includes('Password should be at least')) {
    return 'رمز عبور باید حداقل ۶ نویسه باشد.';
  }
  if (error.includes('Unable to validate email')) {
    return 'ایمیل معتبر نیست.';
  }
  return 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.';
}
