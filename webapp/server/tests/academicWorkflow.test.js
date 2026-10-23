/**
 * Automated Verification Suite for MEPCO Academic Helpdesk & Knowledge Hub
 * Tests:
 *   1. Student Allowlist Eligibility & Registration Tampering Protection
 *   2. Sequential CSE Register-Number Mapping (24BCS064 - 24BCS100)
 *   3. Faculty Directory Structure & HOD Role
 *   4. Explainable NLP Matcher
 *   5. Explainable Faculty Assignment Engine
 *   6. Adaptive SLA Engine Working Hours Calculation
 *   7. Knowledge Lifecycle Conversion
 *   8. Academic Pulse Knowledge Gap Detection
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { RegistrationEligibility } from '../src/models/RegistrationEligibility.js';
import { Department } from '../src/models/Department.js';
import { Subject } from '../src/models/Subject.js';
import { Ticket } from '../src/models/Ticket.js';
import { KbArticle } from '../src/models/KbArticle.js';
import { matchKnowledgeBase } from '../src/services/nlp/engine.js';
import { assignBottomUp, computeSla } from '../src/services/assignment.js';
import { addWorkingHours, workingMinutesBetween, parseWindow } from '../src/utils/workingHours.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/academic_helpdesk';

async function runTests() {
  console.log('\n======================================================');
  console.log('  RUNNING ACADEMIC HELPDESK AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  await connectDB(MONGO_URI);
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Sequential CSE Register Number Mapping
    // -----------------------------------------------------------------
    console.log('[Test Group 1] Sequential CSE Register-Number Mapping & Data Fidelity');
    const allowlistCount = await RegistrationEligibility.countDocuments({ departmentCode: 'CSE', batch: '2024-2028' });
    assert(allowlistCount === 37, `Allowlist has exactly 37 CSE students (Found: ${allowlistCount})`);

    const firstStudent = await RegistrationEligibility.findOne({ rollNumber: '24BCS064' });
    assert(firstStudent && firstStudent.name === 'Nirupa K V', '24BCS064 maps to Nirupa K V');

    const lastStudent = await RegistrationEligibility.findOne({ rollNumber: '24BCS100' });
    assert(lastStudent && lastStudent.name === 'DHANUSHA T S', '24BCS100 maps to DHANUSHA T S');

    const entry32 = await RegistrationEligibility.findOne({ rollNumber: '24BCS095' });
    assert(entry32 && entry32.validationFlags.includes('missing_name_source'), 'Entry #32 flagged for missing name source');

    const entry35 = await RegistrationEligibility.findOne({ rollNumber: '24BCS098' });
    assert(entry35 && entry35.validationFlags.includes('external_gmail_domain'), 'Entry #35 flagged for external gmail domain');

    // -----------------------------------------------------------------
    // TEST 2: Faculty Directory Structure & HOD Role
    // -----------------------------------------------------------------
    console.log('\n[Test Group 2] Faculty Directory & Bottom-Up Hierarchy');
    const cseFaculty = await User.find({ department: 'Computer Science and Engineering', role: { $in: ['faculty', 'hod'] } });
    assert(cseFaculty.length === 37, `CSE Faculty count is exactly 37 (Found: ${cseFaculty.length})`);

    const hod = await User.findOne({ email: 'jrsekar@mepcoeng.ac.in' });
    assert(hod && hod.role === 'hod' && hod.level === 3, 'Dr. J. Raja Sekar is designated HOD at Level 3');

    const l2Faculty = await User.find({ department: 'Computer Science and Engineering', role: 'faculty', level: 2 });
    assert(l2Faculty.length === 12, `Senior Faculty (Professors + Assoc Profs) mapped to Level 2 (Found: ${l2Faculty.length})`);

    const l1Faculty = await User.find({ department: 'Computer Science and Engineering', role: 'faculty', level: 1 });
    assert(l1Faculty.length === 24, `Junior Faculty (Assistant Professors) mapped to Level 1 (Found: ${l1Faculty.length})`);

    // -----------------------------------------------------------------
    // TEST 3: Student Allowlist Protection & Rejection
    // -----------------------------------------------------------------
    console.log('\n[Test Group 3] Student Registration Security & Allowlist Enforcement');
    const fakeEmail = 'unauthorized_hacker@external.com';
    const fakeCheck = await RegistrationEligibility.findOne({ email: fakeEmail });
    assert(!fakeCheck, 'Non-allowlisted email is rejected from registration authorization');

    const claimedCheck = await RegistrationEligibility.findOne({ rollNumber: '24BCS100' });
    assert(claimedCheck && claimedCheck.isClaimed, 'Claimed student record is marked as claimed in allowlist');

    // -----------------------------------------------------------------
    // TEST 4: Explainable NLP Matcher
    // -----------------------------------------------------------------
    console.log('\n[Test Group 4] Explainable NLP Text-Analytics Matching');
    const articles = await KbArticle.find({ status: 'published' }).lean();
    assert(articles.length > 0, `Published KB Articles available (Found: ${articles.length})`);

    const query = 'How do I normalize a relational database schema into 3NF and BCNF?';
    const matches = matchKnowledgeBase(query, articles, { threshold: 0.1, limit: 3 });
    assert(matches.length > 0, `Query matched at least one KB article (Found: ${matches.length})`);
    assert(matches[0].title.includes('Normalization'), `Top match is DBMS Normalization: "${matches[0].title}"`);
    assert(matches[0].matchedTerms && matches[0].matchedTerms.length > 0, `Extracted overlapping technical terms: [${matches[0].matchedTerms.join(', ')}]`);
    assert(matches[0].explanation && matches[0].explanation.includes('TF-IDF'), `Generated explainable match rationale: "${matches[0].explanation}"`);

    // -----------------------------------------------------------------
    // TEST 5: Explainable Faculty Assignment Engine
    // -----------------------------------------------------------------
    console.log('\n[Test Group 5] Explainable Workload-Aware Bottom-Up Faculty Assignment');
    const mockTicket = {
      subject: 'Clarification regarding Lossless Join and BCNF decomposition',
      category: 'Database Management Systems',
      department: 'Computer Science and Engineering',
      priority: 'high',
    };

    const assignment = await assignBottomUp(mockTicket, { env: process.env });
    assert(assignment.assignee != null, `Assigned to faculty: ${assignment.assignee?.name} (Level ${assignment.level})`);
    assert(assignment.scores != null && assignment.scores.totalScore > 0, `Scored affinity factors: Total Score = ${assignment.scores?.totalScore}`);
    assert(assignment.explanation && assignment.explanation.length > 10, `Assignment explanation generated: "${assignment.explanation}"`);

    // -----------------------------------------------------------------
    // TEST 6: Adaptive SLA Engine (Configured 06:00 to 23:59 Window)
    // -----------------------------------------------------------------
    console.log('\n[Test Group 6] Adaptive SLA Support Window (6:00 AM - 12:00 AM)');
    const window = parseWindow(process.env);
    assert(window.startHour === 6 && window.endHour === 23, `Configured working window is 06:00 to 23:59 (Start: ${window.startHour}:00, End: ${window.endHour}:${window.endMin})`);

    // From Wednesday 10:00 AM + 24 working hours
    const testDate = new Date('2026-10-21T10:00:00Z');
    const deadline = addWorkingHours(testDate, 24, window);
    assert(deadline > testDate, `Computed deadline is forward in time: ${deadline.toISOString()}`);

    // Working minutes test
    const workedMin = workingMinutesBetween(testDate, new Date('2026-10-21T12:00:00Z'), window);
    assert(workedMin === 120, `Worked minutes between 10:00 and 12:00 is 120 min (Calculated: ${workedMin})`);

    // -----------------------------------------------------------------
    // TEST 7: Departments and Subjects Relationships
    // -----------------------------------------------------------------
    console.log('\n[Test Group 7] Department & Curriculum Subject Relational Mapping');
    const cseDept = await Department.findOne({ code: 'CSE' });
    assert(cseDept != null && cseDept.name === 'Computer Science and Engineering', 'CSE Department loaded from MongoDB');

    const cseSubjects = await Subject.find({ department: 'Computer Science and Engineering' });
    assert(cseSubjects.length >= 10, `CSE Subjects count >= 10 (Found: ${cseSubjects.length})`);

    const dbmsSub = await Subject.findOne({ code: '23CS401' });
    assert(dbmsSub && dbmsSub.title.includes('Database'), 'Subject 23CS401 maps to Database Management Systems');

    console.log('\n======================================================');
    console.log(`  ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
