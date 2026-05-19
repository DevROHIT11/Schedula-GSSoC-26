-- Seed data for testing
USE appointment_app;

-- Default password for all seed users: "password123"
SET @pw := '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lq';

INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified, is_phone_verified, phone, country, state, district, city) VALUES
 ('System Admin','admin@app.com',         @pw, 'admin',    1, 1, 1, '9999900001', 'India', 'Maharashtra', 'Pune', 'Pune'),
 ('Dr. Smith',   'organiser@app.com',     @pw, 'organiser',1, 1, 1, '9999900002', 'India', 'Maharashtra', 'Pune', 'Pune'),
 ('Jane Doe',    'customer@app.com',      @pw, 'customer', 1, 1, 1, '9999900003', 'India', 'Maharashtra', 'Pune', 'Pune'),
 ('Dr. Watson',  'watson@app.com',        @pw, 'organiser',1, 1, 1, '9999900004', 'India', 'Karnataka', 'Bengaluru', 'Bengaluru'),
 ('Coach Maria', 'maria@app.com',         @pw, 'organiser',1, 1, 1, '9999900005', 'India', 'Maharashtra', 'Mumbai', 'Mumbai'),
 ('Akash Mehta', 'akash@app.com',         @pw, 'customer', 1, 1, 1, '9999900006', 'India', 'Gujarat', 'Ahmedabad', 'Ahmedabad');

-- ---------- CATEGORIES (with India GST rates auto-applied at booking time) ----------
INSERT INTO service_categories (`key`, name, icon, color, description, sort_order, tax_percentage) VALUES
 ('healthcare', 'Healthcare', 'heart',     '#ef4444', 'Doctors, clinics & wellness checkups',         1,  5.00),
 ('sports',     'Sports',     'trophy',    '#10b981', 'Coaches, courts & training sessions',          2, 18.00),
 ('counseling', 'Counseling', 'brain',     '#8b5cf6', 'Therapists & mental wellness experts',         3, 18.00),
 ('events',     'Events',     'calendar',  '#f59e0b', 'Studios, photographers & venues',              4, 18.00),
 ('interviews', 'Interviews', 'briefcase', '#3b82f6', 'Mock interviews & career coaching',            5, 18.00),
 ('services',   'Services',   'wrench',    '#0ea5e9', 'Salons, repairs & home services',              6, 18.00),
 ('virtual',    'Virtual',    'video',     '#a855f7', 'Online consultations, remote support, classes', 7, 18.00);

-- ---------- SUBSCRIPTION PLANS ----------
INSERT INTO subscription_plans (`key`, name, price_monthly, priority_level, features, color) VALUES
 ('silver',   'Silver',   0,    0,
  '["Browse all services","Standard booking","Email reminders","Basic support"]',
  '#94a3b8'),
 ('gold',     'Gold',     299,  1,
  '["Priority booking slots","Earn 2x credits","SMS reminders","Reschedule for free","Priority support"]',
  '#f59e0b'),
 ('platinum', 'Platinum', 799,  2,
  '["VIP priority booking","Earn 5x credits","Dedicated account manager","Free cancellation","Exclusive partner discounts","Family bookings"]',
  '#a855f7');

-- ---------- DISCOUNT CODES ----------
INSERT INTO discount_codes (code, type, value, min_amount, max_uses, is_active, description) VALUES
 ('WELCOME10','percent',10,    0, 0, 1, '10% off your first booking'),
 ('SAVE100',  'flat',  100,  500, 0, 1, 'Flat ₹100 off on bookings above ₹500'),
 ('VIT2026',  'percent',25,   0, 100, 1, 'Hackathon special — 25% off');

-- ---------- LOCATIONS ----------
INSERT INTO locations (country, state, district, city) VALUES
 ('India','Maharashtra','Pune','Pune'),
 ('India','Maharashtra','Pune','Pimpri-Chinchwad'),
 ('India','Maharashtra','Mumbai','Mumbai'),
 ('India','Maharashtra','Mumbai','Navi Mumbai'),
 ('India','Maharashtra','Nagpur','Nagpur'),
 ('India','Karnataka','Bengaluru','Bengaluru'),
 ('India','Karnataka','Bengaluru','Whitefield'),
 ('India','Karnataka','Mysuru','Mysuru'),
 ('India','Tamil Nadu','Chennai','Chennai'),
 ('India','Tamil Nadu','Coimbatore','Coimbatore'),
 ('India','Delhi','New Delhi','New Delhi'),
 ('India','Delhi','New Delhi','Dwarka'),
 ('India','Gujarat','Ahmedabad','Ahmedabad'),
 ('India','Gujarat','Surat','Surat'),
 ('India','Telangana','Hyderabad','Hyderabad'),
 ('India','Telangana','Hyderabad','Secunderabad');

-- ---------- SERVICES ----------
INSERT INTO services
 (organiser_id,category_id,name,description,image_url,duration_minutes,buffer_minutes,venue,
  appointment_type,virtual_provider,virtual_link,
  country,state,district,city,
  price,tax_percent,tax_threshold,
  manage_capacity,max_per_slot,group_booking,
  advance_payment,manual_confirmation,assignment_mode,schedule_type,resource_kind,
  is_published,share_token,rating,rating_count)
VALUES
 (2,1,'Dental Care','Professional dental cleaning, check-ups, and consultations performed by certified specialists in a calm, modern environment.',
  'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=900&q=80&auto=format&fit=crop',
  30,5,'Doctor''s Office, 64 Doctor Street, Pune 411001',
  'in_person','none',NULL,
  'India','Maharashtra','Pune','Pune',
  1000,10,500,
  0,1,0,
  0,0,'auto','weekly','user',
  1,'tok_dental_001',4.9,127),

 (2,2,'Group Yoga Class','Morning yoga session for groups — focus on flexibility, breath, and balance.',
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80&auto=format&fit=crop',
  60,0,'Yoga Studio, MG Road, Pune',
  'in_person','none',NULL,
  'India','Maharashtra','Pune','Pune',
  500,5,0,
  1,10,1,
  0,1,'auto','weekly','resource',
  1,'tok_yoga_002',4.8,84),

 (4,3,'Therapy Session','One-on-one counseling for stress, anxiety, and life transitions in a safe, private space.',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80&auto=format&fit=crop',
  45,15,'Online — Google Meet',
  'virtual','google_meet','https://meet.jit.si/SchedulaBkg-3-therapy',
  'India','Karnataka','Bengaluru','Bengaluru',
  1500,18,1000,
  0,1,0,
  1,0,'auto','weekly','user',
  1,'tok_therapy_003',4.95,212),

 (4,5,'Mock Interview - Software','60-minute mock interview with structured feedback for software engineering roles.',
  'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=900&q=80&auto=format&fit=crop',
  60,10,'Online — Zoom',
  'virtual','zoom','https://meet.jit.si/SchedulaBkg-4-mock',
  'India','Karnataka','Bengaluru','Bengaluru',
  2000,18,1000,
  0,1,0,
  1,0,'auto','weekly','user',
  1,'tok_mock_004',4.9,156),

 (5,2,'Personal Training','Personalised one-on-one fitness sessions tailored to your goals — strength, endurance, mobility.',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80&auto=format&fit=crop',
  60,15,'FitClub, Linking Road, Mumbai',
  'in_person','none',NULL,
  'India','Maharashtra','Mumbai','Mumbai',
  1200,12,500,
  0,1,0,
  0,0,'auto','weekly','user',
  1,'tok_fitness_005',4.85,98),

 (5,4,'Photo Studio Session','Professional studio photography — portraits, products, and creative shoots with edited deliverables.',
  'https://images.unsplash.com/photo-1470114716159-e389f8712fda?w=900&q=80&auto=format&fit=crop',
  90,30,'Studio 7, Bandra West, Mumbai',
  'in_person','none',NULL,
  'India','Maharashtra','Mumbai','Mumbai',
  3500,18,2000,
  1,4,1,
  1,1,'manual','flexible','resource',
  1,'tok_studio_006',4.7,42),

 (2,6,'Hair & Beauty','Modern salon services — precision cuts, colour, and styling by experienced stylists.',
  'https://images.unsplash.com/photo-1562280963-8a5475740a10?w=900&q=80&auto=format&fit=crop',
  45,5,'Glow Salon, FC Road, Pune',
  'in_person','none',NULL,
  'India','Maharashtra','Pune','Pune',
  800,5,0,
  0,1,0,
  0,0,'auto','weekly','user',
  1,'tok_salon_007',4.6,63),

 (5,2,'CrossFit Bootcamp','High-intensity 45-minute group bootcamp — strength, conditioning and cardio in one tight session.',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80&auto=format&fit=crop',
  45,15,'IronFit Gym, Bandra, Mumbai',
  'in_person','none',NULL,
  'India','Maharashtra','Mumbai','Mumbai',
  600,5,0,
  1,15,1,
  0,0,'auto','weekly','resource',
  1,'tok_crossfit_008',4.8,212),

 (4,3,'Career Coaching','Strategic career coaching — career mapping, transitions, and leadership development.',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80&auto=format&fit=crop',
  60,15,'Online — Google Meet',
  'virtual','google_meet',NULL,
  'India','Karnataka','Bengaluru','Bengaluru',
  2500,18,1500,
  0,1,0,
  1,0,'auto','weekly','user',
  1,'tok_career_009',4.9,73),

 (5,1,'Home Lab Tests','Certified phlebotomist visits your home for blood draw and lab tests with same-day digital reports.',
  'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=900&q=80&auto=format&fit=crop',
  30,15,'Home visit (within Mumbai)',
  'in_person','none',NULL,
  'India','Maharashtra','Mumbai','Mumbai',
  799,12,500,
  0,1,0,
  1,0,'auto','weekly','user',
  1,'tok_homelab_010',4.7,341),

 (2,6,'AC / Appliance Repair','Trained technicians for AC, washing machine, fridge & microwave service & repair at your doorstep.',
  'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=900&q=80&auto=format&fit=crop',
  60,30,'On-site, Pune & Pimpri-Chinchwad',
  'in_person','none',NULL,
  'India','Maharashtra','Pune','Pune',
  499,18,500,
  0,1,0,
  0,0,'auto','weekly','user',
  1,'tok_repair_011',4.5,512),

 (4,5,'Mock Interview - Product','45-minute case-based interview prep for PM roles with structured rubric and written feedback.',
  'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=900&q=80&auto=format&fit=crop',
  45,15,'Online — Zoom',
  'virtual','zoom',NULL,
  'India','Karnataka','Bengaluru','Bengaluru',
  1800,18,1000,
  0,1,0,
  1,0,'auto','weekly','user',
  1,'tok_mockpm_012',4.9,98),

 -- Unique services for the new "Virtual" category. These do NOT exist
 -- in any other category — they're online-only platforms.
 (4,7,'Online Consultation','30-minute one-on-one online consultation with vetted experts across domains.',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80&auto=format&fit=crop',
  30,5,'Online — Google Meet',
  'virtual','google_meet',NULL,
  'India',NULL,NULL,NULL,
  799,0,0,
  0,1,0,
  1,0,'auto','weekly','user',
  1,'tok_oconsult_013',4.8,154),

 (4,7,'Remote IT Support','Live screen-share troubleshooting for laptops, networks and SaaS apps. 1-hour session.',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&q=80&auto=format&fit=crop',
  60,10,'Online — Zoom',
  'virtual','zoom',NULL,
  'India',NULL,NULL,NULL,
  1499,0,0,
  0,1,0,
  1,0,'auto','weekly','user',
  1,'tok_remoteit_014',4.85,89),

 (5,7,'Virtual Classroom','Live group class for skills, languages or hobbies — up to 20 attendees per slot.',
  'https://images.unsplash.com/photo-1610484826917-0f101a7c6c93?w=900&q=80&auto=format&fit=crop',
  60,0,'Online — Google Meet',
  'virtual','google_meet',NULL,
  'India',NULL,NULL,NULL,
  399,0,0,
  1,20,1,
  1,1,'auto','weekly','resource',
  1,'tok_vclass_015',4.7,221);

-- ---------- RESOURCES ----------
INSERT INTO resources (service_id,name,user_id) VALUES
 (1,'Dr. Smith',2),
 (1,'Dr. Watson',4),
 (2,'Studio Room A',NULL),
 (2,'Studio Room B',NULL),
 (3,'Dr. Watson',4),
 (4,'Dr. Watson',4),
 (5,'Coach Maria',5),
 (6,'Studio Bay 1',NULL),
 (6,'Studio Bay 2',NULL),
 (7,'Dr. Smith',2),
 (8,'CrossFit Floor A',NULL),
 (8,'CrossFit Floor B',NULL),
 (9,'Dr. Watson',4),
 (10,'Phlebotomist Team',5),
 (11,'Technician Team',2),
 (12,'Dr. Watson',4),
 (13,'Online Consultant',4),
 (14,'Remote IT Engineer',4),
 (15,'Virtual Classroom A',NULL),
 (15,'Virtual Classroom B',NULL);

-- ---------- WEEKLY SCHEDULES ----------
INSERT INTO weekly_schedules (service_id,day_of_week,start_time,end_time) VALUES
 (1,1,'09:00:00','17:00:00'),(1,2,'09:00:00','17:00:00'),(1,3,'09:00:00','17:00:00'),(1,4,'09:00:00','17:00:00'),(1,5,'09:00:00','17:00:00'),
 (2,1,'06:00:00','09:00:00'),(2,2,'06:00:00','09:00:00'),(2,3,'06:00:00','09:00:00'),(2,4,'06:00:00','09:00:00'),(2,5,'06:00:00','09:00:00'),(2,6,'06:00:00','09:00:00'),
 (3,1,'10:00:00','19:00:00'),(3,2,'10:00:00','19:00:00'),(3,3,'10:00:00','19:00:00'),(3,4,'10:00:00','19:00:00'),(3,5,'10:00:00','19:00:00'),(3,6,'10:00:00','15:00:00'),
 (4,1,'18:00:00','22:00:00'),(4,2,'18:00:00','22:00:00'),(4,3,'18:00:00','22:00:00'),(4,4,'18:00:00','22:00:00'),(4,5,'18:00:00','22:00:00'),(4,6,'10:00:00','18:00:00'),(4,0,'10:00:00','16:00:00'),
 (5,1,'06:00:00','21:00:00'),(5,2,'06:00:00','21:00:00'),(5,3,'06:00:00','21:00:00'),(5,4,'06:00:00','21:00:00'),(5,5,'06:00:00','21:00:00'),(5,6,'07:00:00','13:00:00'),
 (6,2,'10:00:00','18:00:00'),(6,3,'10:00:00','18:00:00'),(6,4,'10:00:00','18:00:00'),(6,5,'10:00:00','18:00:00'),(6,6,'10:00:00','18:00:00'),
 (7,1,'10:00:00','20:00:00'),(7,2,'10:00:00','20:00:00'),(7,3,'10:00:00','20:00:00'),(7,4,'10:00:00','20:00:00'),(7,5,'10:00:00','20:00:00'),(7,6,'10:00:00','18:00:00'),
 (8,1,'06:00:00','21:00:00'),(8,2,'06:00:00','21:00:00'),(8,3,'06:00:00','21:00:00'),(8,4,'06:00:00','21:00:00'),(8,5,'06:00:00','21:00:00'),(8,6,'07:00:00','12:00:00'),
 (9,1,'10:00:00','19:00:00'),(9,2,'10:00:00','19:00:00'),(9,3,'10:00:00','19:00:00'),(9,4,'10:00:00','19:00:00'),(9,5,'10:00:00','19:00:00'),
 (10,1,'07:00:00','12:00:00'),(10,2,'07:00:00','12:00:00'),(10,3,'07:00:00','12:00:00'),(10,4,'07:00:00','12:00:00'),(10,5,'07:00:00','12:00:00'),(10,6,'07:00:00','11:00:00'),
 (11,1,'09:00:00','19:00:00'),(11,2,'09:00:00','19:00:00'),(11,3,'09:00:00','19:00:00'),(11,4,'09:00:00','19:00:00'),(11,5,'09:00:00','19:00:00'),(11,6,'09:00:00','17:00:00'),
 (12,1,'18:00:00','22:00:00'),(12,2,'18:00:00','22:00:00'),(12,3,'18:00:00','22:00:00'),(12,4,'18:00:00','22:00:00'),(12,5,'18:00:00','22:00:00'),(12,6,'10:00:00','18:00:00'),(12,0,'10:00:00','15:00:00'),
 (13,1,'09:00:00','21:00:00'),(13,2,'09:00:00','21:00:00'),(13,3,'09:00:00','21:00:00'),(13,4,'09:00:00','21:00:00'),(13,5,'09:00:00','21:00:00'),(13,6,'10:00:00','17:00:00'),(13,0,'10:00:00','15:00:00'),
 (14,1,'10:00:00','22:00:00'),(14,2,'10:00:00','22:00:00'),(14,3,'10:00:00','22:00:00'),(14,4,'10:00:00','22:00:00'),(14,5,'10:00:00','22:00:00'),(14,6,'10:00:00','18:00:00'),
 (15,1,'17:00:00','21:00:00'),(15,2,'17:00:00','21:00:00'),(15,3,'17:00:00','21:00:00'),(15,4,'17:00:00','21:00:00'),(15,5,'17:00:00','21:00:00'),(15,6,'10:00:00','15:00:00'),(15,0,'10:00:00','15:00:00');

-- ---------- BOOKING QUESTIONS ----------
INSERT INTO booking_questions (service_id,question,field_type,is_required,sort_order,category) VALUES
 (1,'Full name','text',1,1,'Patient details'),
 (1,'Email','email',1,2,'Patient details'),
 (1,'Phone number','phone',1,3,'Patient details'),
 (1,'Symptoms or reason for visit','textarea',0,4,'Visit'),
 (1,'Preferred dentist','select',0,5,'Visit'),
 (2,'Full name','text',1,1,'Attendee'),
 (2,'Email','email',1,2,'Attendee'),
 (2,'Phone number','phone',1,3,'Attendee'),
 (2,'Yoga experience level','select',0,4,'Class'),
 (3,'Full name','text',1,1,'Client'),
 (3,'Email','email',1,2,'Client'),
 (3,'What would you like to discuss?','textarea',1,3,'Session'),
 (4,'Full name','text',1,1,'Candidate'),
 (4,'Email','email',1,2,'Candidate'),
 (4,'Target role','text',1,3,'Interview'),
 (4,'Years of experience','number',1,4,'Interview'),
 (5,'Full name','text',1,1,'Client'),
 (5,'Phone number','phone',1,2,'Client'),
 (5,'Fitness goal','textarea',1,3,'Goals'),
 (6,'Full name','text',1,1,'Booker'),
 (6,'Email','email',1,2,'Booker'),
 (6,'Type of shoot','select',1,3,'Session'),
 (7,'Full name','text',1,1,'Client'),
 (7,'Phone number','phone',1,2,'Client'),
 (7,'Preferred service','select',1,3,'Service'),
 (8,'Full name','text',1,1,'Member'),
 (8,'Email','email',1,2,'Member'),
 (8,'Phone number','phone',1,3,'Member'),
 (8,'Fitness level','select',1,4,'Class'),
 (9,'Full name','text',1,1,'Candidate'),
 (9,'Email','email',1,2,'Candidate'),
 (9,'Current role','text',1,3,'Career'),
 (9,'Goals for the session','textarea',0,4,'Career'),
 (10,'Full name','text',1,1,'Patient'),
 (10,'Phone number','phone',1,2,'Patient'),
 (10,'Address','textarea',1,3,'Visit'),
 (10,'Preferred panel','select',0,4,'Visit'),
 (11,'Full name','text',1,1,'Customer'),
 (11,'Phone number','phone',1,2,'Customer'),
 (11,'Appliance type','select',1,3,'Service'),
 (11,'Issue description','textarea',1,4,'Service'),
 (12,'Full name','text',1,1,'Candidate'),
 (12,'Email','email',1,2,'Candidate'),
 (12,'Target company','text',0,3,'Interview'),
 (12,'Years of experience','number',1,4,'Interview'),
 (13,'Full name','text',1,1,'Client'),
 (13,'Email','email',1,2,'Client'),
 (13,'What would you like to discuss?','textarea',1,3,'Session'),
 (14,'Full name','text',1,1,'Customer'),
 (14,'Email','email',1,2,'Customer'),
 (14,'Issue / device','textarea',1,3,'Issue'),
 (15,'Full name','text',1,1,'Attendee'),
 (15,'Email','email',1,2,'Attendee'),
 (15,'Topic / class','select',1,3,'Class');

UPDATE booking_questions SET options='Dr. Smith,Dr. Watson,Any available' WHERE service_id=1 AND question='Preferred dentist';
UPDATE booking_questions SET options='Beginner,Intermediate,Advanced' WHERE service_id=2 AND question='Yoga experience level';
UPDATE booking_questions SET options='Portrait,Product,Event,Creative' WHERE service_id=6 AND question='Type of shoot';
UPDATE booking_questions SET options='Haircut,Color,Styling,Beard,Spa' WHERE service_id=7 AND question='Preferred service';
UPDATE booking_questions SET options='Beginner,Intermediate,Advanced' WHERE service_id=8 AND question='Fitness level';
UPDATE booking_questions SET options='Standard,Advanced,Diabetes,Heart,Custom' WHERE service_id=10 AND question='Preferred panel';
UPDATE booking_questions SET options='AC,Washing Machine,Refrigerator,Microwave,Other' WHERE service_id=11 AND question='Appliance type';
UPDATE booking_questions SET options='Spoken English,Yoga,Coding,Music,Languages,Other' WHERE service_id=15 AND question='Topic / class';

-- ---------- BLOCKED / PREMIUM-RESERVED SLOTS ----------
-- Reserve a peak therapy slot (Mon 18:00) for Platinum members only.
INSERT INTO blocked_slots (service_id, resource_id, start_datetime, end_datetime, reason, min_priority_level) VALUES
 (3, 5, DATE_ADD(CURDATE(), INTERVAL (8 - DAYOFWEEK(CURDATE())) % 7 + 1 DAY) + INTERVAL 18 HOUR,
       DATE_ADD(CURDATE(), INTERVAL (8 - DAYOFWEEK(CURDATE())) % 7 + 1 DAY) + INTERVAL 18 HOUR + INTERVAL 45 MINUTE,
  'Platinum priority slot', 2),
 (4, 6, DATE_ADD(CURDATE(), INTERVAL (8 - DAYOFWEEK(CURDATE())) % 7 + 1 DAY) + INTERVAL 19 HOUR,
       DATE_ADD(CURDATE(), INTERVAL (8 - DAYOFWEEK(CURDATE())) % 7 + 1 DAY) + INTERVAL 19 HOUR + INTERVAL 60 MINUTE,
  'Gold/Platinum priority slot', 1);

-- ---------- CALENDAR NOTES ----------
INSERT INTO calendar_notes (service_id,note_date,note,is_blocked) VALUES
 (1,'2026-08-15','Independence Day — clinic closed',1),
 (NULL,'2026-12-25','Christmas — restricted bookings',0);

-- ---------- USER SUBSCRIPTIONS ----------
INSERT INTO user_subscriptions (user_id,plan_id,started_at,expires_at,status) VALUES
 (3,2,NOW(),DATE_ADD(NOW(),INTERVAL 30 DAY),'active'),
 (6,1,NOW(),DATE_ADD(NOW(),INTERVAL 365 DAY),'active');

-- ---------- CREDIT TRANSACTIONS ----------
INSERT INTO credit_transactions (user_id,amount,reason,expires_at) VALUES
 (3,500,'Welcome bonus',DATE_ADD(NOW(),INTERVAL 90 DAY)),
 (3,200,'Gold subscription bonus',DATE_ADD(NOW(),INTERVAL 60 DAY)),
 (6,100,'Welcome bonus',DATE_ADD(NOW(),INTERVAL 90 DAY));

-- ---------- DEMO BOOKINGS for charts ----------
INSERT INTO bookings (service_id,resource_id,customer_id,start_datetime,end_datetime,capacity_taken,status,payment_status,total_amount,subtotal_amount,tax_amount,appointment_type,created_at) VALUES
 (1,1,3, DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 1 DAY),'%Y-%m-%d 09:00:00'), DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 1 DAY),'%Y-%m-%d 09:30:00'),1,'completed','paid',1100,1000,100,'in_person',DATE_SUB(NOW(),INTERVAL 1 DAY)),
 (1,1,6, DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 1 DAY),'%Y-%m-%d 11:00:00'), DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 1 DAY),'%Y-%m-%d 11:30:00'),1,'completed','paid',1100,1000,100,'in_person',DATE_SUB(NOW(),INTERVAL 1 DAY)),
 (3,5,3, DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 2 DAY),'%Y-%m-%d 14:00:00'), DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 2 DAY),'%Y-%m-%d 14:45:00'),1,'completed','paid',1770,1500,270,'virtual',DATE_SUB(NOW(),INTERVAL 2 DAY)),
 (4,6,6, DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 3 DAY),'%Y-%m-%d 19:00:00'), DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 3 DAY),'%Y-%m-%d 20:00:00'),1,'completed','paid',2360,2000,360,'virtual',DATE_SUB(NOW(),INTERVAL 3 DAY)),
 (2,3,3, DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 4 DAY),'%Y-%m-%d 06:00:00'), DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 4 DAY),'%Y-%m-%d 07:00:00'),2,'completed','not_required',525,500,25,'in_person',DATE_SUB(NOW(),INTERVAL 4 DAY)),
 (5,7,3, DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 5 DAY),'%Y-%m-%d 18:00:00'), DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 5 DAY),'%Y-%m-%d 19:00:00'),1,'cancelled','not_required',1344,1200,144,'in_person',DATE_SUB(NOW(),INTERVAL 5 DAY)),
 (1,2,3, DATE_FORMAT(DATE_ADD(NOW(),INTERVAL 1 DAY),'%Y-%m-%d 10:00:00'), DATE_FORMAT(DATE_ADD(NOW(),INTERVAL 1 DAY),'%Y-%m-%d 10:30:00'),1,'confirmed','not_required',1100,1000,100,'in_person',NOW()),
 (3,5,6, DATE_FORMAT(DATE_ADD(NOW(),INTERVAL 2 DAY),'%Y-%m-%d 15:00:00'), DATE_FORMAT(DATE_ADD(NOW(),INTERVAL 2 DAY),'%Y-%m-%d 15:45:00'),1,'pending','pending',1770,1500,270,'virtual',NOW());

-- ---------- DEMO REVIEWS ----------
INSERT INTO reviews (service_id, customer_id, rating, comment) VALUES
 (1, 3, 5, 'Smooth check-in, modern equipment, gentle and thorough.'),
 (3, 3, 5, 'Insightful, kind, and very practical advice.'),
 (4, 6, 5, 'Best mock interview I have done. Detailed feedback.'),
 (2, 3, 4, 'Energizing class, great instructor.');

-- ---------- DEMO NOTIFICATIONS ----------
INSERT INTO notifications (user_id, type, title, body, link) VALUES
 (3, 'welcome', 'Welcome to Schedula', 'Earn 500 credits on your first booking — explore curated services.', '/'),
 (3, 'reminder', 'Upcoming appointment', 'Your dental check-up is scheduled tomorrow at 10:00 AM.', '/profile'),
 (6, 'welcome', 'Welcome aboard', 'Your account is ready. Use code WELCOME10 for 10% off your first booking.', '/');
