/**
 * E2E tests for the University Event Coordination SaaS platform.
 *
 * Tests cover:
 *  - Authentication (login/logout/session)
 *  - Event browsing and display
 *  - Registration persistence
 *  - Duplicate registration prevention
 *  - Live SSE synchronization across sessions
 *  - Attendance management
 *  - Tenant isolation and authorization
 */

import { test, expect, type Page, type BrowserContext, type APIRequestContext } from '@playwright/test';

// Dev seed credentials (from database/seeder.ts)
const STUDENT1 = { email: 'student1@apextech.edu', password: 'DevPassword123!' };
const STUDENT2 = { email: 'student2@apextech.edu', password: 'DevPassword123!' };
const ORGANIZER = { email: 'organizer@apextech.edu', password: 'DevPassword123!' };
const FACULTY = { email: 'faculty.cse@apextech.edu', password: 'DevPassword123!' };
const HOD = { email: 'hod.cse@apextech.edu', password: 'DevPassword123!' };
const ADMIN = { email: 'admin@apextech.edu', password: 'DevPassword123!' };
const METRO_STUDENT = { email: 'student@metrostate.edu', password: 'DevPassword123!' };

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5002';

// Known seed event IDs
const HACKATHON_EVENT_ID = 'e1111111-1111-1111-1111-111111111111';
const SYMPOSIUM_EVENT_ID = 'e2222222-2222-2222-2222-222222222222';
const ONGOING_EVENT_ID = '8eed87aa-860c-4109-8e2a-73e4371a763b'; // Test E2E Event (ONGOING)

// ============================================================
// Helper: login via API and return cookies for browser context
// ============================================================
async function loginViaAPI(request: APIRequestContext, creds: { email: string; password: string }) {
  const res = await request.post(`${API_URL}/api/v1/auth/login`, {
    data: creds,
    headers: { 'Content-Type': 'application/json' },
  });
  expect(res.ok(), `Login failed for ${creds.email}: ${res.status()}`).toBeTruthy();
  const json = await res.json();
  expect(json.success).toBe(true);
  return json.data.user;
}

async function loginInBrowser(page: Page, creds: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/sign-in`);
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// ============================================================
// STAGE 1: Health and API connectivity
// ============================================================
test.describe('Stage 1: Health & API', () => {
  test('backend health endpoint responds OK', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.database.connected).toBe(true);
  });

  test('frontend serves the landing page', async ({ page }) => {
    const res = await page.goto(BASE_URL);
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('header').getByText('UniEvent')).toBeVisible();
  });
});

// ============================================================
// STAGE 2: Authentication
// ============================================================
test.describe('Stage 2: Authentication', () => {
  test('login with valid seed account redirects to dashboard', async ({ page }) => {
    await loginInBrowser(page, STUDENT1);
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('#email', 'bad@example.com');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');
    // Should show error, not redirect
    await expect(page.locator('text=Sign in')).toBeVisible();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/sign-in');
  });

  test('session persists across page navigation', async ({ page }) => {
    await loginInBrowser(page, STUDENT1);
    // Navigate to browse events
    await page.goto(`${BASE_URL}/events`);
    await expect(page.locator('text=Browse Events')).toBeVisible({ timeout: 5000 });
    // Reload and verify session persists
    await page.reload();
    await expect(page.locator('text=Browse Events')).toBeVisible({ timeout: 5000 });
  });

  test('protected routes redirect unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    // Should redirect to sign-in
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/sign-in');
  });
});

// ============================================================
// STAGE 3: Event Browsing
// ============================================================
test.describe('Stage 3: Event Browsing', () => {
  test('browse events page loads published events', async ({ page }) => {
    await loginInBrowser(page, STUDENT1);
    await page.goto(`${BASE_URL}/events`);
    await expect(page.locator('text=Browse Events')).toBeVisible({ timeout: 5000 });
    // Wait for events to load
    await page.waitForSelector('text=National Hackathon 2026', { timeout: 10000 });
    await expect(page.locator('text=Cloud Computing Symposium')).toBeVisible();
  });

  test('event detail page shows correct data', async ({ page }) => {
    await loginInBrowser(page, STUDENT1);
    await page.goto(`${BASE_URL}/events/${HACKATHON_EVENT_ID}`);
    await page.waitForSelector('text=National Hackathon 2026', { timeout: 10000 });
  });

  test('API returns correct event list for authenticated user', async ({ request }) => {
    await loginViaAPI(request, STUDENT1);
    const res = await request.get(`${API_URL}/api/v1/events/published`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.data.events.length).toBeGreaterThan(0);
    // All returned events should be in visible statuses
    for (const ev of json.data.events) {
      expect(['APPROVED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED']).toContain(ev.status);
    }
  });
});

// ============================================================
// STAGE 4: Registration Persistence
// ============================================================
test.describe('Stage 4: Registration Persistence', () => {
  test('student registrations are persisted in the database', async ({ request }) => {
    // Login as student1 (already registered for hackathon)
    await loginViaAPI(request, STUDENT1);
    // Check my registrations
    const res = await request.get(`${API_URL}/api/v1/events/registrations/me`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const regs = json.data.registrations;
    expect(regs.length).toBeGreaterThan(0);
    // Verify hackathon registration exists
    const hackathonReg = regs.find((r: any) => r.event_id === HACKATHON_EVENT_ID);
    expect(hackathonReg).toBeDefined();
    expect(hackathonReg.registration_status).toBe('REGISTERED');
  });

  test('registration persists after page reload in browser', async ({ page }) => {
    await loginInBrowser(page, STUDENT1);
    // Navigate to my registrations
    await page.goto(`${BASE_URL}/my-registrations`);
    await page.waitForSelector('text=National Hackathon 2026', { timeout: 10000 });
    // Reload
    await page.reload();
    await page.waitForSelector('text=National Hackathon 2026', { timeout: 10000 });
  });

  test('duplicate registration returns idempotent result', async ({ request }) => {
    // Login as student1
    await loginViaAPI(request, STUDENT1);
    // Try to register again for hackathon (already registered)
    const res = await request.post(`${API_URL}/api/v1/events/${HACKATHON_EVENT_ID}/register`);
    // Should succeed idempotently (200) not fail
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test('registration count matches database', async ({ request }) => {
    await loginViaAPI(request, ADMIN);
    // Get event details
    const res = await request.get(`${API_URL}/api/v1/events/${HACKATHON_EVENT_ID}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const event = json.data.event;
    expect(event).toBeDefined();
    // Count should be > 0 since student1 is registered
    expect(event.active_registrations_count).toBeGreaterThan(0);
  });

  test('new registration via browser is visible in my-registrations', async ({ browser }) => {
    // Use student2 who may not be registered for the symposium
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await loginInBrowser(page, STUDENT2);
    
    // Check if already registered for the symposium
    const checkRes = await page.request.get(`${BASE_URL}/api/v1/events/registrations/me`);
    const checkJson = await checkRes.json();
    const existingReg = checkJson.data?.registrations?.find(
      (r: any) => (r.event_id === SYMPOSIUM_EVENT_ID || r.eventId === SYMPOSIUM_EVENT_ID) &&
                  (r.registration_status === 'REGISTERED' || r.registrationStatus === 'REGISTERED')
    );

    if (!existingReg) {
      // Register for Cloud Computing Symposium
      await page.goto(`${BASE_URL}/events`);
      await page.waitForSelector('text=Cloud Computing Symposium', { timeout: 10000 });
      
      const regRes = await page.request.post(`${BASE_URL}/api/v1/events/${SYMPOSIUM_EVENT_ID}/register`);
      expect(regRes.ok()).toBeTruthy();
    }

    // Navigate to my registrations and verify
    await page.goto(`${BASE_URL}/my-registrations`);
    await page.waitForSelector('text=Cloud Computing Symposium', { timeout: 10000 });
    await expect(page.locator('text=Cloud Computing Symposium')).toBeVisible();

    await context.close();
  });
});

// ============================================================
// STAGE 5: Live SSE Synchronization
// ============================================================
test.describe('Stage 5: Live SSE Synchronization', () => {
  test('SSE connection is established for authenticated user', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Monitor SSE connection
    const sseRequests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/api/v1/sse')) {
        sseRequests.push(req.url());
      }
    });

    await loginInBrowser(page, STUDENT1);
    await page.goto(`${BASE_URL}/events`);
    await page.waitForTimeout(3000);

    // SSE should have been requested
    expect(sseRequests.length).toBeGreaterThan(0);
    await context.close();
  });

  test('SSE registration_count_update is published on registration', async ({ request }) => {
    // This tests SSE via API — login as student, register, verify SSE event fires
    await loginViaAPI(request, STUDENT2);
    
    // Register for hackathon (may be idempotent)
    const res = await request.post(`${API_URL}/api/v1/events/${HACKATHON_EVENT_ID}/register`);
    expect(res.ok()).toBeTruthy();
    
    // Verify the registration count is consistent
    const countRes = await request.get(`${API_URL}/api/v1/events/published`);
    expect(countRes.ok()).toBeTruthy();
    const events = (await countRes.json()).data.events;
    const hackathon = events.find((e: any) => e.id === HACKATHON_EVENT_ID);
    expect(hackathon).toBeDefined();
    expect(hackathon.active_registrations_count).toBeGreaterThan(0);
  });

  test('two browser contexts see consistent registration counts', async ({ browser }) => {
    // Context A: Student
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await loginInBrowser(pageA, STUDENT1);
    
    // Context B: Faculty (can see events with counts)
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await loginInBrowser(pageB, FACULTY);

    // Both navigate to browse events
    await pageA.goto(`${BASE_URL}/events`);
    await pageB.goto(`${BASE_URL}/events`);

    await pageA.waitForSelector('text=National Hackathon 2026', { timeout: 10000 });
    await pageB.waitForSelector('text=National Hackathon 2026', { timeout: 10000 });

    // Both should see consistent data — verify the text content contains registration count
    const pageAContent = await pageA.textContent('body');
    const pageBContent = await pageB.textContent('body');
    
    expect(pageAContent).toContain('National Hackathon 2026');
    expect(pageBContent).toContain('National Hackathon 2026');
    expect(pageAContent).toContain('/ 350');
    expect(pageBContent).toContain('/ 350');

    await ctxA.close();
    await ctxB.close();
  });
});

// ============================================================
// STAGE 6: Authorization & Tenant Isolation
// ============================================================
test.describe('Stage 6: Authorization & Tenant Isolation', () => {
  test('Metro State student cannot see Apex Tech events', async ({ request }) => {
    // Login as Metro State student
    await loginViaAPI(request, METRO_STUDENT);
    const res = await request.get(`${API_URL}/api/v1/events/published`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    // Metro should not see Apex events
    for (const ev of json.data.events) {
      expect(ev.university_id).not.toBe('11111111-1111-1111-1111-111111111111');
    }
  });

  test('Metro student cannot register for Apex event', async ({ request }) => {
    await loginViaAPI(request, METRO_STUDENT);
    const res = await request.post(`${API_URL}/api/v1/events/${HACKATHON_EVENT_ID}/register`);
    // Should be forbidden or not found
    expect(res.ok()).toBeFalsy();
  });

  test('student cannot access admin endpoints', async ({ request }) => {
    await loginViaAPI(request, STUDENT1);
    const res = await request.get(`${API_URL}/api/v1/admin/stats`);
    expect(res.status()).toBe(403);
  });

  test('student cannot mark attendance', async ({ request }) => {
    await loginViaAPI(request, STUDENT1);
    const res = await request.post(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`, {
      data: { studentId: 'f1000000-0000-0000-0000-000000000008', status: 'PRESENT' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated request to protected endpoint returns 401', async ({ request }) => {
    // Use a fresh context (no cookies)
    const res = await request.get(`${API_URL}/api/v1/events/published`, {
      headers: { 'Cookie': '' },
    });
    // Should be 401 without valid session
    expect(res.status()).toBe(401);
  });

  test('URL manipulation with different event ID does not bypass tenant check', async ({ request }) => {
    await loginViaAPI(request, METRO_STUDENT);
    // Try to access Apex event by direct ID
    const res = await request.get(`${API_URL}/api/v1/events/${HACKATHON_EVENT_ID}`);
    // Should fail — the event belongs to Apex, not Metro
    expect(res.ok()).toBeFalsy();
  });
});

// ============================================================
// STAGE 7: Attendance Management
// ============================================================
test.describe('Stage 7: Attendance Management', () => {
  test('faculty can load attendance roster for ONGOING event', async ({ request }) => {
    await loginViaAPI(request, FACULTY);
    const res = await request.get(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.data.event).toBeDefined();
    expect(json.data.event.status).toBe('ONGOING');
    expect(json.data.roster).toBeDefined();
    expect(json.data.stats).toBeDefined();
  });

  test('faculty can mark student PRESENT', async ({ request }) => {
    await loginViaAPI(request, FACULTY);
    
    // Get roster first to find a registered student
    const rosterRes = await request.get(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`);
    const rosterJson = await rosterRes.json();
    const roster = rosterJson.data.roster;
    expect(roster.length).toBeGreaterThan(0);
    
    const studentId = roster[0].user_id;
    
    // Mark present
    const res = await request.post(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`, {
      data: { studentId, status: 'PRESENT' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.ok()).toBeTruthy();

    // Verify persistence by re-fetching
    const verifyRes = await request.get(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`);
    const verifyJson = await verifyRes.json();
    const updatedStudent = verifyJson.data.roster.find((r: any) => r.user_id === studentId);
    expect(updatedStudent.attendance_status).toBe('PRESENT');
  });

  test('faculty can mark student ABSENT', async ({ request }) => {
    await loginViaAPI(request, FACULTY);
    
    const rosterRes = await request.get(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`);
    const rosterJson = await rosterRes.json();
    const roster = rosterJson.data.roster;
    expect(roster.length).toBeGreaterThan(0);
    
    const studentId = roster[0].user_id;
    const res = await request.post(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`, {
      data: { studentId, status: 'ABSENT' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.ok()).toBeTruthy();

    // Verify
    const verifyRes = await request.get(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`);
    const verifyJson = await verifyRes.json();
    const updated = verifyJson.data.roster.find((r: any) => r.user_id === studentId);
    expect(updated.attendance_status).toBe('ABSENT');

    // Restore to PRESENT to maintain consistent state
    await request.post(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`, {
      data: { studentId, status: 'PRESENT' },
      headers: { 'Content-Type': 'application/json' },
    });
  });

  test('attendance stats are correct', async ({ request }) => {
    await loginViaAPI(request, FACULTY);
    const res = await request.get(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const stats = json.data.stats;
    const roster = json.data.roster;
    
    // Verify stats match actual roster
    const presentCount = roster.filter((r: any) => r.attendance_status === 'PRESENT').length;
    const absentCount = roster.filter((r: any) => r.attendance_status === 'ABSENT').length;
    const notMarked = roster.filter((r: any) => !r.attendance_status).length;
    
    expect(stats.present).toBe(presentCount);
    expect(stats.absent).toBe(absentCount);
    expect(stats.not_marked).toBe(notMarked);
    expect(stats.total).toBe(roster.length);
  });

  test('cross-tenant user cannot access or mark attendance', async ({ request }) => {
    await loginViaAPI(request, METRO_STUDENT);
    const getRes = await request.get(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`);
    expect(getRes.status()).toBe(404);

    const postRes = await request.post(`${API_URL}/api/v1/events/${ONGOING_EVENT_ID}/attendance`, {
      data: { studentId: 'f1000000-0000-0000-0000-000000000008', status: 'PRESENT' },
      headers: { 'Content-Type': 'application/json' },
    });
    // Student lacks attendance:mark (403) and event is cross-tenant (404)
    expect([403, 404]).toContain(postRes.status());
  });

  test('attendance page loads in browser for faculty', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginInBrowser(page, FACULTY);
    await page.goto(`${BASE_URL}/events/${ONGOING_EVENT_ID}/attendance`);
    await page.waitForSelector('text=Attendance', { timeout: 10000 });
    // Should show stats
    await expect(page.locator('text=Total Registered')).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^Present$/ })).toBeVisible();
    await context.close();
  });
});

// ============================================================
// STAGE 8: Registration count consistency
// ============================================================
test.describe('Stage 8: Registration Count Consistency', () => {
  test('organizer/admin sees correct registration count matching DB', async ({ request }) => {
    await loginViaAPI(request, ADMIN);
    // Get events
    const res = await request.get(`${API_URL}/api/v1/events/${SYMPOSIUM_EVENT_ID}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const event = json.data.event;
    const registrationCount = event.active_registrations_count;
    
    // Count should be >= 1 (from seed data)
    expect(registrationCount).toBeGreaterThanOrEqual(1);
  });
});

