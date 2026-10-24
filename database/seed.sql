-- PORTFOLIO DEMO ONLY. All people and accounts are synthetic; never load into production.
-- Load ONCE after schema.sql into a fresh, explicitly selected empty demo/test database.
-- Passwords are stored only as bcrypt cost-10 hashes; see DEMO_SEED_REPORT.md for demo login.
-- Dates are deterministic UTC; ISBNs are synthetic checksum-valid demo identifiers.
SET time_zone = '+00:00';
START TRANSACTION;
INSERT INTO departments (department_id, department_name, department_code) VALUES
 (1, 'Computer Science', 'CS'),
 (2, 'Social Work', 'SW'),
 (3, 'Business Administration', 'BA');
INSERT INTO users (user_id, first_name, last_name, email, role, department_id, password_hash, created_at) VALUES
 (101, 'Alice', 'Carter', 'alice.carter@example.test', 'Instructor', 1, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (104, 'Daniel', 'Kim', 'daniel.kim@example.test', 'Instructor', 1, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (105, 'Priya', 'Shah', 'priya.shah@example.test', 'Instructor', 1, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (201, 'David', 'Brooks', 'david.brooks@example.test', 'Head of Department', 1, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (102, 'Sarah', 'Mitchell', 'sarah.mitchell@example.test', 'Instructor', 2, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (106, 'Jordan', 'Lee', 'jordan.lee@example.test', 'Instructor', 2, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (107, 'Emily', 'Rodriguez', 'emily.rodriguez@example.test', 'Instructor', 2, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (202, 'Michael', 'Reed', 'michael.reed@example.test', 'Head of Department', 2, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (103, 'Olivia', 'Bennett', 'olivia.bennett@example.test', 'Instructor', 3, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (108, 'Marcus', 'Green', 'marcus.green@example.test', 'Instructor', 3, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (109, 'Sophia', 'Turner', 'sophia.turner@example.test', 'Instructor', 3, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (203, 'Rachel', 'Thompson', 'rachel.thompson@example.test', 'Head of Department', 3, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00'),
 (301, 'Jamie', 'Taylor', 'bookstore@example.test', 'Bookstore', NULL, '$2b$10$n/4CXVyKawKXvfMQYctzeuVwU2xOIwRV2Zd.Jjbjpwh7EWZMvkLPG', '2026-09-01 08:00:00');
UPDATE departments SET hod_id = 201 WHERE department_id = 1;
UPDATE departments SET hod_id = 202 WHERE department_id = 2;
UPDATE departments SET hod_id = 203 WHERE department_id = 3;
INSERT INTO courses (course_id, course_number, course_name, term, instructor_id, department_id, created_at) VALUES
 (11, 'CS 101', 'Introduction to Programming', 'Fall 2026', 101, 1, '2026-09-02 08:00:00'),
 (14, 'CS 205', 'Data Structures', 'Fall 2026', 104, 1, '2026-09-02 08:00:00'),
 (15, 'CS 302', 'Database Systems', 'Fall 2026', 105, 1, '2026-09-02 08:00:00'),
 (21, 'CS 401', 'Software Engineering', 'Fall 2026', 201, 1, '2026-09-02 08:00:00'),
 (12, 'SW 201', 'Introduction to Social Work', 'Fall 2026', 102, 2, '2026-09-02 08:00:00'),
 (16, 'SW 310', 'Human Behavior and the Social Environment', 'Fall 2026', 106, 2, '2026-09-02 08:00:00'),
 (17, 'SW 410', 'Social Work Practice', 'Fall 2026', 107, 2, '2026-09-02 08:00:00'),
 (22, 'SW 450', 'Social Welfare Policy', 'Fall 2026', 202, 2, '2026-09-02 08:00:00'),
 (13, 'BA 210', 'Principles of Management', 'Fall 2026', 103, 3, '2026-09-02 08:00:00'),
 (18, 'BA 305', 'Marketing Management', 'Fall 2026', 108, 3, '2026-09-02 08:00:00'),
 (19, 'BA 330', 'Business Analytics', 'Fall 2026', 109, 3, '2026-09-02 08:00:00'),
 (23, 'BA 450', 'Strategic Management', 'Fall 2026', 203, 3, '2026-09-02 08:00:00');
-- Each request owns a separate immutable textbook snapshot.
INSERT INTO textbooks (textbook_id, course_id, title, author, publisher, isbn, edition, quantity, other_materials, created_at) VALUES
 (1, 11, 'Python Crash Course', 'Eric Matthes', 'No Starch Press', '9780000000019', '3rd', 35, '', '2026-09-05 09:00:00'),
 (2, 14, 'Data Structures and Algorithms in Python', 'Demo Author', 'Demo Academic Press', '9780000000026', '2nd', 30, '', '2026-09-12 09:00:00'),
 (3, 15, 'Database System Concepts', 'Abraham Silberschatz, Henry Korth, S. Sudarshan', 'McGraw Hill', '9780000000033', '7th', 28, '', '2026-10-15 09:00:00'),
 (4, 12, 'Introduction to Social Work', 'Demo Author', 'Demo Academic Press', '9780000000040', '4th', 26, '', '2026-09-08 09:00:00'),
 (5, 16, 'Human Behavior in the Social Environment', 'Demo Author', 'Demo Academic Press', '9780000000057', '3rd', 24, '', '2026-10-05 09:00:00'),
 (6, 17, 'Social Work Practice', 'Demo Author', 'Demo Academic Press', '9780000000064', '5th', 25, '', '2026-10-01 09:00:00'),
 (7, 13, 'Management', 'Demo Author', 'Demo Academic Press', '9780000000071', '15th', 32, '', '2026-10-16 09:00:00'),
 (8, 18, 'Marketing Management', 'Demo Author', 'Demo Academic Press', '9780000000088', '16th', 29, '', '2026-10-07 09:00:00'),
 (9, 19, 'Business Analytics', 'Demo Author', 'Demo Academic Press', '9780000000095', '3rd', 27, '', '2026-10-03 09:00:00');
INSERT INTO requests (request_id, course_id, textbook_id, requested_by, assigned_hod_id, approved_by, status, created_at, approval_date, rejection_comments, archived_at) VALUES
 (1, 11, 1, 101, 201, 201, 'Approved', '2026-09-05 09:00:00', '2026-09-07 10:00:00', NULL, NULL),
 (2, 14, 2, 104, 201, NULL, 'Rejected', '2026-09-12 09:00:00', NULL, 'Please verify the ISBN and edition before resubmitting.', NULL),
 (3, 15, 3, 105, 201, NULL, 'Pending', '2026-10-15 09:00:00', NULL, NULL, NULL),
 (4, 12, 4, 102, 202, 202, 'Approved', '2026-09-08 09:00:00', '2026-09-09 10:00:00', NULL, NULL),
 (5, 16, 5, 106, 202, 202, 'Ready to be ordered', '2026-10-05 09:00:00', '2026-10-06 10:00:00', NULL, NULL),
 (6, 17, 6, 107, 202, 202, 'Ready to pick up', '2026-10-01 09:00:00', '2026-10-02 10:00:00', NULL, NULL),
 (7, 13, 7, 103, 203, NULL, 'Pending', '2026-10-16 09:00:00', NULL, NULL, NULL),
 (8, 18, 8, 108, 203, 203, 'Ordered', '2026-10-07 09:00:00', '2026-10-08 10:00:00', NULL, NULL),
 (9, 19, 9, 109, 203, 203, 'Arrived', '2026-10-03 09:00:00', '2026-10-04 10:00:00', NULL, NULL);
-- HoD-owned CS 401, SW 450 and BA 450 intentionally have no requests or snapshots.
COMMIT;
