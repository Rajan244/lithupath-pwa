import Dexie, { type Table } from 'dexie';

export interface CourseItem {
  item_id: string;
  lt: string;
  en: string;
  type: string;
  level: string;
  topic: string;
  day: number;
  importance: number;
  tags: string[];
  quiz_modes: string[];
  grammar_note?: string;
  mnemonic?: string;
  pattern?: string;
}

export interface UserItemProgress {
  user_id: string;
  item_id: string;
  score: number;
  status: 'new' | 'weak' | 'medium' | 'strong' | 'mastered';
  times_seen: number;
  times_correct: number;
  times_wrong: number;
  last_result: 'correct' | 'wrong' | null;
  last_seen_at: string;
  next_review_at: string;
}

export interface TestAttempt {
  attempt_id: string;
  user_id: string;
  item_id: string;
  mode: string;
  expected_answer: string;
  user_answer: string;
  is_correct: boolean;
  score_before: number;
  score_after: number;
  created_at: string;
}

export interface UserDailyProgress {
  user_id: string;
  day: number;
  new_items_completed: number;
  review_items_completed: number;
  daily_test_score: number;
  completed: boolean;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  current_day: number;
}

export class LithuPathDatabase extends Dexie {
  course_items!: Table<CourseItem, string>;
  user_item_progress!: Table<UserItemProgress, string>;
  test_attempts!: Table<TestAttempt, string>;
  user_daily_progress!: Table<UserDailyProgress, number>;
  user_settings!: Table<UserSettings, string>;

  constructor() {
    super('LithuPathDB');
    this.version(2).stores({
      course_items: 'item_id, day, topic, level, type',
      user_item_progress: 'item_id, [item_id+user_id], user_id, status, next_review_at, score',
      test_attempts: 'attempt_id, user_id, item_id, created_at',
      user_daily_progress: 'day, user_id, created_at',
      user_settings: 'user_id'
    });
  }
}

export const db = new LithuPathDatabase();
