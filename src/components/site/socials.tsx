import { InstagramLogo, TiktokLogo, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/config/site";

/** The show's accounts, in the order we want people to follow them. Edit links in src/config/site.ts. */
export const SOCIALS = [
  { key: "instagram", href: site.social.instagram, label: "Instagram", Icon: InstagramLogo },
  { key: "tiktok", href: site.social.tiktok, label: "TikTok", Icon: TiktokLogo },
  { key: "youtube", href: site.social.youtube, label: "YouTube", Icon: YoutubeLogo },
] as const;

const sizes = {
  sm: { box: "size-9", icon: "size-[18px]" },
  md: { box: "size-12", icon: "size-6" },
  lg: { box: "size-14", icon: "size-7" },
};

/** Round icon buttons. `tone="ink"` for coloured backgrounds. */
export function SocialIcons({ size = "md", tone = "glass", className = "" }: { size?: keyof typeof sizes; tone?: "glass" | "ink"; className?: string }) {
  const s = sizes[size];
  const look =
    tone === "ink"
      ? "bg-ink text-paper hover:bg-paper hover:text-ink"
      : "bg-white/8 text-paper ring-1 ring-white/15 hover:bg-paper hover:text-ink";
  return (
    <ul className={`flex items-center gap-2 ${className}`}>
      {SOCIALS.map(({ key, href, label, Icon }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener"
            aria-label={`${label} @${site.handle}`}
            title={`${label} @${site.handle}`}
            className={`grid place-items-center rounded-full transition-colors ${s.box} ${look}`}
          >
            <Icon weight="bold" className={s.icon} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Pill links with the platform name: for places where the icon alone is not enough. */
export function SocialChips({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {SOCIALS.map(({ key, href, label, Icon }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener"
            className="flex h-11 items-center gap-2 rounded-full bg-white/8 pl-3.5 pr-4 text-[15px] font-semibold ring-1 ring-white/15 transition-colors hover:bg-paper hover:text-ink"
          >
            <Icon weight="bold" className="size-5" aria-hidden />
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
