import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnswerHistory, ReviewItem, StudySession, UserProfile } from "@/types/user";
import type { AppRepository } from "./types";

export class SupabaseRepository implements AppRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProfileFromRow(data) : null;
  }

  async upsertUserProfile(profile: UserProfile): Promise<UserProfile> {
    const { error } = await this.client.from("user_profiles").upsert(mapProfileToRow(profile));
    if (error) throw error;
    return profile;
  }

  async listUserProfiles(): Promise<UserProfile[]> {
    const { data, error } = await this.client.from("user_profiles").select("*");
    if (error) throw error;
    return (data ?? []).map(mapProfileFromRow);
  }

  async recordAnswer(answer: AnswerHistory): Promise<AnswerHistory> {
    const { error } = await this.client.from("answer_history").insert(mapAnswerToRow(answer));
    if (error) throw error;
    return answer;
  }

  async listAnswers(userId?: string): Promise<AnswerHistory[]> {
    let query = this.client.from("answer_history").select("*");
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapAnswerFromRow);
  }

  async getReviewItems(userId: string): Promise<ReviewItem[]> {
    return this.listReviewItems(userId);
  }

  async upsertReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const { error } = await this.client.from("review_items").upsert(mapReviewToRow(item));
    if (error) throw error;
    return item;
  }

  async deleteReviewItem(userId: string, topicId: string): Promise<void> {
    const { error } = await this.client
      .from("review_items")
      .delete()
      .eq("user_id", userId)
      .eq("topic_id", topicId);
    if (error) throw error;
  }

  async listReviewItems(userId?: string): Promise<ReviewItem[]> {
    let query = this.client.from("review_items").select("*");
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapReviewFromRow);
  }

  async recordStudySession(session: StudySession): Promise<StudySession> {
    const { error } = await this.client.from("study_sessions").upsert(mapStudySessionToRow(session));
    if (error) throw error;
    return session;
  }

  async listStudySessions(userId?: string): Promise<StudySession[]> {
    let query = this.client.from("study_sessions").select("*");
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapStudySessionFromRow);
  }
}

function mapProfileToRow(profile: UserProfile) {
  return {
    id: profile.id,
    line_user_id: profile.lineUserId,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
    exam_date: profile.examDate,
    study_start_date: profile.studyStartDate,
    weekday_minutes: profile.weekdayMinutes,
    weekend_minutes: profile.weekendMinutes,
    rest_weekdays: profile.restWeekdays,
    selected_book_id: profile.selectedBookId,
    it_experience: profile.itExperience,
    weak_domains: profile.weakDomains
  };
}

function mapProfileFromRow(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    lineUserId: row.line_user_id as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    examDate: row.exam_date as string,
    studyStartDate: row.study_start_date as string,
    weekdayMinutes: row.weekday_minutes as number,
    weekendMinutes: row.weekend_minutes as number,
    restWeekdays: row.rest_weekdays as UserProfile["restWeekdays"],
    selectedBookId: row.selected_book_id as string,
    itExperience: row.it_experience as UserProfile["itExperience"],
    weakDomains: row.weak_domains as UserProfile["weakDomains"]
  };
}

function mapAnswerToRow(answer: AnswerHistory) {
  return {
    id: answer.id,
    user_id: answer.userId,
    question_id: answer.questionId,
    topic_id: answer.topicId,
    domain: answer.domain,
    selected_choice_id: answer.selectedChoiceId,
    is_correct: answer.isCorrect,
    answered_at: answer.answeredAt
  };
}

function mapAnswerFromRow(row: Record<string, unknown>): AnswerHistory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    questionId: row.question_id as string,
    topicId: row.topic_id as string,
    domain: row.domain as AnswerHistory["domain"],
    selectedChoiceId: row.selected_choice_id as AnswerHistory["selectedChoiceId"],
    isCorrect: row.is_correct as boolean,
    answeredAt: row.answered_at as string
  };
}

function mapReviewToRow(item: ReviewItem) {
  return {
    user_id: item.userId,
    topic_id: item.topicId,
    priority: item.priority,
    reason: item.reason,
    due_date: item.dueDate,
    consecutive_correct: item.consecutiveCorrect,
    updated_at: item.updatedAt
  };
}

function mapReviewFromRow(row: Record<string, unknown>): ReviewItem {
  return {
    userId: row.user_id as string,
    topicId: row.topic_id as string,
    priority: row.priority as number,
    reason: row.reason as ReviewItem["reason"],
    dueDate: row.due_date as string,
    consecutiveCorrect: row.consecutive_correct as number,
    updatedAt: row.updated_at as string
  };
}

function mapStudySessionToRow(session: StudySession) {
  return {
    id: session.id,
    user_id: session.userId,
    topic_id: session.topicId,
    started_at: session.startedAt
  };
}

function mapStudySessionFromRow(row: Record<string, unknown>): StudySession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    topicId: row.topic_id as string,
    startedAt: row.started_at as string
  };
}
