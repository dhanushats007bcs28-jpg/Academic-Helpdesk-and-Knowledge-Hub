/**
 * Seed script — populates a REAL MongoDB with realistic data.
 *   npm run seed          (idempotent, upserts by email)
 *   npm run seed:fresh    (wipes collections first)
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { KbArticle } from '../models/KbArticle.js';
import { Ticket } from '../models/Ticket.js';
import { TicketMessage } from '../models/TicketMessage.js';
import { Notification } from '../models/Notification.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { preprocess } from '../services/nlp/engine.js';
import { addWorkingHours } from '../utils/workingHours.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/academic_helpdesk';
const fresh = process.argv.includes('--fresh');

const professorTitle = (n) => (n.gender === 'f' ? 'Dr.' : 'Dr.');

/* --------------------------- USER DIRECTORY ----------------------- */
const ADMIN = {
  name: 'Priya Ramesh',
  email: 'admin@mepcoeng.ac.in',
  password: 'admin123',
  role: 'admin',
  designation: 'System Administrator',
  employeeId: 'ADM-001',
  department: 'Administration',
  phone: '+91 94420 11001',
  avatarColor: '#7c3aed',
};

const HODS = [
  {
    name: 'Dr. Karthikeyan Subramanian',
    email: 'hod.cse@mepcoeng.ac.in',
    password: 'hod123',
    role: 'hod',
    employeeId: 'HOD-CSE-01',
    department: 'Computer Science & Engineering',
    hodOf: 'Computer Science & Engineering',
    designation: 'Professor & Head of Department',
    subjects: ['Database Systems', 'Data Structures', 'Operating Systems'],
    level: 3,
    phone: '+91 94420 11002',
    avatarColor: '#0ea5e9',
    gender: 'm',
  },
  {
    name: 'Dr. Meenakshi Balan',
    email: 'hod.ece@mepcoeng.ac.in',
    password: 'hod123',
    role: 'hod',
    employeeId: 'HOD-ECE-01',
    department: 'Electronics & Communication Engineering',
    hodOf: 'Electronics & Communication Engineering',
    designation: 'Professor & Head of Department',
    subjects: ['Digital Signal Processing', 'VLSI Design', 'Microprocessors'],
    level: 3,
    phone: '+91 94420 11003',
    avatarColor: '#14b8a6',
    gender: 'f',
  },
];

const FACULTY = [
  // Level 1 — junior faculty (bottom rung of the ladder)
  { name: 'Dr. Selvam Murugan', email: 'selvam.m@mepcoeng.ac.in', password: 'faculty123', role: 'faculty', employeeId: 'FAC-CSE-11', department: 'Computer Science & Engineering', designation: 'Assistant Professor', subjects: ['Database Systems', 'Data Structures'], level: 1, maxOpenTickets: 6, phone: '+91 94420 21011', avatarColor: '#2563eb', gender: 'm' },
  { name: 'Prof. Aarthi Krishnan', email: 'aarthi.k@mepcoeng.ac.in', password: 'faculty123', role: 'faculty', employeeId: 'FAC-CSE-12', department: 'Computer Science & Engineering', designation: 'Assistant Professor', subjects: ['Programming', 'Java', 'Python'], level: 1, maxOpenTickets: 6, phone: '+91 94420 21012', avatarColor: '#2563eb', gender: 'f' },
  { name: 'Prof. Rajesh Kannan', email: 'rajesh.k@mepcoeng.ac.in', password: 'faculty123', role: 'faculty', employeeId: 'FAC-ECE-13', department: 'Electronics & Communication Engineering', designation: 'Assistant Professor', subjects: ['Microprocessors', 'Digital Electronics'], level: 1, maxOpenTickets: 6, phone: '+91 94420 21013', avatarColor: '#2563eb', gender: 'm' },
  // Level 2 — senior faculty (escalation rung)
  { name: 'Dr. Nithya Venkatesan', email: 'nithya.v@mepcoeng.ac.in', password: 'faculty123', role: 'faculty', employeeId: 'FAC-CSE-21', department: 'Computer Science & Engineering', designation: 'Associate Professor', subjects: ['Operating Systems', 'Networks', 'Database Systems'], level: 2, maxOpenTickets: 8, phone: '+91 94420 21021', avatarColor: '#0891b2', gender: 'f' },
  { name: 'Dr. Ananth Ramaswamy', email: 'ananth.r@mepcoeng.ac.in', password: 'faculty123', role: 'faculty', employeeId: 'FAC-ECE-22', department: 'Electronics & Communication Engineering', designation: 'Associate Professor', subjects: ['VLSI Design', 'Signals & Systems'], level: 2, maxOpenTickets: 8, phone: '+91 94420 21022', avatarColor: '#0891b2', gender: 'm' },
];

const STUDENTS = [
  { name: 'Dhanush Selvaraj', email: 'student@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '22CSR001', department: 'Computer Science & Engineering', year: 3, semester: 5, section: 'A', cgpa: 8.62, attendance: 91.4, phone: '+91 90000 30001', avatarColor: '#f59e0b', gender: 'm' },
  { name: 'Ananya Lakshmi', email: 'ananya.l@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '22CSR002', department: 'Computer Science & Engineering', year: 3, semester: 5, section: 'A', cgpa: 9.14, attendance: 95.2, phone: '+91 90000 30002', avatarColor: '#ec4899', gender: 'f' },
  { name: 'Giridharan Muthu', email: 'giridharan.m@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '22CSR003', department: 'Computer Science & Engineering', year: 3, semester: 5, section: 'B', cgpa: 7.85, attendance: 84.7, phone: '+91 90000 30003', avatarColor: '#10b981', gender: 'm' },
  { name: 'Harini Sundar', email: 'harini.s@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '21CSR014', department: 'Computer Science & Engineering', year: 4, semester: 7, section: 'A', cgpa: 8.98, attendance: 92.8, phone: '+91 90000 30004', avatarColor: '#8b5cf6', gender: 'f' },
  { name: 'Vignesh Balaji', email: 'vignesh.b@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '22ECR021', department: 'Electronics & Communication Engineering', year: 3, semester: 5, section: 'A', cgpa: 8.10, attendance: 88.3, phone: '+91 90000 30005', avatarColor: '#ef4444', gender: 'm' },
  { name: 'Sneha Prakash', email: 'sneha.p@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '22ECR022', department: 'Electronics & Communication Engineering', year: 3, semester: 5, section: 'B', cgpa: 9.02, attendance: 94.1, phone: '+91 90000 30006', avatarColor: '#06b6d4', gender: 'f' },
  { name: 'Mohammed Irfan', email: 'irfan.m@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '23CSR045', department: 'Computer Science & Engineering', year: 2, semester: 3, section: 'A', cgpa: 7.60, attendance: 81.5, phone: '+91 90000 30007', avatarColor: '#84cc16', gender: 'm' },
  { name: 'Keerthana Devi', email: 'keerthana.d@mepcoeng.ac.in', password: 'student123', role: 'student', rollNumber: '23CSR046', department: 'Computer Science & Engineering', year: 2, semester: 3, section: 'B', cgpa: 8.74, attendance: 90.6, phone: '+91 90000 30008', avatarColor: '#f97316', gender: 'f' },
];

/* --------------------------- KNOWLEDGE BASE ----------------------- */
const KB = [
  {
    title: 'DBMS Normalization Rules and Normal Forms',
    question: 'What are the rules of database normalization and explain 1NF, 2NF, 3NF, BCNF?',
    answer: 'Normalization organises columns and tables to minimise redundancy. 1NF removes repeating groups so every cell holds a single atomic value. 2NF removes partial dependencies on a composite key. 3NF removes transitive dependencies. BCNF strengthens 3NF so every determinant is a candidate key. Exam answers should list each form with a small example table and state the anomaly it eliminates.',
    category: 'Database', department: 'Computer Science & Engineering', subject: 'Database Systems', tags: ['normalization', 'dbms', 'normal forms', 'bcnf', '2nf', '3nf'],
  },
  {
    title: 'How Attendance Percentage is Calculated',
    question: 'How is my attendance percentage calculated and what is the minimum requirement?',
    answer: 'Attendance percentage = (number of classes attended ÷ total classes conducted) × 100. Only classes marked present by the faculty count. The institution requires a minimum of 75% attendance per subject to be eligible for the end-semester examination. Medical leave, when approved with valid documents, is usually excluded from the denominator.',
    category: 'Examination', department: 'Common', subject: '', tags: ['attendance', 'percentage', 'eligibility', '75%', 'exam'],
  },
  {
    title: 'Resetting Your Lab Portal Password',
    question: 'How do I reset my lab portal password if I forgot it?',
    answer: 'Visit the Lab Portal login page, click "Forgot Password", and enter your institutional email. A reset link is emailed within 5 minutes (check spam folder). If no email arrives, raise a technical ticket with your roll number and the IT cell will reset it within one working day.',
    category: 'Technical', department: 'Common', subject: '', tags: ['password', 'reset', 'portal', 'login', 'access'],
  },
  {
    title: 'Java: Difference Between == and equals()',
    question: 'What is the difference between == and equals() in Java?',
    answer: '== compares object references (memory addresses) for objects, and primitive values for primitives. equals() is a method that compares logical content and can be overridden (e.g. String compares character sequences). Rule of thumb: never use == to compare Strings; always use equals(). When you override equals(), also override hashCode() to keep hash-based collections correct.',
    category: 'Programming', department: 'Computer Science & Engineering', subject: 'Java', tags: ['java', 'equals', 'reference', 'string', 'oops'],
  },
  {
    title: 'Understanding OS Process vs Thread',
    question: 'What is the difference between a process and a thread in operating systems?',
    answer: 'A process is an independent execution unit with its own address space and resources. A thread is a lighter execution unit within a process that shares the process address space and resources but has its own stack and registers. Threads are cheaper to create and switch between, but require synchronisation to avoid race conditions.',
    category: 'Subject', department: 'Computer Science & Engineering', subject: 'Operating Systems', tags: ['os', 'process', 'thread', 'scheduling', 'concurrency'],
  },
  {
    title: 'Assignment Submission Format and Late Policy',
    question: 'What is the correct format for assignment submission and what happens if I submit late?',
    answer: 'Submit assignments as a single PDF named <rollnumber>_<subject>_<assignmentnumber>.pdf on the course portal. Late submissions lose 10% of the awarded marks per calendar day, up to three days; beyond three days they are not accepted unless prior leave was approved by the HOD.',
    category: 'Assignment', department: 'Common', subject: '', tags: ['assignment', 'submission', 'format', 'late', 'marks', 'policy'],
  },
  {
    title: 'How Marks Are Updated in the Exam Portal',
    question: 'Why are my internal marks not showing in the exam portal?',
    answer: 'Internal marks are entered by the subject faculty after evaluation and then approved by the HOD before publishing. Allow up to 5 working days after the result announcement. If marks are still missing or incorrect, raise an examination ticket with your roll number, subject code and the component (e.g. CAT-1) for verification.',
    category: 'Examination', department: 'Common', subject: '', tags: ['marks', 'internal', 'portal', 'exam', 'result', 'update'],
  },
  {
    title: 'Microprocessor 8085 Addressing Modes',
    question: 'Explain the addressing modes of the 8085 microprocessor with examples.',
    answer: 'The 8085 supports five addressing modes: Immediate (data in instruction, e.g. MVI A,32H), Register (operand in a register, e.g. MOV A,B), Direct (16-bit address in instruction, e.g. LDA 2000H), Indirect (address held in a register pair, e.g. MOV A,M) and Implicit (operand implied by opcode, e.g. CMA). For each, give a one-line example on the exam sheet.',
    category: 'Subject', department: 'Electronics & Communication Engineering', subject: 'Microprocessors', tags: ['8085', 'microprocessor', 'addressing modes', 'ece'],
  },
  {
    title: 'Requesting an Official Transcript',
    question: 'How do I request an official transcript from the college?',
    answer: 'Apply through the Examination Cell using the transcript request form, pay the prescribed fee at the accounts counter, and submit a copy of your ID card. Transcripts are typically issued within 7 working days. For universities abroad, request the sealed-and-signed format and mention the courier address on the form.',
    category: 'Administrative', department: 'Common', subject: '', tags: ['transcript', 'certificate', 'documents', 'exam cell'],
  },
  {
    title: 'Reading a Normalization Exercise: Decomposing a Relation',
    question: 'How do I decompose a relation into 3NF step by step in an exam?',
    answer: 'Given R(A,B,C,...) and its functional dependencies: (1) find a minimal cover of the FDs, (2) compute the candidate key(s), (3) for each FD in the minimal cover create a relation, (4) merge relations whose keys are the same, (5) if no relation contains a candidate key, add one. Verify lossless join and dependency preservation as the final step.',
    category: 'Database', department: 'Computer Science & Engineering', subject: 'Database Systems', tags: ['decomposition', '3nf', 'functional dependency', 'candidate key', 'dbms'],
  },
  {
    title: 'VLSI: CMOS Inverter Characteristics',
    question: 'Explain the operation and characteristics of a CMOS inverter.',
    answer: 'A CMOS inverter pairs a PMOS pull-up with an NMOS pull-down. When Vin is low the PMOS conducts and output is high; when Vin is high the NMOS conducts and output is low. Because one transistor is always off in steady state, static power is near zero. Key characteristics: switching threshold Vm where Vin=Vout, noise margins NMH/NML, and propagation delay driven by load capacitance.',
    category: 'Subject', department: 'Electronics & Communication Engineering', subject: 'VLSI Design', tags: ['cmos', 'inverter', 'vlsi', 'transistor', 'ece'],
  },
  {
    title: 'College Bus Route and Timing Enquiry',
    question: 'Where can I find the college bus route timings?',
    answer: 'Bus routes and timings are published on the Transport section of the college website and updated each semester. Route changes are announced via the student notices board. For a specific stop, contact the transport office with your route number and boarding point.',
    category: 'General', department: 'Common', subject: '', tags: ['bus', 'transport', 'route', 'timing', 'general'],
  },
];

/* --------------------------- TICKET SEEDS ------------------------- */
const TICKET_SEEDS = [
  { studentEmail: 'student@mepcoeng.ac.in', subject: 'DBMS query regarding normalization and 3NF decomposition', description: 'I am not able to understand how to decompose a relation into 3NF in the exam. Can you explain the step by step approach with an example?', category: 'Database', priority: 'medium', status: 'resolved' },
  { studentEmail: 'student@mepcoeng.ac.in', subject: 'Password reset for the lab portal', description: 'I forgot my lab portal password and did not receive the reset email. Please help me regain access before the lab exam.', category: 'Technical', priority: 'high', status: 'in_progress' },
  { studentEmail: 'ananya.l@mepcoeng.ac.in', subject: 'Clarification on assignment 3 submission format', description: 'Should assignment 3 be submitted as a PDF or a DOCX file? Also is a single file enough or do we need the source code too?', category: 'Assignment', priority: 'low', status: 'assigned' },
  { studentEmail: 'giridharan.m@mepcoeng.ac.in', subject: 'Internal marks not updated in the portal for CAT-1', description: 'My CAT-1 internal marks for Database Systems are still not showing in the exam portal even after the result announcement. Requesting verification.', category: 'Examination', priority: 'high', status: 'escalated' },
  { studentEmail: 'harini.s@mepcoeng.ac.in', subject: 'Difference between process and thread in OS', description: 'I keep confusing process and thread. Can you explain the difference with respect to address space and context switching cost?', category: 'Subject', priority: 'medium', status: 'resolved' },
  { studentEmail: 'vignesh.b@mepcoeng.ac.in', subject: '8085 addressing modes clarification', description: 'Please explain the difference between direct and indirect addressing modes in the 8085 microprocessor with a small example.', category: 'Subject', priority: 'medium', status: 'open' },
  { studentEmail: 'sneha.p@mepcoeng.ac.in', subject: 'Attendance percentage below 75%', description: 'My attendance is showing 72% due to medical leave that was approved. How is the percentage recalculated after approved leave?', category: 'Examination', priority: 'critical', status: 'assigned' },
  { studentEmail: 'irfan.m@mepcoeng.ac.in', subject: 'Java == vs equals confusion', description: 'Why does comparing two strings with == sometimes fail even when the text is the same? What should I use instead?', category: 'Programming', priority: 'low', status: 'resolved' },
  { studentEmail: 'keerthana.d@mepcoeng.ac.in', subject: 'Transcript request process', description: 'I need an official transcript for a university application. What is the process and how many days does it take?', category: 'Administrative', priority: 'medium', status: 'waiting_student' },
  { studentEmail: 'giridharan.m@mepcoeng.ac.in', subject: 'CMOS inverter switching threshold', description: 'Can you explain how the switching threshold Vm of a CMOS inverter is derived and why it matters for noise margins?', category: 'Subject', priority: 'medium', status: 'in_progress' },
];

async function seed() {
  await connectDB(MONGO_URI);

  if (fresh) {
    await Promise.all([
      Ticket.deleteMany({}), TicketMessage.deleteMany({}), Notification.deleteMany({}),
      ActivityLog.deleteMany({}), KbArticle.deleteMany({}), User.deleteMany({}),
    ]);
    console.log('[seed] Cleared existing collections');
  }

  /* ---- users ---- */
  const upsertUser = async (data) => {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return existing;
    }
    return User.create(data);
  };

  const admin = await upsertUser(ADMIN);
  const hods = [];
  for (const h of HODS) hods.push(await upsertUser(h));
  const faculty = [];
  for (const f of FACULTY) faculty.push(await upsertUser(f));
  const students = [];
  for (const s of STUDENTS) students.push(await upsertUser(s));
  console.log(`[seed] Users: 1 admin, ${hods.length} HODs, ${faculty.length} faculty, ${students.length} students`);

  /* ---- assign advisors ---- */
  for (const s of students) {
    s.advisor = faculty.find((f) => f.department === s.department)?._id;
    await s.save();
  }

  /* ---- knowledge base ---- */
  const kbDocs = [];
  for (const a of KB) {
    const { tokens, lemmas } = preprocess(`${a.title} ${a.question} ${a.answer} ${a.tags.join(' ')}`);
    let doc = await KbArticle.findOne({ title: a.title });
    if (!doc) {
      doc = await KbArticle.create({ ...a, tokenized: tokens, lemmas, source: 'seed', createdBy: admin._id });
    }
    kbDocs.push(doc);
  }
  console.log(`[seed] Knowledge base: ${kbDocs.length} articles`);

  /* ---- tickets (with real text-analytics + bottom-up assignment) ---- */
  let seq = await Ticket.countDocuments();
  for (const t of TICKET_SEEDS) {
    const student = students.find((s) => s.email === t.studentEmail);
    if (!student) continue;
    if (await Ticket.findOne({ subject: t.subject, student: student._id })) continue;

    seq += 1;
    const { tokens, lemmas } = preprocess(`${t.subject} ${t.description}`);

    // choose handler: level 1 unless escalated/assigned-to-senior
    let assignee;
    let level = 1;
    if (t.status === 'escalated') {
      assignee = faculty.find((f) => f.level === 2) || faculty[0];
      level = 2;
    } else if (t.status === 'open') {
      assignee = null;
      level = 0;
    } else {
      const pool = faculty.filter((f) => f.department === student.department && f.level === 1);
      assignee = pool[0] || faculty[0];
      level = 1;
    }

    const assignedAt = new Date(Date.now() - Math.floor(Math.random() * 30 + 2) * 86400000);
    const ticket = await Ticket.create({
      ticketCode: `TKT-${String(seq).padStart(4, '0')}`,
      student: student._id,
      subject: t.subject,
      description: t.description,
      category: t.category,
      priority: t.priority,
      department: student.department,
      status: t.status,
      assignedTo: assignee?._id || null,
      assignedAt: assignee ? assignedAt : undefined,
      assignmentLevel: level,
      queryTokens: tokens,
      queryLemmas: lemmas,
      firstResponseAt: ['resolved', 'in_progress', 'waiting_student', 'escalated'].includes(t.status) ? assignedAt : undefined,
      escalationHistory: assignee
        ? [{ to: assignee._id, level, reason: `Assigned to level-${level} faculty`, at: assignedAt }]
        : [],
      kbMatches: [],
      resolution:
        ['resolved'].includes(t.status)
          ? { summary: 'Explained with a step-by-step example and shared the reference knowledge-base article.', resolvedBy: assignee?._id, resolvedAt: new Date(assignedAt.getTime() + 5 * 3600000) }
          : undefined,
      feedback:
        t.status === 'resolved'
          ? { rating: 4 + Math.round(Math.random()), comment: 'Clear explanation, thank you!', at: new Date() }
          : undefined,
    });
    ticket.slaDueAt = addWorkingHours(assignedAt, 24, { startHour: 9, startMin: 0, endHour: 17, endMin: 0 });
    await ticket.save();

    if (assignee) await User.updateOne({ _id: assignee._id }, { $inc: { currentLoad: 1 } });

    if (['resolved', 'in_progress', 'waiting_student', 'escalated'].includes(t.status) && assignee) {
      await TicketMessage.create({
        ticket: ticket._id, author: assignee._id, authorRole: 'faculty',
        body: 'Hello, I have reviewed your query. Let me clarify this point by point — please check the explanation below and let me know if anything is unclear.',
      });
    }
    if (t.status === 'resolved') {
      await TicketMessage.create({
        ticket: ticket._id, author: student._id, authorRole: 'student',
        body: 'Thank you for the explanation, that resolved my doubt!',
      });
    }
  }
  console.log('[seed] Tickets + messages created');

  await ActivityLog.create({ actor: admin._id, actorRole: 'admin', action: 'system.seed', entity: 'System', detail: 'Database seeded with realistic data' });

  const counts = {
    users: await User.countDocuments(),
    kb: await KbArticle.countDocuments(),
    tickets: await Ticket.countDocuments(),
  };
  console.log('[seed] Done ->', counts);
  await mongoose.connection.close();
}

seed().catch((e) => {
  console.error('[seed] failed:', e);
  process.exit(1);
});
