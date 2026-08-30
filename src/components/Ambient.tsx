export default function Ambient() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* base wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 800px at 85% -10%, #1b3155 0%, transparent 60%), radial-gradient(1000px 700px at 0% 110%, #123345 0%, transparent 55%), linear-gradient(180deg, #0c1526 0%, #0a1220 100%)',
        }}
      />
      {/* drifting glows */}
      <div
        className="glow-a absolute -top-32 right-[-10%] h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(227,179,65,0.14) 0%, transparent 65%)' }}
      />
      <div
        className="glow-b absolute bottom-[-20%] left-[-8%] h-[620px] w-[620px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(63,200,180,0.12) 0%, transparent 65%)' }}
      />
      {/* girih pattern */}
      <div className="girih-layer absolute inset-0 opacity-[0.05]" />
      {/* film grain */}
      <div className="noise-layer absolute inset-0" />
      {/* floating ornaments */}
      <svg className="float-y absolute top-24 left-[8%] text-gold-500/25" style={{ ['--rot' as string]: '-12deg' }} width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="6" y="6" width="12" height="12" />
        <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
      </svg>
      <svg className="float-y absolute bottom-[28%] right-[6%] text-turq-500/25" style={{ ['--rot' as string]: '8deg', animationDelay: '2.2s' }} width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="6" y="6" width="12" height="12" />
        <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
        <circle cx="12" cy="12" r="1.6" />
      </svg>
      <svg className="float-y absolute top-[55%] left-[3%] text-gold-400/20" style={{ ['--rot' as string]: '20deg', animationDelay: '4s' }} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7L12 3z" />
      </svg>
    </div>
  );
}
