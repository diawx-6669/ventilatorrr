export type VideoInfo =
  | { platform: "youtube"; id: string; vertical: boolean; embed: string; thumb: string }
  | { platform: "instagram" | "tiktok"; id: string; vertical: true; embed: string; thumb: null }
  | null;

/** Recognise YouTube (incl. Shorts), Instagram posts/reels and TikTok links. */
export function parseVideo(url: string | null): VideoInfo {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    const shorts = parts[0] === "shorts";
    const id = host === "youtu.be" ? parts[0] : shorts || parts[0] === "embed" || parts[0] === "live" ? parts[1] : u.searchParams.get("v");
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return {
      platform: "youtube",
      id,
      vertical: shorts,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  if (host === "instagram.com") {
    const i = parts.findIndex((p) => p === "p" || p === "reel" || p === "reels" || p === "tv");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (!id || !/^[\w-]{5,40}$/.test(id)) return null;
    return { platform: "instagram", id, vertical: true, embed: `https://www.instagram.com/p/${id}/embed/`, thumb: null };
  }
  if (host === "tiktok.com") {
    const i = parts.indexOf("video");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (!id || !/^\d{8,25}$/.test(id)) return null;
    return { platform: "tiktok", id, vertical: true, embed: `https://www.tiktok.com/embed/v2/${id}`, thumb: null };
  }
  return null;
}
