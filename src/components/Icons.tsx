import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconBook = (p: P) => (
  <I {...p}>
    <path d="M12 6.5C9.8 4.9 7 4.6 4.5 5.4v13.2c2.5-.8 5.3-.5 7.5 1.1 2.2-1.6 5-1.9 7.5-1.1V5.4c-2.5-.8-5.3-.5-7.5 1.1z" />
    <path d="M12 6.5v13.2" />
    <path d="M7 9c1.2-.2 2.4-.2 3.5.1M7 12c1.2-.2 2.4-.2 3.5.1" />
  </I>
);

export const IconOpenBook = (p: P) => (
  <I {...p}>
    <path d="M3 5.5c3-.9 6-.6 9 1.4 3-2 6-2.3 9-1.4v13c-3-.9-6-.6-9 1.4-3-2-6-2.3-9-1.4v-13z" />
    <path d="M12 6.9v13" />
  </I>
);

export const IconFeather = (p: P) => (
  <I {...p}>
    <path d="M20 4c-5.5.5-10 2.5-12.5 7C6 13.8 6.5 17 8 18.5c4 1 9-1 11-6 1.3-3.2 1-7 1-8.5z" />
    <path d="M8 18.5L5 21M9.5 15.5c3-2.5 6-5.5 7.5-8" />
  </I>
);

export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <I {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6-4.2-3.9 5.7-.7L12 3.6z" />
  </I>
);

export const IconBookmark = ({ filled, ...p }: P & { filled?: boolean }) => (
  <I {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6.5 4h11v16.5l-5.5-3.8-5.5 3.8V4z" />
  </I>
);

export const IconSearch = (p: P) => (
  <I {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15.2 15.2L20.5 20.5" />
  </I>
);

export const IconSun = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" />
  </I>
);

export const IconMoon = (p: P) => (
  <I {...p}>
    <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
  </I>
);

export const IconScroll = (p: P) => (
  <I {...p}>
    <path d="M6 4h11a2 2 0 012 2v12a2 2 0 002 2H8a2 2 0 01-2-2V4z" />
    <path d="M6 4a2 2 0 00-2 2v1h4M10 9h6M10 13h6" />
  </I>
);

export const IconType = (p: P) => (
  <I {...p}>
    <path d="M5 7V5h14v2M12 5v14M9 19h6" />
  </I>
);

export const IconToc = (p: P) => (
  <I {...p}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </I>
);

export const IconNote = (p: P) => (
  <I {...p}>
    <path d="M5 4h14v12l-4 4H5V4z" />
    <path d="M15 20v-4h4M8.5 9h7M8.5 13h4" />
  </I>
);

export const IconClose = (p: P) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </I>
);

export const IconChevronL = (p: P) => (
  <I {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </I>
);

export const IconChevronR = (p: P) => (
  <I {...p}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </I>
);

export const IconQuote = (p: P) => (
  <I {...p} fill="currentColor" stroke="none">
    <path d="M9.5 6C6.5 7.5 5 9.8 5 12.7c0 2.7 1.7 4.6 4 4.6 2 0 3.5-1.5 3.5-3.5S11 10.4 9.2 10.4c-.3 0-.7 0-.9.1.4-1.5 1.6-2.8 3.2-3.6L9.5 6zm9 0c-3 1.5-4.5 3.8-4.5 6.7 0 2.7 1.7 4.6 4 4.6 2 0 3.5-1.5 3.5-3.5s-1.5-3.4-3.3-3.4c-.3 0-.6 0-.9.1.4-1.5 1.6-2.8 3.2-3.6L18.5 6z" />
  </I>
);

export const IconUpload = (p: P) => (
  <I {...p}>
    <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
  </I>
);

export const IconTrash = (p: P) => (
  <I {...p}>
    <path d="M4.5 6.5h15M9 6V4.5a1 1 0 011-1h4a1 1 0 011 1V6M6.5 6.5l1 13h9l1-13M10 10.5v5M14 10.5v5" />
  </I>
);

export const IconCheck = (p: P) => (
  <I {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </I>
);

export const IconPlus = (p: P) => (
  <I {...p}>
    <path d="M12 5v14M5 12h14" />
  </I>
);

export const IconMinus = (p: P) => (
  <I {...p}>
    <path d="M5 12h14" />
  </I>
);

export const IconSpacing = (p: P) => (
  <I {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <path d="M8 6v0M8 12v0M8 18v0" strokeWidth="3" />
  </I>
);

export const IconWidth = (p: P) => (
  <I {...p}>
    <path d="M3 8l3-3 3 3M3 16l3 3 3-3M21 8l-3-3-3 3M21 16l-3 3-3-3" />
    <path d="M6 5v14M18 5v14" />
  </I>
);

export const IconShelf = (p: P) => (
  <I {...p}>
    <path d="M3 20h18M4 20V9h3.5v11M9 20V6h3.5v14M14 20V11h3.5v9" />
    <path d="M19 20l1.5-9" />
  </I>
);

export const IconClock = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </I>
);

export const IconLayers = (p: P) => (
  <I {...p}>
    <path d="M12 3.5l9 4.5-9 4.5-9-4.5 9-4.5z" />
    <path d="M3.5 12.5L12 16.8l8.5-4.3M3.5 16.5L12 20.8l8.5-4.3" />
  </I>
);

export const IconEye = (p: P) => (
  <I {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);

export const IconSparkle = (p: P) => (
  <I {...p}>
    <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8L12 3.5z" />
    <path d="M19 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </I>
);

export const IconDesk = (p: P) => (
  <I {...p}>
    <path d="M3 10.5h18M5 10.5V6a1.5 1.5 0 011.5-1.5h11A1.5 1.5 0 0119 6v4.5M5 10.5V19M19 10.5V19M3 19h6M15 19h6" />
  </I>
);

export const IconDownload = (p: P) => (
  <I {...p}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
  </I>
);
