import { cx } from '../lib/core';
import { IconDesk, IconFeather, IconSearch, IconShelf } from './Icons';

interface Props {
  view: 'library' | 'authors';
  onNav: (v: 'library' | 'authors') => void;
  onDesk: () => void;
  query: string;
  setQuery: (q: string) => void;
}

export default function Header({ view, onNav, onDesk, query, setQuery }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-gold-500/10 bg-night-900/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        {/* logo */}
        <button onClick={() => onNav('library')} className="group flex items-center gap-2.5 text-right" aria-label="کتابخانهٔ مانا">
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-night-600 to-night-800 shadow-[0_6px_18px_rgba(0,0,0,0.4)] ring-1 ring-gold-500/30 transition-transform duration-300 group-hover:-rotate-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3b341" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6.5C9.8 4.9 7 4.6 4.5 5.4v13.2c2.5-.8 5.3-.5 7.5 1.1 2.2-1.6 5-1.9 7.5-1.1V5.4c-2.5-.8-5.3-.5-7.5 1.1z" />
              <path d="M12 6.5v13.2" />
            </svg>
            <span className="absolute inset-0 shimmer" />
          </span>
          <span>
            <span className="block font-display text-xl leading-6 text-mist-100">کتابخانهٔ مانا</span>
            <span className="block text-[11px] font-light tracking-wide text-mist-500">بخوان · بنویس · بیندیش</span>
          </span>
        </button>

        <nav className="ms-2 hidden items-center gap-1 md:flex">
          <button
            onClick={() => onNav('library')}
            className={cx(
              'flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              view === 'library' ? 'bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/25' : 'text-mist-400 hover:bg-night-700 hover:text-mist-100',
            )}
          >
            <IconShelf size={17} /> کتابخانه
          </button>
          <button
            onClick={onDesk}
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-mist-400 transition-colors hover:bg-night-700 hover:text-mist-100"
          >
            <IconDesk size={17} /> میز مطالعه
          </button>
          <button
            onClick={() => onNav('authors')}
            className={cx(
              'flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              view === 'authors' ? 'bg-turq-500/12 text-turq-400 ring-1 ring-turq-500/25' : 'text-mist-400 hover:bg-night-700 hover:text-mist-100',
            )}
          >
            <IconFeather size={17} /> درگاه نویسندگان
          </button>
        </nav>

        {/* search */}
        <div className="ms-auto flex items-center gap-2">
          <label className={cx('group relative flex items-center rounded-md border transition-all duration-300', 'border-night-500 bg-night-800/70 focus-within:border-gold-500/50 focus-within:bg-night-800', query ? 'w-44 sm:w-64' : 'w-36 sm:w-52')}>
            <IconSearch size={16} className="pointer-events-none absolute right-3 text-mist-500 transition-colors group-focus-within:text-gold-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جست‌وجوی کتاب، نویسنده…"
              className="w-full bg-transparent py-2 pe-3 ps-9 text-sm text-mist-100 placeholder:text-mist-500 focus:outline-none"
            />
          </label>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5 md:hidden">
        {[
          { k: 'library' as const, label: 'کتابخانه', icon: <IconShelf size={16} /> },
          { k: 'desk' as const, label: 'میز مطالعه', icon: <IconDesk size={16} /> },
          { k: 'authors' as const, label: 'نویسندگان', icon: <IconFeather size={16} /> },
        ].map((n) => (
          <button
            key={n.k}
            onClick={() => (n.k === 'desk' ? onDesk() : onNav(n.k))}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              view === n.k ? 'bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/25' : 'text-mist-400',
            )}
          >
            {n.icon} {n.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
