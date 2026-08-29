import type { Book } from '../lib/core';

const SPINE_COLORS = ['#7a3b3b', '#2e5e52', '#8a6a24', '#31517a', '#6b4a72', '#4a6b35', '#8a4a2e', '#274b6b', '#5e3a4e', '#3f5f5a'];

interface Props {
  books: Book[];
  onOpen: (b: Book) => void;
  onRead: (b: Book) => void;
}

export default function Shelf({ books, onOpen, onRead }: Props) {
  const rows: Book[][] = [books.slice(0, 5), books.slice(5, 10)];

  return (
    <div className="relative">
      {/* back wall */}
      <div className="absolute -inset-x-4 -top-4 bottom-0 rounded-xl bg-gradient-to-b from-night-700/60 to-night-800/30 ring-1 ring-gold-500/10" />
      <div className="girih-layer absolute -inset-x-4 -top-4 bottom-0 rounded-xl opacity-[0.07]" />

      <div className="relative space-y-7 px-2 pt-8">
        {rows.map((row, ri) => (
          <div key={ri}>
            <div className="flex items-end justify-center gap-1.5 px-2" style={{ minHeight: '172px' }}>
              {row.map((b, i) => {
                const h = 128 + ((b.id.length * 13 + i * 17) % 42);
                const w = 34 + ((b.id.length * 7 + i * 11) % 14);
                const color = SPINE_COLORS[(books.indexOf(b) + ri) % SPINE_COLORS.length];
                return (
                  <button
                    key={b.id}
                    onClick={() => onOpen(b)}
                    title={`${b.title} — ${b.author}`}
                    className="spine relative flex items-center justify-center overflow-hidden rounded-t-[3px] rounded-b-[2px] text-mist-100"
                    style={{
                      height: `${h}px`,
                      width: `${w}px`,
                      background: `linear-gradient(180deg, ${color} 0%, ${color} 88%, rgba(0,0,0,0.35) 100%)`,
                      boxShadow: 'inset -3px 0 6px rgba(0,0,0,0.35), inset 2px 0 3px rgba(255,255,255,0.12), 0 6px 12px rgba(0,0,0,0.35)',
                    }}
                    onDoubleClick={() => onRead(b)}
                  >
                    <span className="pointer-events-none absolute inset-x-1 top-2 h-px bg-white/25" />
                    <span className="pointer-events-none absolute inset-x-1 bottom-2 h-px bg-white/25" />
                    <span className="font-display text-[13px] leading-tight tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      {b.title}
                    </span>
                  </button>
                );
              })}
              {/* decorative bookends */}
              {ri === 0 && (
                <span className="mb-0 ms-1 hidden h-28 w-2.5 rounded-sm bg-gradient-to-b from-gold-600 to-gold-700 shadow-md sm:block" />
              )}
            </div>
            <div className="shelf-board relative z-10 h-4 rounded-[3px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
