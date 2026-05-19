-- =========================================================
-- Appointment Booking System - MySQL Schema (extended)
-- =========================================================
DROP DATABASE IF EXISTS appointment_app;
CREATE DATABASE appointment_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE appointment_app;

-- ---------- USERS ----------
CREATE TABLE users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('customer','admin','organiser') NOT NULL DEFAULT 'customer',
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  otp_code        VARCHAR(10)  NULL,
  otp_expires_at  DATETIME     NULL,
  phone_otp_code      VARCHAR(10) NULL,
  phone_otp_expires_at DATETIME    NULL,
  is_verified     TINYINT(1)   NOT NULL DEFAULT 0,
  is_phone_verified TINYINT(1)  NOT NULL DEFAULT 0,
  reset_token     VARCHAR(120) NULL,
  reset_expires_at DATETIME    NULL,
  phone           VARCHAR(40)  NULL,
  preferred_language VARCHAR(8) NOT NULL DEFAULT 'en',
  country         VARCHAR(80)  NULL,
  state           VARCHAR(80)  NULL,
  district        VARCHAR(80)  NULL,
  city            VARCHAR(80)  NULL,
  latitude        DECIMAL(10,7) NULL,
  longitude       DECIMAL(10,7) NULL,
  avatar_url      VARCHAR(500) NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB;

-- ---------- SERVICE CATEGORIES ----------
CREATE TABLE service_categories (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  `key`           VARCHAR(40) NOT NULL UNIQUE,
  name            VARCHAR(120) NOT NULL,
  icon            VARCHAR(40)  NOT NULL DEFAULT 'sparkles',
  color           VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
  description     VARCHAR(255) NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  tax_percentage  DECIMAL(5,2) NOT NULL DEFAULT 18.00   -- auto-applied GST rate
) ENGINE=InnoDB;

-- ---------- SERVICES (appointment types) ----------
CREATE TABLE services (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  organiser_id          INT NOT NULL,
  category_id           INT NULL,
  name                  VARCHAR(160) NOT NULL,
  description           TEXT,
  image_url             VARCHAR(500) NULL,
  duration_minutes      INT NOT NULL DEFAULT 30,
  buffer_minutes        INT NOT NULL DEFAULT 0,
  venue                 VARCHAR(255),
  appointment_type      ENUM('in_person','virtual','hybrid') NOT NULL DEFAULT 'in_person',
  virtual_provider      ENUM('google_meet','zoom','custom','none') NOT NULL DEFAULT 'none',
  virtual_link          VARCHAR(500) NULL,
  country               VARCHAR(80)  NULL,
  state                 VARCHAR(80)  NULL,
  district              VARCHAR(80)  NULL,
  city                  VARCHAR(80)  NULL,
  latitude              DECIMAL(10,7) NULL,
  longitude             DECIMAL(10,7) NULL,
  price                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_percent           DECIMAL(5,2)  NOT NULL DEFAULT 0,
  tax_threshold         DECIMAL(10,2) NOT NULL DEFAULT 0,
  manage_capacity       TINYINT(1) NOT NULL DEFAULT 0,
  max_per_slot          INT NOT NULL DEFAULT 1,
  group_booking         TINYINT(1) NOT NULL DEFAULT 0,
  advance_payment       TINYINT(1) NOT NULL DEFAULT 0,
  manual_confirmation   TINYINT(1) NOT NULL DEFAULT 0,
  assignment_mode       ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  schedule_type         ENUM('weekly','flexible') NOT NULL DEFAULT 'weekly',
  resource_kind         ENUM('user','resource') NOT NULL DEFAULT 'user',
  is_published          TINYINT(1) NOT NULL DEFAULT 0,
  is_deleted            TINYINT(1) NOT NULL DEFAULT 0,    -- soft delete by organiser/admin
  share_token           VARCHAR(64) NOT NULL UNIQUE,
  rating                DECIMAL(3,2) NOT NULL DEFAULT 4.8,
  rating_count          INT NOT NULL DEFAULT 0,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_org FOREIGN KEY (organiser_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_cat FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL,
  INDEX idx_services_published (is_published),
  INDEX idx_services_deleted (is_deleted),
  INDEX idx_services_org (organiser_id),
  INDEX idx_services_cat (category_id)
) ENGINE=InnoDB;

-- ---------- RESOURCES / PROVIDERS attached to a service ----------
CREATE TABLE resources (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  service_id  INT NOT NULL,
  name        VARCHAR(160) NOT NULL,
  user_id     INT NULL,            -- if resource_kind='user'
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_resources_service (service_id)
) ENGINE=InnoDB;

-- ---------- WEEKLY SCHEDULES (for schedule_type='weekly') ----------
CREATE TABLE weekly_schedules (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  service_id   INT NOT NULL,
  day_of_week  TINYINT NOT NULL,    -- 0=Sun .. 6=Sat
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  CONSTRAINT fk_ws_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_ws_service_day (service_id, day_of_week)
) ENGINE=InnoDB;

-- ---------- FLEXIBLE / SPECIFIC AVAILABILITY SLOTS ----------
CREATE TABLE availability_slots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  service_id      INT NOT NULL,
  start_datetime  DATETIME NOT NULL,
  end_datetime    DATETIME NOT NULL,
  CONSTRAINT fk_av_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_av_service_start (service_id, start_datetime)
) ENGINE=InnoDB;

-- ---------- CALENDAR NOTES (admin/organiser annotations on a date) ----------
CREATE TABLE calendar_notes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  service_id  INT NULL,
  note_date   DATE NOT NULL,
  note        VARCHAR(255) NOT NULL,
  is_blocked  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cn_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_cn_date (note_date),
  INDEX idx_cn_service_date (service_id, note_date)
) ENGINE=InnoDB;

-- ---------- BOOKING QUESTIONS (per service) ----------
CREATE TABLE booking_questions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  service_id   INT NOT NULL,
  question     VARCHAR(255) NOT NULL,
  field_type   ENUM('text','textarea','number','phone','email','select') NOT NULL DEFAULT 'text',
  options      VARCHAR(500) NULL,            -- comma-separated for select
  category     VARCHAR(80) NULL,             -- group label
  is_required  TINYINT(1) NOT NULL DEFAULT 1,
  sort_order   INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_q_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_q_service (service_id)
) ENGINE=InnoDB;

-- ---------- BOOKINGS ----------
CREATE TABLE bookings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  service_id      INT NOT NULL,
  resource_id     INT NOT NULL,
  customer_id     INT NOT NULL,
  booked_for_name VARCHAR(160) NULL,           -- if booking on behalf of someone else
  booked_for_phone VARCHAR(40) NULL,
  purpose         VARCHAR(255) NULL,
  start_datetime  DATETIME NOT NULL,
  end_datetime    DATETIME NOT NULL,
  capacity_taken  INT NOT NULL DEFAULT 1,
  status          ENUM('pending','reserved','confirmed','cancelled','completed','rescheduled') NOT NULL DEFAULT 'confirmed',
  payment_status  ENUM('not_required','pending','paid','refunded') NOT NULL DEFAULT 'not_required',
  total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  credits_used    INT NOT NULL DEFAULT 0,
  discount_code   VARCHAR(40) NULL,
  meeting_link    VARCHAR(500) NULL,
  appointment_type ENUM('in_person','virtual') NOT NULL DEFAULT 'in_person',
  reminder_sent   TINYINT(1) NOT NULL DEFAULT 0,
  imminent_notify_sent TINYINT(1) NOT NULL DEFAULT 0,    -- "starts now" alert sent to both parties
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_book_service  FOREIGN KEY (service_id)  REFERENCES services(id),
  CONSTRAINT fk_book_resource FOREIGN KEY (resource_id) REFERENCES resources(id),
  CONSTRAINT fk_book_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  INDEX idx_book_slot   (resource_id, start_datetime, status),
  INDEX idx_book_service_slot (service_id, start_datetime, status),
  INDEX idx_book_customer (customer_id),
  INDEX idx_book_status (status),
  INDEX idx_book_created (created_at)
) ENGINE=InnoDB;

-- ---------- BOOKING ANSWERS ----------
CREATE TABLE booking_answers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  booking_id  INT NOT NULL,
  question_id INT NOT NULL,
  answer_text TEXT NOT NULL,
  CONSTRAINT fk_ba_book FOREIGN KEY (booking_id)  REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_ba_q    FOREIGN KEY (question_id) REFERENCES booking_questions(id) ON DELETE CASCADE,
  INDEX idx_ba_book (booking_id)
) ENGINE=InnoDB;

-- ---------- PAYMENTS ----------
CREATE TABLE payments (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  booking_id           INT NOT NULL,
  amount               DECIMAL(10,2) NOT NULL,
  method               ENUM('card','credit_card','debit_card','upi','google_pay','paypal','wallet','razorpay') NOT NULL,
  status               ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  transaction_id       VARCHAR(120) NULL,
  razorpay_order_id    VARCHAR(120) NULL,
  razorpay_payment_id  VARCHAR(120) NULL,
  razorpay_signature   VARCHAR(255) NULL,
  paid_at              DATETIME NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_book FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_pay_book (booking_id),
  INDEX idx_pay_status (status),
  INDEX idx_pay_rzp_order (razorpay_order_id)
) ENGINE=InnoDB;

-- ---------- SUBSCRIPTION PLANS ----------
CREATE TABLE subscription_plans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  `key`         VARCHAR(20) NOT NULL UNIQUE,    -- silver / gold / platinum
  name          VARCHAR(80) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  priority_level INT NOT NULL DEFAULT 0,         -- 0=basic 1=priority 2=vip
  features      TEXT NOT NULL,                  -- JSON list of feature strings
  color         VARCHAR(20) NOT NULL DEFAULT '#94a3b8',
  is_active     TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- ---------- USER SUBSCRIPTIONS ----------
CREATE TABLE user_subscriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  plan_id     INT NOT NULL,
  started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL,
  status      ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  CONSTRAINT fk_us_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_us_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_us_user (user_id, status)
) ENGINE=InnoDB;

-- ---------- CREDIT TRANSACTIONS (coins with expiry) ----------
CREATE TABLE credit_transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  amount      INT NOT NULL,                        -- positive=earn negative=spend
  reason      VARCHAR(120) NOT NULL,
  reference_id INT NULL,
  expires_at  DATETIME NULL,                       -- NULL for spend rows
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ct_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ct_user (user_id),
  INDEX idx_ct_expires (expires_at)
) ENGINE=InnoDB;

-- ---------- DISCOUNT CODES ----------
CREATE TABLE discount_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(40) NOT NULL UNIQUE,
  type        ENUM('percent','flat') NOT NULL DEFAULT 'percent',
  value       DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses    INT NOT NULL DEFAULT 0,              -- 0=unlimited
  used_count  INT NOT NULL DEFAULT 0,
  active_from DATETIME NULL,
  active_to   DATETIME NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  description VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- NOTIFICATIONS ----------
CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(160) NOT NULL,
  body       VARCHAR(500) NULL,
  link       VARCHAR(255) NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read, created_at)
) ENGINE=InnoDB;

-- ---------- CHAT MESSAGES (assistant) ----------
CREATE TABLE chat_messages (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  role       ENUM('user','assistant') NOT NULL,
  text       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat_user (user_id, created_at)
) ENGINE=InnoDB;

-- ---------- LOCATIONS (Country → State → District → City) ----------
CREATE TABLE locations (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  country   VARCHAR(80) NOT NULL,
  state     VARCHAR(80) NOT NULL,
  district  VARCHAR(80) NOT NULL,
  city      VARCHAR(80) NOT NULL,
  UNIQUE KEY uniq_loc (country, state, district, city)
) ENGINE=InnoDB;

-- ---------- INTEGRATIONS (Calendar / Meet sync) ----------
CREATE TABLE integrations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  provider    ENUM('google_calendar','google_meet','zoom','outlook') NOT NULL,
  external_id VARCHAR(255) NULL,
  access_token VARCHAR(500) NULL,
  refresh_token VARCHAR(500) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_int_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_int_user (user_id, provider)
) ENGINE=InnoDB;

-- ---------- REVIEWS / RATINGS ----------
CREATE TABLE reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  service_id  INT NOT NULL,
  customer_id INT NOT NULL,
  booking_id  INT NULL,
  rating      INT NOT NULL,
  comment     VARCHAR(500) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rev_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rev_service (service_id)
) ENGINE=InnoDB;

-- ---------- SAVED SERVICES (wishlist) ----------
CREATE TABLE saved_services (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  service_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_save (user_id, service_id),
  CONSTRAINT fk_save_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_save_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_save_user (user_id)
) ENGINE=InnoDB;

-- ---------- UPLOADED IMAGES (service card photos, avatars) ----------
-- Binary stored in the DB itself (MEDIUMBLOB ≤ 16 MB) so deployments do not
-- need a writable shared filesystem. Served via GET /uploads/:filename.
CREATE TABLE uploaded_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  filename    VARCHAR(120) NOT NULL UNIQUE,
  mime_type   VARCHAR(80)  NOT NULL,
  size_bytes  INT          NOT NULL,
  data        MEDIUMBLOB   NOT NULL,
  uploaded_by INT          NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_img_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_img_user (uploaded_by)
) ENGINE=InnoDB;

-- ---------- BLOCKED / PREMIUM-RESERVED SLOTS ----------
-- A slot can be blocked outright, or reserved for users above a priority level
-- (e.g. min_priority_level=2 = Platinum-only).
CREATE TABLE blocked_slots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  service_id      INT NOT NULL,
  resource_id     INT NULL,
  start_datetime  DATETIME NOT NULL,
  end_datetime    DATETIME NOT NULL,
  reason          VARCHAR(160) NULL,
  min_priority_level INT NOT NULL DEFAULT 99,        -- 99 = blocked for everyone
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bs_service  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE CASCADE,
  CONSTRAINT fk_bs_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  INDEX idx_bs_lookup (service_id, start_datetime)
) ENGINE=InnoDB;
