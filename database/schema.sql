-- MySQL 8.0.16+. Apply to an EMPTY, explicitly selected database only.
CREATE TABLE departments (
 department_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 department_name VARCHAR(255) NOT NULL UNIQUE,
 department_code VARCHAR(20) NOT NULL UNIQUE,
 hod_id INT UNSIGNED NULL
) ENGINE=InnoDB;
CREATE TABLE users (
 user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
 email VARCHAR(255) NOT NULL UNIQUE, phone VARCHAR(30) NOT NULL DEFAULT '',
 password_hash VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL,
 department_id INT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY user_department (user_id, department_id),
 FOREIGN KEY (department_id) REFERENCES departments(department_id),
 CONSTRAINT user_role CHECK (role IN ('Instructor','Head of Department','Bookstore')),
 CONSTRAINT user_department_required CHECK (
  (role = 'Bookstore' AND department_id IS NULL) OR
  (role IN ('Instructor','Head of Department') AND department_id IS NOT NULL))
) ENGINE=InnoDB;
-- Also enforce that the designated HoD belongs to this department.
ALTER TABLE departments ADD CONSTRAINT department_hod
 FOREIGN KEY (hod_id, department_id) REFERENCES users(user_id, department_id);
CREATE TABLE courses (
 course_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 course_number VARCHAR(50) NOT NULL, course_name VARCHAR(255) NOT NULL, term VARCHAR(50) NOT NULL,
 instructor_id INT UNSIGNED NOT NULL, department_id INT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY instructor_course_term (instructor_id, course_number, term),
 KEY instructor_date (instructor_id, created_at),
 FOREIGN KEY (instructor_id, department_id) REFERENCES users(user_id, department_id),
 FOREIGN KEY (department_id) REFERENCES departments(department_id)
) ENGINE=InnoDB;
-- Immutable textbook snapshot per submission. No UNIQUE(course_id).
CREATE TABLE textbooks (
 textbook_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, course_id INT UNSIGNED NOT NULL,
 publisher VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL, author VARCHAR(255) NOT NULL,
 isbn VARCHAR(20) NOT NULL DEFAULT '', edition VARCHAR(50) NOT NULL DEFAULT '',
 quantity INT NOT NULL, other_materials TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY textbook_course (textbook_id, course_id),
 KEY course_latest (course_id, created_at, textbook_id),
 FOREIGN KEY (course_id) REFERENCES courses(course_id),
 CONSTRAINT positive_quantity CHECK (quantity > 0),
 CONSTRAINT textbook_required CHECK (CHAR_LENGTH(TRIM(title)) > 0 AND
  CHAR_LENGTH(TRIM(author)) > 0 AND CHAR_LENGTH(TRIM(publisher)) > 0)
) ENGINE=InnoDB;
CREATE TABLE requests (
 request_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 course_id INT UNSIGNED NOT NULL, textbook_id INT UNSIGNED NOT NULL UNIQUE,
 requested_by INT UNSIGNED NOT NULL, assigned_hod_id INT UNSIGNED NOT NULL,
 approved_by INT UNSIGNED NULL, status VARCHAR(50) NOT NULL DEFAULT 'Pending',
 approval_date DATETIME NULL, rejection_comments TEXT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at DATETIME NULL,
 KEY requester_date (requested_by, created_at),
 KEY reviewer_status (assigned_hod_id, status, created_at),
 KEY bookstore_status (status, archived_at),
 FOREIGN KEY (course_id) REFERENCES courses(course_id),
 FOREIGN KEY (textbook_id, course_id) REFERENCES textbooks(textbook_id, course_id),
 FOREIGN KEY (requested_by) REFERENCES users(user_id),
 FOREIGN KEY (assigned_hod_id) REFERENCES users(user_id),
 FOREIGN KEY (approved_by) REFERENCES users(user_id),
 CONSTRAINT request_status CHECK (status IN ('Pending','Rejected','Approved',
  'Ready to be ordered','Ordered','Arrived','Ready to pick up','Picked up')),
 CONSTRAINT decision_metadata CHECK (
  (status = 'Pending' AND approved_by IS NULL AND approval_date IS NULL AND rejection_comments IS NULL) OR
  (status = 'Rejected' AND approved_by IS NULL AND approval_date IS NULL AND
   rejection_comments IS NOT NULL AND CHAR_LENGTH(TRIM(rejection_comments)) > 0) OR
  (status IN ('Approved','Ready to be ordered','Ordered','Arrived','Ready to pick up','Picked up') AND
   approved_by IS NOT NULL AND approved_by = assigned_hod_id AND approval_date IS NOT NULL AND rejection_comments IS NULL))
) ENGINE=InnoDB;
