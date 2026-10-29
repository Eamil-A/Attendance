import { query } from '../config/database';

export async function ensureAttendanceDemoEvent(): Promise<string> {
  const demoEventId = 'e5555555-5555-5555-5555-555555555555';
  const univId = '11111111-1111-1111-1111-111111111111';
  const deptId = 'a1111111-1111-1111-1111-111111111111';
  const facultyId = 'f1000000-0000-0000-0000-000000000004';
  const venueId = 'c1111111-1111-1111-1111-111111111111';

  // 1. Check or insert event
  const existing = await query('SELECT id FROM events WHERE title = $1 AND university_id = $2', ['Attendance Demo Event', univId]);
  let eventId = demoEventId;
  if (existing.rows.length === 0) {
    const res = await query(
      `INSERT INTO events (
        id, university_id, organizer_id, department_id, venue_id,
        title, description, category, start_time, end_time, registration_deadline,
        capacity, budget, status, visibility
      ) VALUES (
        $1, $2, $3, $4, $5,
        'Attendance Demo Event',
        'Official demonstration event for verified attendance marking and tracking.',
        'TECHNICAL',
        NOW() - INTERVAL '2 hours',
        NOW() + INTERVAL '4 hours',
        NOW() - INTERVAL '3 hours',
        50, 15000.00, 'ONGOING', 'UNIVERSITY_WIDE'
      )
      RETURNING id`,
      [demoEventId, univId, facultyId, deptId, venueId]
    );
    eventId = res.rows[0].id;
  } else {
    eventId = existing.rows[0].id;
    await query(
      `UPDATE events
       SET status = 'ONGOING',
           start_time = NOW() - INTERVAL '2 hours',
           end_time = NOW() + INTERVAL '4 hours',
           registration_deadline = NOW() - INTERVAL '3 hours'
       WHERE id = $1`,
      [eventId]
    );
  }

  // 2. Ensure registered students
  const students = [
    'f1000000-0000-0000-0000-000000000008', // Kavya Iyer
    'f1000000-0000-0000-0000-000000000009', // Rohan Mistry
    'f1000000-0000-0000-0000-000000000007', // Aditya Verma
  ];

  for (const studentId of students) {
    await query(
      `INSERT INTO event_registrations (event_id, student_id, status, registered_at)
       VALUES ($1, $2, 'REGISTERED', NOW() - INTERVAL '1 day')
       ON CONFLICT (event_id, student_id)
       DO UPDATE SET status = 'REGISTERED'`,
      [eventId, studentId]
    );
  }

  // 3. Staff assignment for Faculty
  await query(
    `INSERT INTO event_staff_assignments (event_id, user_id, role, assigned_at)
     VALUES ($1, $2, 'ATTENDANCE_VERIFIER', NOW())
     ON CONFLICT (event_id, user_id, role) DO NOTHING`,
    [eventId, facultyId]
  );

  return eventId;
}

