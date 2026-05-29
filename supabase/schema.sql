-- ============================================================
-- Daily Tracker – Supabase SQL Schema
-- Pink-Themed Digital Daily Productivity Tracker
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
-- Synced from Supabase Auth via trigger. Stores user metadata.
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'User profiles synced from Supabase Auth.';

-- ─────────────────────────────────────────────────────────
-- 2. WEEKLY_GOALS TABLE
-- Stores weekly focus areas, rewards, and affirmations.
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  focus TEXT,
  reward TEXT,
  affirmation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, week_start_date)
);

COMMENT ON TABLE public.weekly_goals IS 'Weekly goals with focus area, reward, and affirmation.';

-- ─────────────────────────────────────────────────────────
-- 3. TASKS TABLE
-- Daily tasks organized by category with completion status.
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'general',
  task_name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.tasks IS 'Daily tasks with category and completion tracking.';

-- ─────────────────────────────────────────────────────────
-- 4. HABITS TABLE
-- Weekly habit tracking matrix (Mon–Sun checkboxes).
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  habit_name TEXT NOT NULL,
  mon_done BOOLEAN NOT NULL DEFAULT FALSE,
  tue_done BOOLEAN NOT NULL DEFAULT FALSE,
  wed_done BOOLEAN NOT NULL DEFAULT FALSE,
  thu_done BOOLEAN NOT NULL DEFAULT FALSE,
  fri_done BOOLEAN NOT NULL DEFAULT FALSE,
  sat_done BOOLEAN NOT NULL DEFAULT FALSE,
  sun_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, week_start_date, habit_name)
);

COMMENT ON TABLE public.habits IS 'Weekly habit tracking with day-by-day completion.';

-- ─────────────────────────────────────────────────────────
-- 5. MONTHLY_EVALUATIONS TABLE
-- Monthly productivity review and self-assessment.
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.monthly_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM' (e.g., '2026-05')
  productivity_score INTEGER CHECK (productivity_score BETWEEN 1 AND 10),
  missed_insights TEXT,
  improvement_suggestions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, month_year)
);

COMMENT ON TABLE public.monthly_evaluations IS 'Monthly self-evaluation with productivity scores and insights.';

-- ─────────────────────────────────────────────────────────
-- 6. INDEXES
-- Optimize queries by user and date ranges.
-- ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_id ON public.weekly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON public.weekly_goals(user_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON public.tasks(user_id, category);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_week ON public.habits(user_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_monthly_evaluations_user_id ON public.monthly_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_evaluations_user_month ON public.monthly_evaluations(user_id, month_year);

-- ─────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- Users can only access their own data.
-- ─────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_evaluations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Weekly Goals policies
CREATE POLICY "Users can view own weekly goals"
  ON public.weekly_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly goals"
  ON public.weekly_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly goals"
  ON public.weekly_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly goals"
  ON public.weekly_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Habits policies
CREATE POLICY "Users can view own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- Monthly Evaluations policies
CREATE POLICY "Users can view own evaluations"
  ON public.monthly_evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluations"
  ON public.monthly_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluations"
  ON public.monthly_evaluations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluations"
  ON public.monthly_evaluations FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- 8. AUTO-CREATE PROFILE ON SIGN UP (Trigger)
-- Automatically creates a profile row when a new user signs up.
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- 9. AUTO-UPDATE updated_at TIMESTAMP
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_weekly_goals_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_monthly_evaluations_updated_at
  BEFORE UPDATE ON public.monthly_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
