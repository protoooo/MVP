-- Business Automation Dashboard Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT, -- 'restaurant', 'retail', 'service'
  owner_id UUID REFERENCES auth.users(id),
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  role TEXT, -- 'manager', 'cook', 'server', etc.
  availability_prefs JSONB, -- {mon: '9-17', tue: '9-17', ...}
  max_hours_per_week INTEGER DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'pending_swap', 'swapped'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift swaps table
CREATE TABLE IF NOT EXISTS shift_swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES staff(id),
  target_id UUID REFERENCES staff(id), -- who they want to swap with
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (communications)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'kitchen-crew', 'monday-openers'
  sender_id UUID REFERENCES staff(id),
  parent_id UUID REFERENCES messages(id), -- for threads
  content TEXT, -- text message
  voice_url TEXT, -- Supabase Storage URL
  transcript TEXT, -- Cohere transcription
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task lists table (checklists)
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'archived'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES staff(id),
  due_date DATE,
  priority TEXT, -- 'low', 'medium', 'high'
  is_complete BOOLEAN DEFAULT FALSE,
  completion_notes TEXT,
  photo_url TEXT, -- Supabase Storage URL
  ai_analysis TEXT, -- Cohere Vision result
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_business ON staff(business_id);
CREATE INDEX IF NOT EXISTS idx_schedules_business ON schedules(business_id);
CREATE INDEX IF NOT EXISTS idx_schedules_staff ON schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(shift_date);
CREATE INDEX IF NOT EXISTS idx_messages_business ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_task_lists_business ON task_lists(business_id);

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Businesses: Users can only see businesses they own or are staff of
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (SELECT 1 FROM staff WHERE staff.business_id = businesses.id AND staff.user_id = auth.uid())
  );

-- Staff: Users can see staff in their business
CREATE POLICY "Users can view staff in their business" ON staff
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = staff.business_id 
      AND (businesses.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM staff s2 WHERE s2.business_id = businesses.id AND s2.user_id = auth.uid()
      ))
    )
  );

-- Schedules: Users can see schedules in their business
CREATE POLICY "Users can view schedules in their business" ON schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = schedules.business_id 
      AND (businesses.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM staff WHERE staff.business_id = businesses.id AND staff.user_id = auth.uid()
      ))
    )
  );

-- Messages: Users can see messages in their business
CREATE POLICY "Users can view messages in their business" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = messages.business_id 
      AND (businesses.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM staff WHERE staff.business_id = businesses.id AND staff.user_id = auth.uid()
      ))
    )
  );

-- Task Lists: Users can see task lists in their business
CREATE POLICY "Users can view task lists in their business" ON task_lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = task_lists.business_id 
      AND (businesses.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM staff WHERE staff.business_id = businesses.id AND staff.user_id = auth.uid()
      ))
    )
  );

-- Tasks: Users can see tasks in their business
CREATE POLICY "Users can view tasks in their business" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_lists 
      JOIN businesses ON businesses.id = task_lists.business_id
      WHERE task_lists.id = tasks.list_id 
      AND (businesses.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM staff WHERE staff.business_id = businesses.id AND staff.user_id = auth.uid()
      ))
    )
  );
