import type { SVGProps } from "react";

export type IconName =
  | "alert-circle"
  | "arrow-left"
  | "ban"
  | "check"
  | "check-circle"
  | "clipboard"
  | "columns"
  | "copy"
  | "external-link"
  | "eye"
  | "flag"
  | "history"
  | "music"
  | "play"
  | "qr-code"
  | "radio"
  | "sliders"
  | "spotify"
  | "ticket"
  | "trophy"
  | "users"
  | "volume"
  | "x-circle";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  name: IconName;
};

export function Icon({ className, name, ...props }: IconProps) {
  return <svg
    aria-hidden={props["aria-hidden"] ?? true}
    className={`icon${className ? ` ${className}` : ""}`}
    data-icon={name}
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    {...props}
  >
    {iconPaths[name]}
  </svg>;
}

const iconPaths: Record<IconName, React.ReactNode> = {
  "alert-circle": <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
  "arrow-left": <><path d="m12 5-7 7 7 7" /><path d="M19 12H5" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  clipboard: <><rect height="16" rx="2" width="14" x="5" y="5" /><path d="M9 5V3h6v2" /><path d="M9 12h6" /><path d="M9 16h4" /></>,
  columns: <><rect height="14" rx="2" width="16" x="4" y="5" /><path d="M9.5 5v14" /><path d="M14.5 5v14" /></>,
  copy: <><rect height="13" rx="2" width="12" x="8" y="8" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" /></>,
  "external-link": <><path d="M14 5h5v5" /><path d="m19 5-8 8" /><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  eye: <><path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 5c4-3 6 3 14 0v9c-8 3-10-3-14 0" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>,
  music: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
  play: <path d="m9 6 9 6-9 6V6Z" />,
  "qr-code": <><rect height="6" width="6" x="3" y="3" /><rect height="6" width="6" x="15" y="3" /><rect height="6" width="6" x="3" y="15" /><path d="M15 15h3v3h-3zM21 18v3h-3M15 21h3" /></>,
  radio: <><circle cx="12" cy="12" r="2" /><path d="M7 7a7 7 0 0 0 0 10" /><path d="M17 7a7 7 0 0 1 0 10" /><path d="M4 4a11 11 0 0 0 0 16" /><path d="M20 4a11 11 0 0 1 0 16" /></>,
  sliders: <><path d="M4 7h16" /><path d="M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></>,
  spotify: <><circle cx="12" cy="12" r="9" /><path d="M7.5 10c3.7-1.1 6.8-.7 9.2.7" /><path d="M8.3 13c2.8-.8 5.1-.5 7 .5" /><path d="M9.1 15.5c1.8-.5 3.5-.3 4.9.4" /></>,
  ticket: <><path d="M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4V7Z" /><path d="M12 7v10" /></>,
  trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v1a4 4 0 0 0 3 3.9M16 6h3v1a4 4 0 0 1-3 3.9M12 12v4M8 20h8M9 16h6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0 1 10 0v2" /><path d="M16 5a3 3 0 0 1 0 6" /><path d="M19 20v-2a5 5 0 0 0-3-4.6" /></>,
  volume: <><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M19 6a8 8 0 0 1 0 12" /></>,
  "x-circle": <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
};
