import { getSupabaseServerClient } from "@/lib/supabase";
import { LocalRepository } from "./local-store";
import { SupabaseRepository } from "./supabase-store";
import type { AppRepository } from "./types";

let repository: AppRepository | null = null;

export function getRepository(): AppRepository {
  if (repository) {
    return repository;
  }

  const supabase = getSupabaseServerClient();
  repository = supabase ? new SupabaseRepository(supabase) : new LocalRepository();
  return repository;
}
