import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
);

export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Icon>
);

export const CommitIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="3.5" /><path d="M2 12h6.5M15.5 12H22" /></Icon>
);

export const CompareIcon = (p: IconProps) => (
  <Icon {...p}><path d="M8 3 4 7l4 4" /><path d="M4 7h11a4 4 0 0 1 4 4v1" /><path d="m16 21 4-4-4-4" /><path d="M20 17H9a4 4 0 0 1-4-4v-1" /></Icon>
);

export const PenIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 20h9" /><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5Z" /></Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}><path d="m5 13 4 4L19 7" /></Icon>
);

export const DotIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></Icon>
);

export const BookIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22Z" /><path d="M4 17.5h16" /></Icon>
);

export const FileIcon = (p: IconProps) => (
  <Icon {...p}><path d="M14 2v5h5" /><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" /></Icon>
);

export const FocusIcon = (p: IconProps) => (
  <Icon {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></Icon>
);

export const ExitFocusIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 8h3a2 2 0 0 0 2-2V3M16 3v3a2 2 0 0 0 2 2h3M21 16h-3a2 2 0 0 0-2 2v3M8 21v-3a2 2 0 0 0-2-2H3" /></Icon>
);
