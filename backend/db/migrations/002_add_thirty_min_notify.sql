-- Migration: add thirty_min_notify_sent flag to bookings
-- Run: mysql appointment_app < db/migrations/002_add_thirty_min_notify.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS thirty_min_notify_sent TINYINT(1) NOT NULL DEFAULT 0;

-- Index speeds up the reminderService WHERE clause
CREATE INDEX IF NOT EXISTS idx_bookings_thirty_min
  ON bookings (status, thirty_min_notify_sent, start_datetime);