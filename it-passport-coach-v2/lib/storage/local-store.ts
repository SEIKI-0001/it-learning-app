import { promises as fs } from "node:fs";
import path from "node:path";
import type { AnswerHistory, ReviewItem, StudySession, UserProfile } from "@/types/user";
import type { AppRepository, LocalDatabase } from "./types";

const emptyDb: LocalDatabase = {
  users: [],
  answers: [],
  reviewItems: [],
  studySessions: []
};

const dbPath = path.join(process.cwd(), ".local-data", "db.json");

async function readDb(): Promise<LocalDatabase> {
  try {
    const text = await fs.readFile(dbPath, "utf8");
    return { ...emptyDb, ...JSON.parse(text) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    return emptyDb;
  }
}

async function writeDb(db: LocalDatabase): Promise<void> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

export class LocalRepository implements AppRepository {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = await readDb();
    return db.users.find((user) => user.id === userId) ?? null;
  }

  async upsertUserProfile(profile: UserProfile): Promise<UserProfile> {
    const db = await readDb();
    const index = db.users.findIndex((user) => user.id === profile.id);
    if (index >= 0) {
      db.users[index] = profile;
    } else {
      db.users.push(profile);
    }
    await writeDb(db);
    return profile;
  }

  async listUserProfiles(): Promise<UserProfile[]> {
    return (await readDb()).users;
  }

  async recordAnswer(answer: AnswerHistory): Promise<AnswerHistory> {
    const db = await readDb();
    db.answers.push(answer);
    await writeDb(db);
    return answer;
  }

  async listAnswers(userId?: string): Promise<AnswerHistory[]> {
    const answers = (await readDb()).answers;
    return userId ? answers.filter((answer) => answer.userId === userId) : answers;
  }

  async getReviewItems(userId: string): Promise<ReviewItem[]> {
    return (await readDb()).reviewItems.filter((item) => item.userId === userId);
  }

  async upsertReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const db = await readDb();
    const index = db.reviewItems.findIndex(
      (review) => review.userId === item.userId && review.topicId === item.topicId
    );
    if (index >= 0) {
      db.reviewItems[index] = item;
    } else {
      db.reviewItems.push(item);
    }
    await writeDb(db);
    return item;
  }

  async deleteReviewItem(userId: string, topicId: string): Promise<void> {
    const db = await readDb();
    db.reviewItems = db.reviewItems.filter(
      (item) => !(item.userId === userId && item.topicId === topicId)
    );
    await writeDb(db);
  }

  async listReviewItems(userId?: string): Promise<ReviewItem[]> {
    const reviewItems = (await readDb()).reviewItems;
    return userId ? reviewItems.filter((item) => item.userId === userId) : reviewItems;
  }

  async recordStudySession(session: StudySession): Promise<StudySession> {
    const db = await readDb();
    const alreadyRecorded = db.studySessions.some(
      (item) =>
        item.userId === session.userId &&
        item.topicId === session.topicId &&
        item.startedAt.slice(0, 10) === session.startedAt.slice(0, 10)
    );
    if (!alreadyRecorded) {
      db.studySessions.push(session);
      await writeDb(db);
    }
    return session;
  }

  async listStudySessions(userId?: string): Promise<StudySession[]> {
    const sessions = (await readDb()).studySessions;
    return userId ? sessions.filter((session) => session.userId === userId) : sessions;
  }
}
