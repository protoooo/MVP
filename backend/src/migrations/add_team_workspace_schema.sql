-- Migration: Add Team Workspace Schema
-- Created: 2026-01-03

-- Team Channels
CREATE TABLE IF NOT EXISTS team_channels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_channels_user_id_idx ON team_channels(user_id);
CREATE INDEX IF NOT EXISTS team_channels_organization_id_idx ON team_channels(organization_id);

-- Team Messages
CREATE TABLE IF NOT EXISTS team_messages (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES team_channels(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments JSONB,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_messages_channel_id_idx ON team_messages(channel_id);
CREATE INDEX IF NOT EXISTS team_messages_user_id_idx ON team_messages(user_id);
CREATE INDEX IF NOT EXISTS team_messages_created_at_idx ON team_messages(created_at DESC);

-- Team Events (for activity tracking)
CREATE TABLE IF NOT EXISTS team_events (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES team_channels(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- message, join, leave, file_upload, etc.
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_events_channel_id_idx ON team_events(channel_id);
CREATE INDEX IF NOT EXISTS team_events_created_at_idx ON team_events(created_at DESC);
