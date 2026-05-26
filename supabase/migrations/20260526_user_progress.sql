-- User progress table for per-user lesson tracking (optional auth)
-- Run this in the Supabase SQL editor after enabling Google Auth.

create table if not exists user_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  visited_lessons   integer[] default '{}',
  completed_lessons integer[] default '{}',
  points            integer   default 0,
  earned_quizzes    jsonb     default '{}',
  updated_at        timestamptz default now(),
  unique(user_id)
);

alter table user_progress enable row level security;

create policy "Users can manage their own progress"
  on user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
