/**
 * Database type definitions matching the Supabase schema.
 * These types ensure type safety when querying Supabase tables.
 */

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoal {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date string
  focus: string | null;
  reward: string | null;
  affirmation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  date: string; // ISO date string
  category: string;
  task_name: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date string
  habit_name: string;
  mon_done: boolean;
  tue_done: boolean;
  wed_done: boolean;
  thu_done: boolean;
  fri_done: boolean;
  sat_done: boolean;
  sun_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyEvaluation {
  id: string;
  user_id: string;
  month_year: string; // Format: 'YYYY-MM'
  productivity_score: number | null; // 1-10
  missed_insights: string | null;
  improvement_suggestions: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema type for Supabase client generics.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      weekly_goals: {
        Row: WeeklyGoal;
        Insert: Omit<WeeklyGoal, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<WeeklyGoal, "id" | "user_id" | "created_at" | "updated_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Task, "id" | "user_id" | "created_at" | "updated_at">>;
      };
      habits: {
        Row: Habit;
        Insert: Omit<Habit, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">>;
      };
      monthly_evaluations: {
        Row: MonthlyEvaluation;
        Insert: Omit<MonthlyEvaluation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<MonthlyEvaluation, "id" | "user_id" | "created_at" | "updated_at">>;
      };
    };
  };
}
