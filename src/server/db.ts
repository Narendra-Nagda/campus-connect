import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from './auth.ts';

export function openDatabase(dbPath?: string): DatabaseSync {
  const targetPath =
    dbPath ?? path.join(process.cwd(), '.data', 'campus_connect.db');

  if (targetPath !== ':memory:') {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'admin')),
      department TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL,
      department TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 100,
      organizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_rsvps (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      department TEXT NOT NULL,
      course_code TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size_label TEXT NOT NULL,
      content_body TEXT NOT NULL,
      download_count INTEGER NOT NULL DEFAULT 0,
      uploaded_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      topic TEXT NOT NULL,
      channel_type TEXT NOT NULL CHECK(channel_type IN ('channel', 'direct')),
      department TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedInitialData(db);
  return db;
}

function seedInitialData(db: DatabaseSync): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as {
    count: number;
  };

  const now = new Date('2026-11-15T08:30:00.000Z');
  const isoOffset = (hoursOffset: number) =>
    new Date(now.getTime() + hoursOffset * 3600 * 1000).toISOString();

  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, full_name, password_hash, role, department, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(
    'usr-student-3',
    'shukh.bhatiya',
    'shukh@campus.edu',
    'Shukh Vansh Bhatiya',
    hashPassword('student123'),
    'student',
    'Computer Science',
    isoOffset(-650)
  );

  if (existing.count > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, full_name, password_hash, role, department, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `);

  const studentHash = hashPassword('student123');
  const facultyHash = hashPassword('faculty123');
  const adminHash = hashPassword('admin123');

  insertUser.run(
    'usr-student-1',
    'arju.prajapati',
    'arju@campus.edu',
    'Arju Prajapati',
    studentHash,
    'student',
    'Computer Science',
    isoOffset(-720)
  );
  insertUser.run(
    'usr-student-2',
    'meera.joshi',
    'meera@campus.edu',
    'Meera Joshi',
    studentHash,
    'student',
    'Electronics & Communication',
    isoOffset(-680)
  );
  insertUser.run(
    'usr-faculty-1',
    'nandani.prajapat',
    'nandani@campus.edu',
    'Prof. Nandani Prajapat',
    facultyHash,
    'faculty',
    'Computer Science',
    isoOffset(-900)
  );
  insertUser.run(
    'usr-faculty-2',
    'dr.kapoor',
    'kapoor@campus.edu',
    'Dr. Vikram Kapoor',
    facultyHash,
    'faculty',
    'Mechanical Engineering',
    isoOffset(-880)
  );
  insertUser.run(
    'usr-admin-1',
    'narendra.nagda',
    'admin@campus.edu',
    'Narendra Nagda',
    adminHash,
    'admin',
    'Campus Administration',
    isoOffset(-1000)
  );

  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (id, title, body, category, department, is_pinned, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAnnouncement.run(
    'ann-1',
    'End-Semester Examination Timetable Published',
    'The Fall 2026 end-semester theory examination schedule is now finalized. Students in B.Tech Semester V and VII must verify their seat allocation and admit card status prior to November 24. Lab practical evaluations begin on December 2 in designated departmental laboratories.',
    'Examination',
    'Academic Affairs',
    1,
    'usr-admin-1',
    isoOffset(-4)
  );
  insertAnnouncement.run(
    'ann-2',
    'CS-301 Software Engineering: SRS Experiment 2 Submission Window',
    'Students enrolled in CS-301 should upload their finalized Software Requirements Specification (SRS) document and peer review checklist by Friday at 17:00. Reference templates and grading rubrics are available in the Academic Resources repository.',
    'Academic',
    'Computer Science',
    1,
    'usr-faculty-1',
    isoOffset(-14)
  );
  insertAnnouncement.run(
    'ann-3',
    'Central Library Extended Hours During Finals Preparation',
    'Beginning November 18 through December 14, the Central Reference Library and Quiet Study Wing will remain open daily from 07:30 to 23:30. Valid student or faculty ID cards are required for evening entry after 20:00.',
    'Campus Life',
    'Campus Services',
    0,
    'usr-admin-1',
    isoOffset(-28)
  );
  insertAnnouncement.run(
    'ann-4',
    'Mechanical Design Studio Safety Orientation Mandatory Check-In',
    'All second-year and third-year students utilizing the CAD/CAM and Rapid Prototyping Lab must complete the updated safety briefing before booking equipment slots for semester capstone projects.',
    'Administration',
    'Mechanical Engineering',
    0,
    'usr-faculty-2',
    isoOffset(-46)
  );

  const insertEvent = db.prepare(`
    INSERT INTO events (id, title, description, category, location, starts_at, ends_at, capacity, organizer_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEvent.run(
    'evt-1',
    'Software Architecture & SRS Peer Critique Colloquium',
    'Interactive faculty-led workshop reviewing IEEE 830 / ISO 29148 Software Requirements Specification structure, functional vs. non-functional traceability matrices, and system modeling.',
    'Seminar',
    'Turing Auditorium, Block B',
    isoOffset(28),
    isoOffset(30),
    120,
    'usr-faculty-1',
    isoOffset(-48)
  );
  insertEvent.run(
    'evt-2',
    'Full-Stack Systems Engineering Lab Sprint',
    'Hands-on technical clinic covering REST API authentication, SQLite schema design, and role-based access control verification for semester engineering teams.',
    'Workshop',
    'Systems Innovation Lab 204',
    isoOffset(52),
    isoOffset(56),
    60,
    'usr-faculty-1',
    isoOffset(-40)
  );
  insertEvent.run(
    'evt-3',
    'Annual Campus Placement & Internship Briefing',
    'Placement cell orientation with alumni engineers covering technical portfolio preparation, mock interviews, and spring internship registration timelines.',
    'Career',
    'Main Convention Hall',
    isoOffset(100),
    isoOffset(102),
    250,
    'usr-admin-1',
    isoOffset(-32)
  );
  insertEvent.run(
    'evt-4',
    'Inter-Departmental Robotics & CAD Showcase',
    'Live project demonstrations from Mechanical and Computer Science student teams showcasing autonomous line followers and structural assemblies.',
    'Cultural',
    'Central Quadrangle Pavilion',
    isoOffset(148),
    isoOffset(152),
    180,
    'usr-faculty-2',
    isoOffset(-20)
  );

  const insertRsvp = db.prepare(`
    INSERT INTO event_rsvps (event_id, user_id, created_at) VALUES (?, ?, ?)
  `);
  insertRsvp.run('evt-1', 'usr-student-1', isoOffset(-10));
  insertRsvp.run('evt-1', 'usr-student-2', isoOffset(-8));
  insertRsvp.run('evt-3', 'usr-student-2', isoOffset(-6));

  const insertResource = db.prepare(`
    INSERT INTO resources (
      id, title, description, resource_type, department, course_code,
      file_name, file_size_label, content_body, download_count, uploaded_by_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertResource.run(
    'res-1',
    'CS-301 Software Engineering Complete Course Syllabus',
    'Official Fall 2026 syllabus detailing weekly lecture modules, SRS documentation milestones, assessment weights, and recommended textbooks.',
    'Syllabus',
    'Computer Science',
    'CS-301',
    'CS301_Syllabus_Fall2026.txt',
    '12 KB',
    [
      'COURSE SYLLABUS: CS-301 SOFTWARE ENGINEERING',
      'Instructor: Prof. Nandani Prajapat | Department of Computer Science',
      '',
      'Module 1: Software Process Models (Waterfall, Agile, Spiral)',
      'Module 2: Requirements Engineering & IEEE SRS Documentation',
      'Module 3: System Modeling, UML Diagrams, and Architectural Design',
      'Module 4: Verification, Validation, and Automated Testing',
      'Module 5: Software Maintenance, Configuration Management & DevOps',
      '',
      'Grading Breakdown:',
      '- Lab Experiments & SRS Documentation: 30%',
      '- Mid-Semester Examination: 25%',
      '- End-Semester Examination: 45%',
    ].join('\n'),
    42,
    'usr-faculty-1',
    isoOffset(-120)
  );
  insertResource.run(
    'res-2',
    'Experiment 2: SRS Writing Guide & Traceability Checklist',
    'Step-by-step lab manual covering functional requirements (REQ-IDs), stimulus/response sequences, and non-functional quality attributes.',
    'Lab Manual',
    'Computer Science',
    'CS-301',
    'CS301_Exp2_SRS_Guide.txt',
    '18 KB',
    [
      'EXPERIMENT NO. 2 — SOFTWARE REQUIREMENT SPECIFICATION (SRS) GUIDE',
      'Prepared by: Department of Computer Science',
      '',
      '1. Introduction: Purpose, Conventions, Scope',
      '2. Overall Description: Product Perspective, Functions, User Classes',
      '3. External Interface Requirements: UI, Hardware, Software, Comms',
      '4. System Features: Functional Requirements (REQ-1 .. REQ-N)',
      '5. Nonfunctional Requirements: Performance, Safety, Security, Quality',
      '',
      'Checklist before submission:',
      '[x] Every functional requirement has a unique REQ-ID and testable criterion.',
      '[x] Role permissions explicitly distinguish Student, Faculty, and Admin.',
    ].join('\n'),
    67,
    'usr-faculty-1',
    isoOffset(-96)
  );
  insertResource.run(
    'res-3',
    'Database Systems Normalization & Indexing Lecture Notes',
    'Comprehensive lecture notes on 1NF through BCNF decomposition, B+ Tree indexing, and transaction isolation levels.',
    'Lecture Notes',
    'Computer Science',
    'CS-304',
    'CS304_Normalization_Notes.txt',
    '24 KB',
    [
      'CS-304 DATABASE MANAGEMENT SYSTEMS — LECTURE NOTES',
      'Topic: Relational Normalization & Query Indexing',
      '',
      '1. Functional Dependencies and Armstrong Axioms',
      '2. First Normal Form (1NF): Atomic column values',
      '3. Second Normal Form (2NF): Elimination of partial key dependencies',
      '4. Third Normal Form (3NF) & Boyce-Codd Normal Form (BCNF)',
      '5. Practical SQLite & PostgreSQL Indexing Patterns',
    ].join('\n'),
    38,
    'usr-faculty-1',
    isoOffset(-72)
  );
  insertResource.run(
    'res-4',
    'Academic Leave & Examination Concession Request Form',
    'Standard registrar application form for medical leave, workshop attendance credit, or examination timetable conflict resolution.',
    'Campus Form',
    'Academic Affairs',
    'ADM-101',
    'Campus_Academic_Request_Form.txt',
    '8 KB',
    [
      'OFFICE OF THE REGISTRAR — ACADEMIC REQUEST FORM (ADM-101)',
      '',
      'Student Full Name: ___________________________',
      'Enrollment / Username: _______________________',
      'Department & Semester: _______________________',
      'Request Type: [ ] Academic Leave  [ ] Exam Reschedule  [ ] Lab Exemption',
      'Faculty Advisor Approval Signature: ___________',
      'Submit completed copy to Block A, Room 104.',
    ].join('\n'),
    51,
    'usr-admin-1',
    isoOffset(-48)
  );

  const insertChannel = db.prepare(`
    INSERT INTO channels (id, name, topic, channel_type, department, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertChannel.run(
    'chn-cs301',
    'CS-301 Software Engineering',
    'Course Q&A, SRS feedback, and lab scheduling with Prof. Nandani Prajapat',
    'channel',
    'Computer Science',
    isoOffset(-300)
  );
  insertChannel.run(
    'chn-helpdesk',
    'Campus Administration Helpdesk',
    'General inquiries regarding registration, exam cards, and campus facilities',
    'channel',
    'Campus Administration',
    isoOffset(-280)
  );
  insertChannel.run(
    'chn-faculty-office',
    'Faculty Office Hours — Prof. Nandani',
    'Direct academic advising and project mentorship thread',
    'direct',
    'Computer Science',
    isoOffset(-200)
  );

  const insertMessage = db.prepare(`
    INSERT INTO messages (id, channel_id, sender_id, body, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertMessage.run(
    'msg-1',
    'chn-cs301',
    'usr-faculty-1',
    'Welcome to the CS-301 Software Engineering thread. Please review the updated Experiment 2 SRS checklist in the Resources section before Friday.',
    isoOffset(-24)
  );
  insertMessage.run(
    'msg-2',
    'chn-cs301',
    'usr-student-1',
    'Thank you, Professor! Should our functional requirements list separate permissions for Faculty and Administrators under REQ-4?',
    isoOffset(-20)
  );
  insertMessage.run(
    'msg-3',
    'chn-cs301',
    'usr-faculty-1',
    'Yes, Arju. Explicitly define Student, Faculty, and Administrator boundaries so each role can be tested independently.',
    isoOffset(-18)
  );
  insertMessage.run(
    'msg-4',
    'chn-helpdesk',
    'usr-admin-1',
    'Reminder: Students experiencing login or role-access issues can reach out here or verify credentials with the registrar office.',
    isoOffset(-15)
  );
  insertMessage.run(
    'msg-5',
    'chn-faculty-office',
    'usr-student-1',
    'Good morning Professor, I have RSVPed for Thursday’s SRS Critique Colloquium. Will we review sample traceability matrices during the session?',
    isoOffset(-6)
  );
}
