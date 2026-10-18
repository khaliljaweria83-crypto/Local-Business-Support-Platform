-- ============================================
-- LocalBiz Database
-- Project: BSIT22-G3
-- Team: Yasir Mehmood & Hafiz Bilal Khalil
-- Advisor: Prof. Imran Shafique
-- GIOC Gujranwala (2022-2026)
-- ============================================

-- Force this import to be read as UTF-8 regardless of the importing
-- client's own default charset (some MySQL/phpMyAdmin/XAMPP setups default
-- to latin1). Without this, special characters like — (em-dash) get
-- corrupted into "â€”" style mojibake during import.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS localbiz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE localbiz;

-- ── USERS TABLE ──
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  full_name    VARCHAR(100)  NOT NULL,
  email        VARCHAR(100)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  user_type    ENUM('customer', 'owner', 'admin') NOT NULL DEFAULT 'customer',
  phone        VARCHAR(20),
  status       ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
  reset_token         VARCHAR(64),
  reset_token_expiry  DATETIME,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── EMAIL OTPS TABLE ── (registration email verification + password reset)
CREATE TABLE IF NOT EXISTS email_otps (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(100) NOT NULL,
  purpose     ENUM('registration', 'password_reset') NOT NULL,
  otp_hash    VARCHAR(255) NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  verified    TINYINT(1) NOT NULL DEFAULT 0,
  expires_at  DATETIME NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose)
);

-- ── BUSINESSES TABLE ──
CREATE TABLE IF NOT EXISTS businesses (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  owner_id       INT NOT NULL,
  name           VARCHAR(150)  NOT NULL,
  category       VARCHAR(100)  NOT NULL,
  city           VARCHAR(100)  NOT NULL DEFAULT 'Gujranwala',
  address        TEXT          NOT NULL,
  phone          VARCHAR(20),
  description    TEXT,
  hours          VARCHAR(200),
  latitude       DECIMAL(10, 8),
  longitude      DECIMAL(11, 8),
  photo_url      VARCHAR(500),
  status         ENUM('pending', 'active', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500),
  approval_note    VARCHAR(500),
  is_verified    TINYINT(1)    NOT NULL DEFAULT 0,
  average_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── REVIEWS TABLE ──
CREATE TABLE IF NOT EXISTS reviews (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT  NOT NULL,
  business_id  INT  NOT NULL,
  rating       INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT NOT NULL,
  status       ENUM('active', 'removed') NOT NULL DEFAULT 'active',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id)  ON DELETE CASCADE,
  UNIQUE KEY unique_review (user_id, business_id)
);

-- ── PROMOTIONS TABLE ──
CREATE TABLE IF NOT EXISTS promotions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  business_id  INT          NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  start_date   DATE         NOT NULL,
  end_date     DATE         NOT NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ── REPORTS TABLE ──
CREATE TABLE IF NOT EXISTS reports (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT  NOT NULL,
  business_id  INT,
  review_id    INT,
  type         ENUM('business', 'review') NOT NULL DEFAULT 'business',
  reason       TEXT NOT NULL,
  status       ENUM('pending', 'reviewed', 'dismissed') NOT NULL DEFAULT 'pending',
  admin_response  VARCHAR(500),
  target_label    VARCHAR(200),
  target_excerpt  VARCHAR(255),
  resolved_at  TIMESTAMP NULL DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id)  ON DELETE CASCADE,
  FOREIGN KEY (review_id)   REFERENCES reviews(id)     ON DELETE SET NULL
);

-- ── ADMIN LOGS TABLE ──
CREATE TABLE IF NOT EXISTS admin_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  admin_id     INT          NOT NULL,
  action       VARCHAR(100) NOT NULL,
  target_id    INT,
  target_type  VARCHAR(50),
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Admin User (password: admin123)
INSERT INTO users (full_name, email, password, user_type) VALUES
('Admin LocalBiz', 'admin@localbiz.pk',
 '$2a$10$nBmbz/bTE7Rl1FX9ZH.kL.wDLB7llNZsrtgbFbjCjGSodbFvKHmji',
 'admin');

-- Sample Business Owners (password: password)
INSERT INTO users (full_name, email, password, user_type, phone) VALUES
('Yasir Mehmood',  'yasir@localbiz.pk',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', '+92 300 1234567'),
('Bilal Khalil',   'bilal@localbiz.pk',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', '+92 300 7654321'),
('Ahmed Raza',     'ahmed@email.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', '+92 300 1111111'),
('Sana Tariq',     'sana@email.com',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', '+92 300 2222222'),
('Hassan Ali',     'hassan@email.com',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', '+92 300 3333333'),
('Mehak Fatima',   'mehak@email.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', '+92 300 4444444');

-- Sample Businesses
INSERT INTO businesses (owner_id, name, category, city, address, phone, description, hours, latitude, longitude, status, is_verified, average_rating) VALUES
(2, 'Al-Noor Restaurant',   'Restaurant',  'Gujranwala', 'G.T Road, Gujranwala',            '+92 55 123 4567', 'Authentic Pakistani cuisine — Karahi, Handi & BBQ since 1995.',     'Mon-Thu: 12PM-11:30PM, Fri: 2PM-11:30PM, Sat-Sun: 12PM-12AM', 32.1877, 74.1945, 'active', 1, 4.80),
(2, 'City Pharmacy',        'Health',      'Gujranwala', 'Model Town, Gujranwala',           '+92 55 234 5678', 'Your trusted neighbourhood pharmacy since 1999.',                   '9AM-10PM Daily',                                               32.1850, 74.1900, 'active', 1, 4.50),
(3, 'Urban Clippers',       'Beauty',      'Lahore',     'MM Alam Road, Gulberg, Lahore',    '+92 42 345 6789', 'Modern barber shop with premium grooming services.',               'Mon-Sat: 9AM-9PM',                                             31.5204, 74.3587, 'active', 1, 4.70),
(2, 'Gujranwala Sweets',    'Restaurant',  'Gujranwala', 'Cantt, Gujranwala',                '+92 55 456 7890', 'Famous for mithai, cakes and traditional sweets.',                 '8AM-11PM Daily',                                               32.1900, 74.2000, 'active', 1, 4.60),
(3, 'EduPoint Academy',     'Education',   'Islamabad',  'F-10 Markaz, Islamabad',           '+92 51 567 8901', 'Quality coaching for O/A levels and competitive exams.',           'Mon-Sat: 8AM-8PM',                                             33.6844, 73.0479, 'active', 1, 4.90),
(2, 'FitZone Gym',          'Fitness',     'Karachi',    'Clifton Block 5, Karachi',         '+92 21 678 9012', 'State-of-the-art gym equipment and personal trainers.',            '6AM-10PM Daily',                                               24.8138, 67.0300, 'active', 0, 4.40),
(3, 'AutoFix Garage',       'Auto',        'Gujranwala', 'Industrial Area, Gujranwala',      '+92 55 789 0123', 'Complete car repair and maintenance services.',                    'Mon-Sat: 8AM-6PM',                                             32.1910, 74.2010, 'active', 0, 4.30),
(2, 'The Green Fork',       'Restaurant',  'Gujranwala', 'Defence Road, Gujranwala',         '+92 55 890 1234', 'Fresh organic meals and healthy dining options.',                  'Tue-Sun: 11AM-10PM',                                           32.1840, 74.1960, 'pending',0, 0.00),
(3, 'Faisal Textiles',      'Retail',      'Faisalabad', 'Susan Road, Faisalabad',           '+92 41 234 5678', 'Wholesale and retail fabrics — cotton, lawn & bridal collections.', 'Mon-Sat: 10AM-9PM',                                            31.4180, 73.0790, 'active', 1, 4.60),
(2, 'Multan Sweets & Bakers','Restaurant', 'Multan',     'Cantt Bazaar, Multan',             '+92 61 345 6789', 'Traditional Multani sohan halwa and fresh bakery items.',           '8AM-11PM Daily',                                               30.1978, 71.4697, 'active', 1, 4.50),
(3, 'Peshawar Namak Mandi', 'Restaurant',  'Peshawar',   'Namak Mandi, Peshawar',            '+92 91 456 7890', 'Famous for tikka, karahi and traditional Peshawari cuisine.',       '12PM-12AM Daily',                                              34.0089, 71.5762, 'active', 1, 4.90),
(2, 'Sialkot Sports House', 'Retail',      'Sialkot',    'Paris Road, Sialkot',              '+92 52 567 8901', 'Sports goods manufacturer and retailer — footballs, gloves & gear.', 'Mon-Sat: 9AM-8PM',                                             32.4945, 74.5229, 'active', 0, 4.20);

-- Additional businesses (added so every category and every city has at least 4 listings)
INSERT INTO businesses
(owner_id, name, category, city, address, phone, description, hours, latitude, longitude, status, is_verified, average_rating)
VALUES
(2, 'Wellness Pharmacy', 'Health', 'Lahore', 'DHA Phase 5, Lahore', '+92 42 758 2424', 'Trusted pharmacy and health store stocking genuine medicines and daily essentials.', '9AM-11PM Daily', 31.532224, 74.367535, 'active', 1, 4.59),
(3, 'Care Medical Store', 'Health', 'Lahore', 'DHA Phase 5, Lahore', '+92 42 918 9928', 'Trusted pharmacy and health store stocking genuine medicines and daily essentials.', '9AM-11PM Daily', 31.523462, 74.369501, 'active', 1, 4.42),
(2, 'Al-Shifa Pharmacy', 'Health', 'Lahore', 'Model Town, Lahore', '+92 42 981 6514', 'Trusted pharmacy and health store stocking genuine medicines and daily essentials.', '9AM-11PM Daily', 31.512413, 74.341474, 'active', 1, 4.1),
(3, 'Trim & Tone Barbers', 'Beauty', 'Islamabad', 'I-8 Markaz, Islamabad', '+92 51 749 3045', 'Professional salon offering haircuts, styling, and grooming for the whole family.', 'Mon-Sat: 10AM-8PM', 33.699756, 73.059387, 'active', 1, 4.97),
(2, 'Glow Beauty Salon', 'Beauty', 'Islamabad', 'I-8 Markaz, Islamabad', '+92 51 246 4733', 'Professional salon offering haircuts, styling, and grooming for the whole family.', 'Mon-Sat: 10AM-8PM', 33.688268, 73.058129, 'active', 1, 4.77),
(3, 'Elegance Salon', 'Beauty', 'Islamabad', 'F-7 Markaz, Islamabad', '+92 51 579 6820', 'Professional salon offering haircuts, styling, and grooming for the whole family.', 'Mon-Sat: 10AM-8PM', 33.691184, 73.041142, 'active', 0, 3.71),
(2, 'Scholars Home Tuition', 'Education', 'Karachi', 'DHA Phase 2, Karachi', '+92 21 855 4598', 'Experienced tutors providing quality coaching for school and college students.', 'Mon-Sat: 9AM-7PM', 24.79697, 67.023973, 'pending', 0, 0.0),
(3, 'Bright Future Academy', 'Education', 'Karachi', 'DHA Phase 2, Karachi', '+92 21 780 6155', 'Experienced tutors providing quality coaching for school and college students.', 'Mon-Sat: 9AM-7PM', 24.802187, 67.015549, 'active', 1, 4.21),
(2, 'Karachi Learning Academy', 'Education', 'Karachi', 'Saddar, Karachi', '+92 21 469 8019', 'Experienced tutors providing quality coaching for school and college students.', 'Mon-Sat: 9AM-7PM', 24.801131, 67.033068, 'active', 1, 4.9),
(3, 'Batala Colony Fitness Club', 'Fitness', 'Faisalabad', 'Batala Colony, Faisalabad', '+92 41 312 3504', 'Modern gym equipment, certified trainers and flexible membership plans.', '6AM-10PM Daily', 31.397545, 73.056356, 'active', 1, 4.63),
(2, 'Faisalabad CrossFit Zone', 'Fitness', 'Faisalabad', 'Batala Colony, Faisalabad', '+92 41 211 2876', 'Modern gym equipment, certified trainers and flexible membership plans.', '6AM-10PM Daily', 31.419456, 73.102554, 'rejected', 0, 0.0),
(3, 'FitLife Gym', 'Fitness', 'Faisalabad', 'Peoples Colony, Faisalabad', '+92 41 939 5315', 'Modern gym equipment, certified trainers and flexible membership plans.', '6AM-10PM Daily', 31.400908, 73.054162, 'active', 1, 4.97),
(2, 'Speed Motors', 'Auto', 'Multan', 'Gulgasht Colony, Multan', '+92 61 752 9689', 'Complete vehicle repair, servicing and spare parts under one roof.', 'Mon-Sat: 8AM-7PM', 30.180442, 71.482826, 'active', 1, 4.92),
(3, 'Al-Rehman Auto Parts', 'Auto', 'Multan', 'Shah Rukn-e-Alam, Multan', '+92 61 780 2290', 'Complete vehicle repair, servicing and spare parts under one roof.', 'Mon-Sat: 8AM-7PM', 30.184773, 71.456744, 'active', 1, 4.09),
(2, 'Precision Auto Garage', 'Auto', 'Multan', 'Bosan Road, Multan', '+92 61 740 7932', 'Complete vehicle repair, servicing and spare parts under one roof.', 'Mon-Sat: 8AM-7PM', 30.220142, 71.452956, 'active', 1, 4.96),
(3, 'Peshawar Mega Mart', 'Retail', 'Peshawar', 'Hayatabad, Peshawar', '+92 91 323 5061', 'A one-stop retail shop offering quality products at competitive prices.', '10AM-9PM Daily', 34.005805, 71.577079, 'active', 1, 4.22),
(2, 'Saddar General Store', 'Retail', 'Peshawar', 'Saddar, Peshawar', '+92 91 260 4750', 'A one-stop retail shop offering quality products at competitive prices.', '10AM-9PM Daily', 33.98426, 71.586592, 'active', 0, 3.57),
(3, 'SwiftPrint Services', 'Services', 'Peshawar', 'University Town, Peshawar', '+92 91 784 8744', 'Reliable, on-time local services with experienced and verified staff.', 'Mon-Sat: 9AM-6PM', 33.994612, 71.557816, 'pending', 0, 0.0),
(2, 'Paris Road Home Services', 'Services', 'Sialkot', 'Paris Road, Sialkot', '+92 52 620 8651', 'Reliable, on-time local services with experienced and verified staff.', 'Mon-Sat: 9AM-6PM', 32.502449, 74.515615, 'active', 1, 4.86),
(3, 'Trusted Movers & Packers', 'Services', 'Sialkot', 'Cantt, Sialkot', '+92 52 396 4116', 'Reliable, on-time local services with experienced and verified staff.', 'Mon-Sat: 9AM-6PM', 32.50953, 74.503363, 'active', 1, 4.54),
(2, 'QuickFix Repairs', 'Services', 'Sialkot', 'Paris Road, Sialkot', '+92 52 763 2604', 'Reliable, on-time local services with experienced and verified staff.', 'Mon-Sat: 9AM-6PM', 32.513224, 74.501669, 'active', 1, 4.05),
(3, 'GreenScape Nursery', 'Other', 'Rawalpindi', 'Satellite Town, Rawalpindi', '+92 51 260 3697', 'A locally loved small business serving the community with care.', '10AM-8PM Daily', 33.564168, 73.035133, 'rejected', 0, 0.0),
(2, 'Chandni Chowk Event Planners', 'Other', 'Rawalpindi', 'Chandni Chowk, Rawalpindi', '+92 51 769 8973', 'A locally loved small business serving the community with care.', '10AM-8PM Daily', 33.56125, 73.039766, 'active', 1, 4.15),
(3, 'Handmade Crafts Corner', 'Other', 'Rawalpindi', 'Committee Chowk, Rawalpindi', '+92 51 714 9701', 'A locally loved small business serving the community with care.', '10AM-8PM Daily', 33.542958, 73.021109, 'active', 1, 4.16),
(2, 'Creative Studio', 'Other', 'Rawalpindi', 'Satellite Town, Rawalpindi', '+92 51 783 5033', 'A locally loved small business serving the community with care.', '10AM-8PM Daily', 33.560289, 73.03898, 'active', 1, 4.58),
(3, 'Zaiqa Restaurant', 'Restaurant', 'Quetta', 'Jinnah Town, Quetta', '+92 81 933 6147', 'Serving fresh, authentic local dishes with quick delivery and dine-in options.', '12PM-11PM Daily', 30.201535, 66.960213, 'active', 1, 4.24),
(2, 'Star Electronics', 'Retail', 'Quetta', 'Airport Road, Quetta', '+92 81 776 2638', 'A one-stop retail shop offering quality products at competitive prices.', '10AM-9PM Daily', 30.155266, 66.981058, 'active', 1, 4.07),
(3, 'Cantt Pharmacy', 'Health', 'Quetta', 'Cantt, Quetta', '+92 81 361 8179', 'Trusted pharmacy and health store stocking genuine medicines and daily essentials.', '9AM-11PM Daily', 30.198764, 66.968476, 'active', 0, 4.33),
(2, 'Style Studio', 'Beauty', 'Quetta', 'Sariab Road, Quetta', '+92 81 337 5333', 'Professional salon offering haircuts, styling, and grooming for the whole family.', 'Mon-Sat: 10AM-8PM', 30.201388, 66.955179, 'pending', 0, 0.0),
(3, 'Rise Educators', 'Education', 'Sargodha', 'University Road, Sargodha', '+92 48 408 5325', 'Experienced tutors providing quality coaching for school and college students.', 'Mon-Sat: 9AM-7PM', 32.088841, 72.681981, 'active', 1, 4.51),
(2, 'Civil Lines Home Services', 'Services', 'Sargodha', 'Civil Lines, Sargodha', '+92 48 852 5291', 'Reliable, on-time local services with experienced and verified staff.', 'Mon-Sat: 9AM-6PM', 32.058777, 72.684656, 'active', 1, 4.16),
(3, 'Railway Road Auto Workshop', 'Auto', 'Sargodha', 'Railway Road, Sargodha', '+92 48 352 9938', 'Complete vehicle repair, servicing and spare parts under one roof.', 'Mon-Sat: 8AM-7PM', 32.105853, 72.680651, 'active', 1, 4.04),
(2, 'Active Zone Fitness', 'Fitness', 'Sargodha', 'Civil Lines, Sargodha', '+92 48 240 6862', 'Modern gym equipment, certified trainers and flexible membership plans.', '6AM-10PM Daily', 32.060691, 72.664333, 'rejected', 0, 0.0),
(3, 'Qasimabad Event Planners', 'Other', 'Hyderabad', 'Qasimabad, Hyderabad', '+92 22 442 3662', 'A locally loved small business serving the community with care.', '10AM-8PM Daily', 25.419692, 68.370274, 'active', 1, 4.98),
(2, 'Qasimabad Karahi House', 'Restaurant', 'Hyderabad', 'Qasimabad, Hyderabad', '+92 22 885 5065', 'Serving fresh, authentic local dishes with quick delivery and dine-in options.', '12PM-11PM Daily', 25.410119, 68.353386, 'active', 1, 4.27),
(3, 'Latifabad General Store', 'Retail', 'Hyderabad', 'Latifabad, Hyderabad', '+92 22 512 4728', 'A one-stop retail shop offering quality products at competitive prices.', '10AM-9PM Daily', 25.411829, 68.355815, 'active', 1, 4.22),
(2, 'Hyderabad Diagnostic Lab', 'Health', 'Hyderabad', 'Qasimabad, Hyderabad', '+92 22 895 9785', 'Trusted pharmacy and health store stocking genuine medicines and daily essentials.', '9AM-11PM Daily', 25.388557, 68.35827, 'active', 1, 4.33);


-- Sample Reviews
INSERT INTO reviews (user_id, business_id, rating, comment) VALUES
(4, 1, 5, 'The Chicken Karahi was exceptional. Highly recommended for family dinners!'),
(5, 1, 4, 'Love the BBQ platter. Service was a bit slow but the taste made up for it.'),
(4, 2, 5, 'Very professional and helpful staff. Good medicine availability.'),
(5, 3, 5, 'Best haircut I have ever had. Very clean and modern environment.'),
(4, 4, 4, 'Amazing sweets! The gulab jamun is the best in Gujranwala.'),
(5, 5, 5, 'My child scored 90% after coaching here. Highly recommended!'),
(4, 9, 5, 'Great quality lawn fabric and very fair prices. Will visit again.'),
(5, 10, 4, 'The sohan halwa here is the most authentic in Multan.'),
(4, 11, 5, 'Best chapli kabab and karahi in Namak Mandi, hands down.'),
(5, 12, 4, 'Good quality footballs, they even customize orders for clubs.');

-- Additional reviews on the new businesses
INSERT INTO reviews (user_id, business_id, rating, comment) VALUES
(5, 13, 5, 'Good stock of daily-use health products.'),
(4, 14, 5, 'Genuine medicines and very helpful staff.'),
(4, 15, 5, 'Genuine medicines and very helpful staff.'),
(4, 16, 5, 'Clean place and reasonable prices.'),
(5, 17, 4, 'Great experience, will come again for sure.'),
(4, 18, 4, 'Loved the haircut, very professional stylists.'),
(6, 18, 3, 'Great experience, will come again for sure.'),
(7, 20, 4, 'My grades improved a lot after joining here.'),
(5, 21, 5, 'Teachers explain concepts very clearly.'),
(4, 22, 5, 'Clean gym, always well maintained.'),
(4, 24, 5, 'Flexible timing, perfect for my routine.'),
(6, 25, 4, 'Good quality spare parts available.'),
(4, 26, 5, 'Fixed my car''s issue quickly and fairly priced.'),
(7, 27, 5, 'Good quality spare parts available.'),
(5, 27, 5, 'Honest mechanics, didn''t overcharge me.'),
(5, 28, 4, 'Friendly staff, quick checkout.'),
(4, 29, 5, 'Found exactly what I was looking for.'),
(6, 31, 5, 'Professional service, highly recommend.'),
(7, 31, 5, 'Very reliable and on time.'),
(7, 32, 4, 'Professional service, highly recommend.'),
(7, 33, 5, 'Very reliable and on time.'),
(6, 35, 5, 'Nice place, exceeded expectations.'),
(7, 36, 5, 'Would definitely recommend to others.'),
(4, 37, 5, 'Would definitely recommend to others.'),
(4, 38, 3, 'Loved the flavors, quick service too.'),
(7, 39, 5, 'Friendly staff, quick checkout.'),
(6, 40, 5, 'Quick service, never had to wait long.'),
(4, 40, 4, 'Good stock of daily-use health products.'),
(7, 42, 4, 'My grades improved a lot after joining here.'),
(5, 43, 3, 'Very reliable and on time.'),
(7, 44, 4, 'Fixed my car''s issue quickly and fairly priced.'),
(5, 44, 5, 'Honest mechanics, didn''t overcharge me.'),
(5, 46, 5, 'Nice place, exceeded expectations.'),
(7, 47, 5, 'Loved the flavors, quick service too.'),
(5, 48, 4, 'Good variety and fair prices.'),
(4, 48, 4, 'Good variety and fair prices.'),
(4, 49, 5, 'Good stock of daily-use health products.');


-- Sample Promotion
INSERT INTO promotions (business_id, title, description, start_date, end_date) VALUES
(1, 'Eid Special 20% Off', 'Get 20% discount on all BBQ items this Eid!', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY)),
(3, 'Summer Deal — Free Facial', 'Get a free facial with any haircut this summer.', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY)),
(11, 'Ramzan Iftar Deal', '15% off on family iftar deals throughout Ramzan.', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY));


-- Live Photos — 7 correctly-matched + 3 intentionally MISMATCHED
-- (mismatched ones exist on purpose: 2 are still 'pending' so the admin
-- should catch the wrong photo during review and reject/ask for correction;
-- 1 is already 'active' to show what an admin might have missed / an owner
-- swapped the photo after approval — good discussion point for viva).
UPDATE businesses SET photo_url = '/uploads/seed-biz1-restaurant.jpg' WHERE id = 1;
UPDATE businesses SET photo_url = '/uploads/seed-biz13-pharmacy.jpg'  WHERE id = 13;
UPDATE businesses SET photo_url = '/uploads/seed-biz16-salon.jpg'     WHERE id = 16;
UPDATE businesses SET photo_url = '/uploads/seed-biz22-gym.jpg'       WHERE id = 22;
UPDATE businesses SET photo_url = '/uploads/seed-biz25-auto.jpg'      WHERE id = 25;
UPDATE businesses SET photo_url = '/uploads/seed-biz28-retail.jpg'    WHERE id = 28;
UPDATE businesses SET photo_url = '/uploads/seed-biz35-event.jpg'     WHERE id = 35;

-- Intentionally mismatched photos (category vs. photo content don't match)
UPDATE businesses SET photo_url = '/uploads/seed-biz20-wrong.jpg' WHERE id = 20; -- Education business, garage photo (already active — admin missed it)
UPDATE businesses SET photo_url = '/uploads/seed-biz19-wrong.jpg' WHERE id = 19; -- Education business, restaurant photo (still pending)
UPDATE businesses SET photo_url = '/uploads/seed-biz41-wrong.jpg' WHERE id = 41; -- Beauty business, gym photo (still pending)

-- Sample Report
INSERT INTO reports (user_id, business_id, type, reason) VALUES
(4, 7, 'business', 'Phone number is not working. Address seems incorrect.');
