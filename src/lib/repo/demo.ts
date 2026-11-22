import "server-only";
import { randomUUID } from "node:crypto";
import type { EpisodeRow, IdeaRow, NewsRow, ParticipateRow, AdminRow } from "../types";
import type { AdminRepo, Repo } from "./types";

/**
 * In-memory store for local development and previews without Supabase.
 * Lives on globalThis so it survives hot reloads. Resets when the server restarts.
 */
type Store = {
  participate: ParticipateRow[];
  ideas: IdeaRow[];
  news: (NewsRow & { photo_data?: string })[];
  episodes: EpisodeRow[];
  votes: Set<string>;
  hits: Map<string, number[]>;
};

const g = globalThis as unknown as { __ventStore?: Store };

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
const dateOnly = (d: number) => daysAgo(d).slice(0, 10);

function seed(): Store {
  const idea = (
    i: number,
    text: string,
    category: IdeaRow["category"],
    votes: number,
    status: IdeaRow["status"] = "approved",
  ): IdeaRow => ({
    id: `idea-${i}`,
    created_at: daysAgo(i + 1, i * 3),
    idea: text,
    category,
    name: null,
    status,
    published: status === "approved",
    public_text: status === "approved" ? text : null,
    votes_count: votes,
    admin_note: null,
  });

  const news = (i: number, headline: string, what: string, published = true): NewsRow => ({
    id: `news-${i}`,
    created_at: daysAgo(i, 2),
    what,
    happened_on: dateOnly(i),
    when_preset: "date",
    source: null,
    photo_path: null,
    is_anonymous: true,
    name: null,
    status: published ? "approved" : "new",
    published,
    headline: published ? headline : null,
    admin_note: null,
  });

  return {
    participate: [
      {
        id: "p-1",
        created_at: daysAgo(0, 3),
        name: "Алихан",
        grade: "10B",
        role: "guest",
        pitch: "Собрал робота для WRO, вышли в республиканский этап. Могу рассказать, как готовились без бюджета.",
        contact_type: "telegram",
        contact: "alikhan_wro",
        consent: true,
        status: "new",
        admin_note: null,
      },
      {
        id: "p-2",
        created_at: daysAgo(1, 5),
        name: "Дана",
        grade: "11A",
        role: "team_edit",
        pitch: "Монтирую рилсы для школьного клуба дебатов полгода, умею в CapCut и Premiere.",
        contact_type: "instagram",
        contact: "dana.edits",
        consent: true,
        status: "in_progress",
        admin_note: "Позвать на монтаж 4-го выпуска",
      },
    ],
    ideas: [
      idea(1, "Разобрать, как ученики на самом деле готовятся к IB экзаменам: расписания, лайфхаки, провалы.", "topic", 41),
      idea(2, "Рубрика «60 секунд»: самые важные новости Казахстана за две недели, коротко и без воды.", "rubric", 33),
      idea(3, "Спросить гостя: какой совет из 9 класса оказался полной ерундой?", "question", 27),
      idea(4, "Позвать выпускника, который поступил за границу, и спросить про эссе.", "topic", 19),
      idea(5, "Сравнить школьную форму NIS и школ других стран.", "topic", 11),
      idea(6, "Рубрика с учителем: угадай, чей это школьный дневник.", "rubric", 8),
      idea(7, "Почему в автомате снова нет воды", "topic", 0, "new"),
    ],
    news: [
      news(1, "Команда по дебатам вышла в финал городского турнира", "Наша команда по дебатам прошла в финал, играют в субботу"),
      news(2, "В школе открылся клуб настольных игр, сбор по пятницам", "Открылся клуб настолок"),
      news(4, "Сборная по волейболу взяла бронзу на городских соревнованиях", "Волейбол бронза"),
      news(6, "11-классники запустили сбор книг для сельской школы", "Сбор книг"),
      news(0, "", "Говорят, что в столовой будут новые меню", false),
    ],
    episodes: [
      {
        id: "ep-2",
        created_at: daysAgo(3),
        number: 2,
        title: "Олимпиады: стоит ли оно того",
        guest: "Призёр республиканской олимпиады",
        description: "Сколько часов уходит на подготовку и что из этого реально пригодится.",
        video_url: null,
        published_on: dateOnly(3),
        is_published: true,
      },
      {
        id: "ep-1",
        created_at: daysAgo(17),
        number: 1,
        title: "Пилотный выпуск",
        guest: "Президент школьного совета",
        description: "Знакомимся, обсуждаем главные новости первой четверти.",
        video_url: null,
        published_on: dateOnly(17),
        is_published: true,
      },
    ],
    votes: new Set(),
    hits: new Map(),
  };
}

function store(): Store {
  return (g.__ventStore ??= seed());
}

const byNewest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

export const demoRepo: Repo & AdminRepo = {
  mode: "demo",

  async publishedNews(limit = 12) {
    return store()
      .news.filter((n) => n.published && n.status === "approved" && n.headline)
      .sort(byNewest)
      .slice(0, limit)
      .map((n) => ({ id: n.id, headline: n.headline!, happened_on: n.happened_on }));
  },

  async publishedIdeas() {
    return store()
      .ideas.filter((i) => i.published && i.status === "approved")
      .sort((a, b) => b.votes_count - a.votes_count || byNewest(a, b))
      .map((i) => ({
        id: i.id,
        created_at: i.created_at,
        category: i.category,
        votes_count: i.votes_count,
        text: i.public_text ?? i.idea,
      }));
  },

  async episodes() {
    return store()
      .episodes.filter((e) => e.is_published)
      .sort((a, b) => b.number - a.number)
      .map((e) => ({
        id: e.id,
        number: e.number,
        title: e.title,
        guest: e.guest,
        description: e.description,
        video_url: e.video_url,
        published_on: e.published_on,
      }));
  },

  async stats() {
    const s = store();
    return { participate: s.participate.length + 46, ideas: s.ideas.length + 81, news: s.news.length + 29 };
  },

  async createParticipate(row) {
    store().participate.push({ ...row, id: randomUUID(), created_at: new Date().toISOString(), status: "new", admin_note: null });
  },

  async createIdea(row) {
    store().ideas.push({
      ...row,
      id: randomUUID(),
      created_at: new Date().toISOString(),
      status: "new",
      published: false,
      public_text: null,
      votes_count: 0,
      admin_note: null,
    });
  },

  async createNews(row, photo) {
    store().news.push({
      ...row,
      id: randomUUID(),
      created_at: new Date().toISOString(),
      photo_path: photo ? "demo" : null,
      photo_data: photo ? `data:${photo.type};base64,${Buffer.from(photo.bytes).toString("base64")}` : undefined,
      status: "new",
      published: false,
      headline: null,
      admin_note: null,
    });
  },

  async vote(ideaId, voterHash) {
    const s = store();
    const idea = s.ideas.find((i) => i.id === ideaId && i.published && i.status === "approved");
    if (!idea) return null;
    const key = `${ideaId}:${voterHash}`;
    if (s.votes.has(key)) return { count: idea.votes_count, accepted: false };
    s.votes.add(key);
    idea.votes_count += 1;
    return { count: idea.votes_count, accepted: true };
  },

  async rateLimit(keyHash, max, windowSeconds) {
    const hits = store().hits;
    const now = Date.now();
    const recent = (hits.get(keyHash) ?? []).filter((t) => now - t < windowSeconds * 1000);
    if (recent.length >= max) {
      hits.set(keyHash, recent);
      return false;
    }
    recent.push(now);
    hits.set(keyHash, recent);
    return true;
  },

  async adminList(kind) {
    const s = store();
    if (kind === "participate") return s.participate.sort(byNewest).map((r) => ({ kind, ...r }) as AdminRow);
    if (kind === "ideas") return s.ideas.sort(byNewest).map((r) => ({ kind, ...r }) as AdminRow);
    return s.news.sort(byNewest).map(({ photo_data, ...r }) => ({ kind, ...r, photo_url: photo_data ?? null }) as AdminRow);
  },

  async adminPatch(patch) {
    const s = store();
    const list = (patch.kind === "participate" ? s.participate : patch.kind === "ideas" ? s.ideas : s.news) as Record<string, unknown>[];
    const row = list.find((r) => r.id === patch.id);
    if (!row) throw new Error("not_found");
    for (const [k, v] of Object.entries(patch)) if (k !== "kind" && k !== "id" && v !== undefined) row[k] = v;
  },

  async adminDelete(kind, id) {
    const s = store();
    if (kind === "participate") s.participate = s.participate.filter((r) => r.id !== id);
    else if (kind === "ideas") s.ideas = s.ideas.filter((r) => r.id !== id);
    else s.news = s.news.filter((r) => r.id !== id);
  },

  async adminEpisodes() {
    return [...store().episodes].sort((a, b) => b.number - a.number);
  },

  async adminSaveEpisode(input, id) {
    const s = store();
    if (id) {
      const ep = s.episodes.find((e) => e.id === id);
      if (!ep) throw new Error("not_found");
      Object.assign(ep, input);
    } else {
      s.episodes.push({ ...input, id: randomUUID(), created_at: new Date().toISOString() });
    }
  },

  async adminDeleteEpisode(id) {
    const s = store();
    s.episodes = s.episodes.filter((e) => e.id !== id);
  },
};
