import "server-only";
import { hasSupabase } from "../env";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";
import type { Repo } from "./types";

export const repo: Repo = hasSupabase ? supabaseRepo : demoRepo;
export type { Repo };
