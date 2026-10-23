/**
 * MEPCO Schlenk Engineering College — Production Real Data Seeder
 * Ingests:
 *   1. Verified Departments (CSE, IT, ECE, AIDS, ME, CE)
 *   2. Academic Curriculum Subjects (Codes 23CS301, 23CS401, 23CS501, etc.)
 *   3. CSE Faculty & HOD Directory (37 real staff records)
 *   4. CSE Student Registration Allowlist (37 real records: 24BCS064 - 24BCS100)
 *   5. Initial Verified Knowledge Articles, Study Resources, and Announcements
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Subject } from '../models/Subject.js';
import { RegistrationEligibility } from '../models/RegistrationEligibility.js';
import { KbArticle } from '../models/KbArticle.js';
import { Resource } from '../models/Resource.js';
import { Announcement } from '../models/Announcement.js';
import { Project } from '../models/Project.js';
import { Ticket } from '../models/Ticket.js';
import { TicketMessage } from '../models/TicketMessage.js';
import { Notification } from '../models/Notification.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { preprocess, termFrequency } from '../services/nlp/engine.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/academic_helpdesk';

export const RAW_CSE_STUDENTS = [
  { order: 1, rollNumber: '24BCS064', name: 'Nirupa K V', email: 'kulandai.kvn_bcs28@mepcoeng.ac.in' },
  { order: 2, rollNumber: '24BCS065', name: 'ASIGHA K G', email: 'asighakg_bcs28@mepcoeng.ac.in' },
  { order: 3, rollNumber: '24BCS066', name: 'Bexalin B A', email: 'bexalin_bcs28@mepcoeng.ac.in' },
  { order: 4, rollNumber: '24BCS067', name: 'Deepthi T', email: 'rajira909090_bcs28@mepcoeng.ac.in' },
  { order: 5, rollNumber: '24BCS068', name: 'Devadharshini R', email: 'rsdharshini92_bcs28@mepcoeng.ac.in' },
  { order: 6, rollNumber: '24BCS069', name: 'Devasri S', email: 'ruma00062_bcs28@mepcoeng.ac.in' },
  { order: 7, rollNumber: '24BCS070', name: 'Gopika R', email: 'pranjithkumar08_bcs28@mepcoeng.ac.in' },
  { order: 8, rollNumber: '24BCS071', name: 'Gurupriya G', email: 'gurupriyagurunathan_bcs28@mepcoeng.ac.in' },
  { order: 9, rollNumber: '24BCS072', name: 'Harini S', email: 'harinisbe2007_bcs28@mepcoeng.ac.in' },
  { order: 10, rollNumber: '24BCS073', name: 'Harini V', email: 'devapetchi5_bcs28@mepcoeng.ac.in' },
  { order: 11, rollNumber: '24BCS074', name: 'Hema Anood S', email: 'hemaanoodsusee_bcs28@mepcoeng.ac.in' },
  { order: 12, rollNumber: '24BCS075', name: 'Iswarya M', email: 'ashwinm2701_bcs28@mepcoeng.ac.in' },
  { order: 13, rollNumber: '24BCS076', name: 'Iswaryalakshmi S', email: 's.subbiah.doss_bcs28@mepcoeng.ac.in' },
  { order: 14, rollNumber: '24BCS077', name: 'Janani S', email: 'janani1234jan_bcs28@mepcoeng.ac.in' },
  { order: 15, rollNumber: '24BCS078', name: 'Jeya Akshya Vathana', email: 'marisvadhana_bcs28@mepcoeng.ac.in' },
  { order: 16, rollNumber: '24BCS079', name: 'Kanya T', email: 'sta.thanasingh_bcs28@mepcoeng.ac.in' },
  { order: 17, rollNumber: '24BCS080', name: 'Kaviya C', email: 's.chellaramasamy_bcs28@mepcoeng.ac.in' },
  { order: 18, rollNumber: '24BCS081', name: 'Maruthupriyanka M', email: 'jothimurugan101_bcs28@mepcoeng.ac.in' },
  { order: 19, rollNumber: '24BCS082', name: 'Mathi Vathani R', email: 'mathivathanivathani8_bcs28@mepcoeng.ac.in' },
  { order: 20, rollNumber: '24BCS083', name: 'Nagajothi A', email: 'nagajothia835_bcs28@mepcoeng.ac.in' },
  { order: 21, rollNumber: '24BCS084', name: 'Packialakshmi R', email: 'mareesraj20_bcs28@mepcoeng.ac.in' },
  { order: 22, rollNumber: '24BCS085', name: 'Pavithra P', email: 'paviananthi1402_bcs28@mepcoeng.ac.in' },
  { order: 23, rollNumber: '24BCS086', name: 'Radhika P', email: 'radhika200712_bcs28@mepcoeng.ac.in' },
  { order: 24, rollNumber: '24BCS087', name: 'Renganayaki N', email: 'renganayakin_bcs28@mepcoeng.ac.in' },
  { order: 25, rollNumber: '24BCS088', name: 'Rubika R', email: 'rubikar_bcs28@mepcoeng.ac.in' },
  { order: 26, rollNumber: '24BCS089', name: 'Samiska M', email: 'msamiska2007_bcs28@mepcoeng.ac.in' },
  { order: 27, rollNumber: '24BCS090', name: 'Sesha Harini S L', email: 'seshanharini2012_bcs28@mepcoeng.ac.in' },
  { order: 28, rollNumber: '24BCS091', name: 'Sornalakshmi S K', email: 'banumathin8393_bcs28@mepcoeng.ac.in' },
  { order: 29, rollNumber: '24BCS092', name: 'Subaranjani M', email: 'subamahendran1978_bcs28@mepcoeng.ac.in' },
  { order: 30, rollNumber: '24BCS093', name: 'Subha K', email: 'subha21506_bcs28@mepcoeng.ac.in' },
  { order: 31, rollNumber: '24BCS094', name: 'Varshitha S B', email: 'varshithasb_bcs28@mepcoeng.ac.in' },
  { order: 32, rollNumber: '24BCS095', name: 'Velsrinithi (Pending Name Verification)', email: 'velsrinithi2007_bcs28@mepcoeng.ac.in', flags: ['missing_name_source'] },
  { order: 33, rollNumber: '24BCS096', name: 'Vigneshwari M', email: 'vigneshwarim112006_bcs28@mepcoeng.ac.in' },
  { order: 34, rollNumber: '24BCS097', name: 'NITHYA LAKSHMI T', email: 'nithyalakshmit_bcs28@mepcoeng.ac.in' },
  { order: 35, rollNumber: '24BCS098', name: 'Feronica Peter', email: 'feronicapeter@gmail.com', flags: ['external_gmail_domain'] },
  { order: 36, rollNumber: '24BCS099', name: 'Subhiksha', email: 'subhi210507@gmail.com', flags: ['external_gmail_domain'] },
  { order: 37, rollNumber: '24BCS100', name: 'DHANUSHA T S', email: 'dhanushats007_bcs28@mepcoeng.ac.in' },
];

export const RAW_CSE_FACULTY = [
  {
    name: 'Dr. J. Raja Sekar',
    qualification: 'BE, ME, PhD',
    designation: 'Sr.Prof.&HOD',
    teachingExp: 32.81,
    phone: '04562-235350',
    email: 'jrsekar@mepcoeng.ac.in',
    role: 'hod',
    level: 3,
    subjects: ['Computer Networks', 'Network Security', 'Distributed Systems'],
  },
  {
    name: 'Dr. K. Mala',
    qualification: 'BE, MS, PhD',
    designation: 'Professor',
    teachingExp: 29.90,
    phone: '04562-235355',
    email: 'kmala@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Data Structures', 'Design and Analysis of Algorithms', 'Theory of Computation'],
  },
  {
    name: 'Dr. S. Devi Mahalakshmi',
    qualification: 'BE, ME, PhD',
    designation: 'Professor',
    teachingExp: 30.26,
    phone: '04562-235351',
    email: 'sdevi@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Database Management Systems', 'Advanced Database Technologies', 'Cloud Computing'],
  },
  {
    name: 'Dr. S. Vanitha Sivagami',
    qualification: 'BE, ME, PhD',
    designation: 'Professor',
    teachingExp: 27.72,
    phone: '04562-235385',
    email: 'svanitha@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Operating Systems', 'System Software', 'Software Engineering'],
  },
  {
    name: 'Dr. S. Kavi Priya',
    qualification: 'BE, ME, PhD',
    designation: 'Professor',
    teachingExp: 22.40,
    phone: '04562-235367',
    email: 'urskavi@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Artificial Intelligence', 'Machine Learning', 'Data Mining'],
  },
  {
    name: 'Dr. K. Ruba Soundar',
    qualification: 'AMIE, ME, PhD',
    designation: 'Professor',
    teachingExp: 22.16,
    phone: '04562-235359',
    email: 'rubasoundar@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Compiler Design', 'Formal Languages and Automata', 'Object Oriented Programming'],
  },
  {
    name: 'Dr. B. Selvakumar',
    qualification: 'BTech, ME, PhD',
    designation: 'Professor',
    teachingExp: 19.64,
    phone: '04562-235365',
    email: 'selvakumar.b@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Cryptography and Network Security', 'Information Security', 'Computer Architecture'],
  },
  {
    name: 'Dr. B. Lakshmanan',
    qualification: 'BTech, MTech, PhD',
    designation: 'Associate Professor',
    teachingExp: 16.32,
    phone: '04562-235361',
    email: 'lakshmanan@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Computer Networks', 'Wireless Sensor Networks', 'Internet of Things'],
  },
  {
    name: 'Dr. S. Priyadharsini',
    qualification: 'BE, ME, PhD',
    designation: 'Associate Professor',
    teachingExp: 15.36,
    phone: '04562-235354',
    email: 'priyadharsini@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Database Management Systems', 'Data Warehousing', 'Web Technology'],
  },
  {
    name: 'Dr. G. Ananthi',
    qualification: 'BE, ME, PhD',
    designation: 'Associate Professor',
    teachingExp: 22.40,
    phone: '04562-235354',
    email: 'ananthi@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Object Oriented Software Engineering', 'Software Testing', 'Python Programming'],
  },
  {
    name: 'Dr. S. Amutha',
    qualification: 'BE, ME, PhD',
    designation: 'Associate Professor',
    teachingExp: 26.23,
    phone: '04562-235357',
    email: 'amuthavasan@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Deep Learning', 'Computer Vision', 'Digital Image Processing'],
  },
  {
    name: 'Dr. M. Chengathir Selvi',
    qualification: 'BSc, MCA, ME, MPhil, PhD',
    designation: 'Associate Professor',
    teachingExp: 21.39,
    phone: '04562-235379',
    email: 'chengathir@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Data Structures', 'Java Programming', 'Cloud Computing'],
  },
  {
    name: 'Dr. T. Manonmani',
    qualification: 'BE, ME, PhD',
    designation: 'Associate Professor',
    teachingExp: 19.71,
    phone: '04562-23', // Flagged: incomplete phone
    flags: ['incomplete_phone_number'],
    email: 'manonmani@mepcoeng.ac.in',
    role: 'faculty',
    level: 2,
    subjects: ['Operating Systems', 'Linux Internals', 'Virtualization Technologies'],
  },
  {
    name: 'Mr. S. Thavasi',
    qualification: 'BE, ME, (PhD)',
    designation: 'AP(Sl.G.)',
    teachingExp: 14.33,
    phone: '04562-235361',
    email: 'sktthavasi@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Database Management Systems', 'Big Data Analytics', 'SQL & NoSQL'],
  },
  {
    name: 'Dr. G. Priyanka',
    qualification: 'BE, ME, PhD',
    designation: 'AP(Sl.G.)',
    teachingExp: 13.31,
    phone: '04562-235352',
    email: 'priyanka@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Computer Networks', 'Cyber Security', 'Network Protocols'],
  },
  {
    name: 'Dr. S. Santhi',
    qualification: 'BE, ME, PhD',
    designation: 'AP(Sl.G.)',
    teachingExp: 13.31,
    phone: '04562-235357',
    email: 'santhicse@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Data Structures', 'C Programming', 'Object Oriented Programming'],
  },
  {
    name: 'Mr. N. Umakanth',
    qualification: 'BE, ME, (PhD)',
    designation: 'AP(Sl.G.)',
    teachingExp: 13.30,
    phone: '04562-235361',
    email: 'umakanthn@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Software Engineering', 'Agile Methodologies', 'Full Stack Development'],
  },
  {
    name: 'Dr. P. Vinoth',
    qualification: 'BTech, ME, PhD',
    designation: 'AP(Sl.G.)',
    teachingExp: 19.93,
    phone: '04562-235369',
    email: 'vinoth@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Machine Learning', 'Natural Language Processing', 'Data Science'],
  },
  {
    name: 'Dr. N. Kavitha',
    qualification: 'BE, ME, PhD',
    designation: 'AP(Sl.G.)',
    teachingExp: 17.87,
    phone: '04562-235370',
    email: 'nkavitha@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Compiler Design', 'Automata Theory', 'Discrete Mathematics'],
  },
  {
    name: 'Mr. S. Muthukumar',
    qualification: 'BE, MS, (PhD)',
    designation: 'AP(Sr.G.)',
    teachingExp: 13.26,
    phone: '04562-235365',
    email: 'smuthukumarbsc@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Microprocessors & Interfacing', 'Embedded Systems', 'Computer Architecture'],
  },
  {
    name: 'Dr. M. Jansi Rani',
    qualification: 'BE, MTech, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 14.69,
    phone: '04562-235366',
    email: 'jansirani@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Mobile Computing', 'Android Application Development', 'Cloud Architecture'],
  },
  {
    name: 'Dr. P. Abinaya',
    qualification: 'BTech, ME, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 11.06,
    phone: '04562-235362',
    email: 'abinayap@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Design and Analysis of Algorithms', 'Data Structures', 'Python Programming'],
  },
  {
    name: 'Dr. G. Nirmala',
    qualification: 'BE, ME, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 17.51,
    phone: '04562-235366',
    email: 'nirmalag@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Database Management Systems', 'Information Retrieval', 'Data Mining'],
  },
  {
    name: 'Dr. S. Karkuzhali',
    qualification: 'BE, ME, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 9.61,
    phone: '04562-235371',
    email: 'karkuzhali@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Artificial Intelligence', 'Soft Computing', 'Expert Systems'],
  },
  {
    name: 'Dr. G. Shenbagalakshmi',
    qualification: 'BE, ME, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 5.85,
    phone: '04562-235371',
    email: 'shenbagalakshmi@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Operating Systems', 'Unix Programming', 'Shell Scripting'],
  },
  {
    name: 'Ms. T. Bhuvaneswari',
    qualification: 'BTech, ME, (PhD)',
    designation: 'AP(Sr.G.)',
    teachingExp: 8.12,
    phone: '04562-235379',
    email: 'bhuvaneswarit@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Internet Programming', 'Web Technologies', 'JavaScript & Frameworks'],
  },
  {
    name: 'Dr. K. Muthamil Sudar',
    qualification: 'BTech, ME, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 10.20,
    phone: '04562-235364',
    email: 'k.muthamilsudar@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Computer Networks', 'Blockchain Technology', 'Cryptography'],
  },
  {
    name: 'Mrs. M. Nagajothi',
    qualification: 'BE, ME, (PhD)',
    designation: 'AP(Sr.G.)',
    teachingExp: 6.18,
    phone: '04562-235368',
    email: 'mnjothi@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Software Testing and Quality Assurance', 'Object Oriented Analysis', 'UML'],
  },
  {
    name: 'Mrs. M. Stella Inba Mary',
    qualification: 'BE, ME, (PhD)',
    designation: 'AP(Sr.G.)',
    teachingExp: 12.43,
    phone: '04562-235353',
    email: 'stellainbamarym@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Computer Graphics and Multimedia', 'User Interface Design', 'Game Design'],
  },
  {
    name: 'Dr. T. Gladima Nisia',
    qualification: 'BE, ME, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 8.98,
    phone: '04562-235368',
    email: 'gladimanisiat@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Distributed Systems', 'Cloud Computing Essentials', 'Parallel Processing'],
  },
  {
    name: 'Mrs. C. Abinaya Devi',
    qualification: 'BE, ME, (PhD)',
    designation: 'AP(Sr.G.)',
    teachingExp: 8.03,
    phone: '04562-235357',
    email: 'abinayadevi@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['High Performance Computing', 'Computer Architecture', 'C Programming'],
  },
  {
    name: 'Dr. D. Sasireka',
    qualification: 'BTech, MTech, PhD',
    designation: 'AP(Sr.G.)',
    teachingExp: 10.31,
    phone: '04562-235353',
    email: 'sasirekad@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Data Structures and Algorithms', 'Python for Data Science', 'DBMS'],
  },
  {
    name: 'Dr. K. Kamala Devi',
    qualification: 'BE, ME, PhD',
    designation: 'Assistant Professor',
    teachingExp: 2.26,
    phone: '04562-235370',
    email: 'kamaladevik@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Programming in C', 'Data Structures Laboratory', 'Web Development'],
  },
  {
    name: 'Mrs. K. Lingajothi',
    qualification: 'BTech, MTech',
    designation: 'Assistant Professor',
    teachingExp: 2.25,
    phone: '04562-235362',
    email: 'lingajothik@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Object Oriented Programming in Java', 'Software Engineering Practice'],
  },
  {
    name: 'Mrs. M. Thanga Aruna',
    qualification: 'BTech, ME, (PhD)',
    designation: 'Assistant Professor',
    teachingExp: 9.13,
    phone: '04562-235352',
    email: 'thangaarunam@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Problem Solving using Python', 'Database Lab', 'Operating Systems'],
  },
  {
    name: 'Mr. S. Siva Prakash',
    qualification: 'BE, ME',
    designation: 'Assistant Professor',
    teachingExp: 1.18,
    phone: '04562-235372',
    email: 'sivaprakashs@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Problem Solving and Python Programming', 'Data Structures', 'C Programming'],
  },
  {
    name: 'Mr. D. Kani Ratham',
    qualification: 'BE, ME',
    designation: 'Assistant Professor',
    teachingExp: 0.31,
    phone: '04562-235369',
    email: 'kanirathamd@mepcoeng.ac.in',
    role: 'faculty',
    level: 1,
    subjects: ['Computer Programming Laboratory', 'Foundations of Computer Science'],
  },
];

export const DEPARTMENTS = [
  {
    code: 'CSE',
    name: 'Computer Science and Engineering',
    shortName: 'CSE',
    establishedYear: 1984,
    description: 'Premier department equipping students with fundamental and state-of-the-art computing skills.',
    contactEmail: 'hod_cse@mepcoeng.ac.in',
    phoneExtension: '04562-235350',
  },
  {
    code: 'IT',
    name: 'Information Technology',
    shortName: 'IT',
    establishedYear: 1999,
    description: 'Department dedicated to internet applications, information systems, and cloud architectures.',
    contactEmail: 'hod_it@mepcoeng.ac.in',
    phoneExtension: '04562-235400',
  },
  {
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    shortName: 'ECE',
    establishedYear: 1984,
    description: 'Specializing in VLSI, signal processing, communication systems, and embedded computing.',
    contactEmail: 'hod_ece@mepcoeng.ac.in',
    phoneExtension: '04562-235300',
  },
  {
    code: 'AIDS',
    name: 'Artificial Intelligence and Data Science',
    shortName: 'AI & DS',
    establishedYear: 2021,
    description: 'Focusing on advanced machine learning, neural networks, big data analytics, and cognitive systems.',
    contactEmail: 'hod_ad@mepcoeng.ac.in',
    phoneExtension: '04562-235450',
  },
  {
    code: 'ME',
    name: 'Mechanical Engineering',
    shortName: 'MECH',
    establishedYear: 1984,
    description: 'Excellence in thermal design, robotics, manufacturing systems, and materials engineering.',
    contactEmail: 'hod_me@mepcoeng.ac.in',
    phoneExtension: '04562-235200',
  },
  {
    code: 'CE',
    name: 'Civil Engineering',
    shortName: 'CIVIL',
    establishedYear: 1984,
    description: 'Specialized in structural engineering, environmental management, and sustainable infrastructure.',
    contactEmail: 'hod_ce@mepcoeng.ac.in',
    phoneExtension: '04562-235100',
  },
];

export const CORE_SUBJECTS = [
  { code: '23CS301', title: 'Data Structures and Algorithms', department: 'Computer Science and Engineering', semester: 3, credits: 4, type: 'theory_cum_practical' },
  { code: '23CS302', title: 'Object Oriented Programming with Java', department: 'Computer Science and Engineering', semester: 3, credits: 3, type: 'theory' },
  { code: '23CS303', title: 'Digital Logic and Computer Organization', department: 'Computer Science and Engineering', semester: 3, credits: 3, type: 'theory' },
  { code: '23CS401', title: 'Database Management Systems', department: 'Computer Science and Engineering', semester: 4, credits: 4, type: 'theory_cum_practical' },
  { code: '23CS402', title: 'Operating Systems Principles and Design', department: 'Computer Science and Engineering', semester: 4, credits: 3, type: 'theory' },
  { code: '23CS403', title: 'Design and Analysis of Algorithms', department: 'Computer Science and Engineering', semester: 4, credits: 4, type: 'theory' },
  { code: '23CS501', title: 'Computer Networks and Protocols', department: 'Computer Science and Engineering', semester: 5, credits: 4, type: 'theory_cum_practical' },
  { code: '23CS502', title: 'Theory of Computation and Automata', department: 'Computer Science and Engineering', semester: 5, credits: 3, type: 'theory' },
  { code: '23CS503', title: 'Software Engineering Methodologies', department: 'Computer Science and Engineering', semester: 5, credits: 3, type: 'theory' },
  { code: '23CS601', title: 'Compiler Design and Optimization', department: 'Computer Science and Engineering', semester: 6, credits: 4, type: 'theory_cum_practical' },
  { code: '23CS602', title: 'Cryptography and Information Security', department: 'Computer Science and Engineering', semester: 6, credits: 3, type: 'theory' },
  { code: '23CS701', title: 'Artificial Intelligence and Machine Learning', department: 'Computer Science and Engineering', semester: 7, credits: 4, type: 'theory_cum_practical' },
  { code: '23CS702', title: 'Cloud Computing and Virtualization', department: 'Computer Science and Engineering', semester: 7, credits: 3, type: 'theory' },
  { code: '23CS703', title: 'Project Work Phase I', department: 'Computer Science and Engineering', semester: 7, credits: 2, type: 'project' },
  { code: '23CS801', title: 'Project Work Phase II', department: 'Computer Science and Engineering', semester: 8, credits: 10, type: 'project' },
  { code: '23AD501', title: 'Deep Learning Architectures', department: 'Artificial Intelligence and Data Science', semester: 5, credits: 4, type: 'theory' },
  { code: '23EC501', title: 'Microprocessors and Embedded Systems', department: 'Electronics and Communication Engineering', semester: 5, credits: 4, type: 'theory_cum_practical' },
  { code: '23ME501', title: 'Thermal and Fluid Engineering', department: 'Mechanical Engineering', semester: 5, credits: 4, type: 'theory' },
];

export async function runMepcoSeed() {
  console.log('[seed] Connecting to MongoDB:', MONGO_URI);
  await connectDB(MONGO_URI);

  // 1. Seed Departments
  console.log('[seed] Ingesting Departments...');
  for (const dept of DEPARTMENTS) {
    await Department.findOneAndUpdate({ code: dept.code }, dept, { upsert: true, new: true });
  }

  // 2. Seed Subjects
  console.log('[seed] Ingesting Core Curriculum Subjects...');
  for (const sub of CORE_SUBJECTS) {
    await Subject.findOneAndUpdate({ code: sub.code }, sub, { upsert: true, new: true });
  }

  // 3. Seed Faculty & HOD (37 staff records)
  console.log('[seed] Ingesting 37 CSE Faculty & HOD accounts...');
  const facultyRecords = [];
  let hodRecord = null;

  for (const f of RAW_CSE_FACULTY) {
    const existing = await User.findOne({ email: f.email.toLowerCase() });
    const payload = {
      name: f.name,
      email: f.email.toLowerCase(),
      password: existing ? undefined : 'faculty123', // preserve if already set
      role: f.role,
      level: f.level,
      designation: f.designation,
      qualification: f.qualification,
      teachingExperienceYears: f.teachingExp,
      department: 'Computer Science and Engineering',
      hodOf: f.role === 'hod' ? 'Computer Science and Engineering' : '',
      phone: f.phone,
      subjects: f.subjects,
      isAvailable: true,
      maxOpenTickets: f.level === 3 ? 12 : f.level === 2 ? 8 : 6,
      avatarColor: f.role === 'hod' ? '#0ea5e9' : f.level === 2 ? '#0891b2' : '#2563eb',
      validationFlags: f.flags || [],
    };

    if (existing) {
      delete payload.password;
      const updated = await User.findByIdAndUpdate(existing._id, payload, { new: true });
      facultyRecords.push(updated);
      if (f.role === 'hod') hodRecord = updated;
    } else {
      payload.password = f.role === 'hod' ? 'hod123' : 'faculty123';
      const created = await User.create(payload);
      facultyRecords.push(created);
      if (f.role === 'hod') hodRecord = created;
    }
  }

  // Bind HOD to Department
  if (hodRecord) {
    await Department.findOneAndUpdate({ code: 'CSE' }, { hod: hodRecord._id });
  }

  // 4. Ensure Admin Account
  console.log('[seed] Ensuring Admin Account...');
  let adminUser = await User.findOne({ email: 'admin@mepcoeng.ac.in' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Academic Systems Administrator',
      email: 'admin@mepcoeng.ac.in',
      password: 'admin123',
      role: 'admin',
      designation: 'Chief Academic Administrator',
      employeeId: 'ADM-MEPCO-01',
      department: 'Administration',
      phone: '04562-235000',
      avatarColor: '#7c3aed',
    });
  }

  // 5. Seed 37 CSE Student Registration Allowlist Records
  console.log('[seed] Ingesting 37 CSE Student Allowlist records (24BCS064 - 24BCS100)...');
  const allowlistRecords = [];
  for (const s of RAW_CSE_STUDENTS) {
    const existing = await RegistrationEligibility.findOne({ email: s.email.toLowerCase() });
    const payload = {
      email: s.email.toLowerCase(),
      name: s.name,
      rollNumber: s.rollNumber,
      department: 'Computer Science and Engineering',
      departmentCode: 'CSE',
      batch: '2024-2028',
      year: 3,
      semester: 5,
      section: 'A',
      validationFlags: s.flags || [],
      isActive: true,
    };
    if (existing) {
      const u = await RegistrationEligibility.findByIdAndUpdate(existing._id, payload, { new: true });
      allowlistRecords.push(u);
    } else {
      const c = await RegistrationEligibility.create(payload);
      allowlistRecords.push(c);
    }
  }

  // 6. Seed active claimed demo student accounts from allowlist
  console.log('[seed] Initializing active demo student accounts...');
  // Account 1: DHANUSHA T S (24BCS100)
  const dhanushaEntry = await RegistrationEligibility.findOne({ rollNumber: '24BCS100' });
  let dhanushaUser = await User.findOne({ email: 'dhanushats007_bcs28@mepcoeng.ac.in' });
  if (!dhanushaUser && dhanushaEntry) {
    dhanushaUser = await User.create({
      name: dhanushaEntry.name,
      email: dhanushaEntry.email,
      password: 'student123',
      role: 'student',
      rollNumber: dhanushaEntry.rollNumber,
      department: dhanushaEntry.department,
      year: dhanushaEntry.year,
      semester: dhanushaEntry.semester,
      section: dhanushaEntry.section,
      cgpa: 8.85,
      attendance: 94.2,
      avatarColor: '#ec4899',
      registrationEligibility: dhanushaEntry._id,
      advisor: facultyRecords[1]?._id || null, // Dr. K. Mala
    });
    dhanushaEntry.isClaimed = true;
    dhanushaEntry.claimedBy = dhanushaUser._id;
    dhanushaEntry.claimedAt = new Date();
    await dhanushaEntry.save();
  }

  // Account 2: Nirupa K V (24BCS064)
  const nirupaEntry = await RegistrationEligibility.findOne({ rollNumber: '24BCS064' });
  let nirupaUser = await User.findOne({ email: 'kulandai.kvn_bcs28@mepcoeng.ac.in' });
  if (!nirupaUser && nirupaEntry) {
    nirupaUser = await User.create({
      name: nirupaEntry.name,
      email: nirupaEntry.email,
      password: 'student123',
      role: 'student',
      rollNumber: nirupaEntry.rollNumber,
      department: nirupaEntry.department,
      year: nirupaEntry.year,
      semester: nirupaEntry.semester,
      section: nirupaEntry.section,
      cgpa: 9.12,
      attendance: 96.5,
      avatarColor: '#10b981',
      registrationEligibility: nirupaEntry._id,
      advisor: facultyRecords[2]?._id || null, // Dr. S. Devi Mahalakshmi
    });
    nirupaEntry.isClaimed = true;
    nirupaEntry.claimedBy = nirupaUser._id;
    nirupaEntry.claimedAt = new Date();
    await nirupaEntry.save();
  }

  // 7. Seed Official Announcements
  console.log('[seed] Ingesting verified Announcements...');
  const sampleAnnouncements = [
    {
      title: 'National Level Technical Symposium & Project Exhibition 2026',
      content: 'Department of Computer Science and Engineering invites project submissions and technical paper abstracts for the upcoming annual symposium. Prizes awarded for top innovations.',
      department: 'Computer Science and Engineering',
      category: 'event',
      targetRoles: ['student', 'faculty', 'hod'],
      priority: 'important',
      author: hodRecord ? hodRecord._id : adminUser._id,
      publishedAt: new Date(Date.now() - 3600000 * 24 * 2),
    },
    {
      title: 'Continuous Assessment Test (CAT-II) Schedule Released',
      content: 'The timetable for CAT-II for 5th semester B.E. Computer Science and Engineering is published on the portal. Students must report to assigned examination halls 15 minutes prior.',
      department: 'Computer Science and Engineering',
      category: 'examination',
      targetRoles: ['student', 'faculty'],
      priority: 'urgent',
      author: hodRecord ? hodRecord._id : adminUser._id,
      publishedAt: new Date(Date.now() - 3600000 * 12),
    },
    {
      title: 'Academic Helpdesk & Knowledge Hub Live for Semester 5',
      content: 'Students can now raise doubts directly to course faculty, view verified solution guides, and track resolution SLA in working hours. NLP query search is active on the Knowledge Hub.',
      department: 'All',
      category: 'academic',
      targetRoles: ['student', 'faculty', 'hod', 'admin'],
      priority: 'normal',
      author: adminUser._id,
      publishedAt: new Date(Date.now() - 3600000 * 6),
    },
  ];

  for (const ann of sampleAnnouncements) {
    const exists = await Announcement.findOne({ title: ann.title });
    if (!exists) await Announcement.create(ann);
  }

  // 8. Seed Verified Study Resources (Resource Hub)
  console.log('[seed] Ingesting verified Study Materials & Question Banks...');
  const sampleResources = [
    {
      title: 'DBMS Unit 3: Normalization and Relational Decomposition Notes',
      description: 'Comprehensive study material explaining Functional Dependencies, 1NF, 2NF, 3NF, BCNF with step-by-step solved decomposition problems.',
      department: 'Computer Science and Engineering',
      subject: 'Database Management Systems',
      subjectCode: '23CS401',
      semester: 5,
      resourceType: 'notes',
      fileUrl: '/uploads/resources/dbms_normalization_unit3.pdf',
      fileName: 'dbms_normalization_unit3.pdf',
      fileSize: 2450000,
      mimeType: 'application/pdf',
      uploadedBy: facultyRecords[2]?._id || adminUser._id, // Dr. S. Devi Mahalakshmi
      tags: ['dbms', 'normalization', 'bcnf', '3nf'],
      downloadsCount: 142,
    },
    {
      title: 'Computer Networks (23CS501) - Two Mark & 16 Mark Question Bank with Key',
      description: 'Model question paper key covering OSI & TCP/IP layers, Routing algorithms, Congestion control, and Socket programming.',
      department: 'Computer Science and Engineering',
      subject: 'Computer Networks and Protocols',
      subjectCode: '23CS501',
      semester: 5,
      resourceType: 'question_bank',
      fileUrl: '/uploads/resources/cn_question_bank_sem5.pdf',
      fileName: 'cn_question_bank_sem5.pdf',
      fileSize: 1850000,
      mimeType: 'application/pdf',
      uploadedBy: hodRecord ? hodRecord._id : adminUser._id,
      tags: ['computer networks', 'question bank', 'tcp ip', 'routing'],
      downloadsCount: 218,
    },
    {
      title: 'Operating Systems Lab Manual - POSIX Threads & CPU Scheduling Simulations',
      description: 'Lab exercise guide covering FCFS, SJF, Round Robin scheduling, Semaphores, and Dining Philosophers synchronization code.',
      department: 'Computer Science and Engineering',
      subject: 'Operating Systems Principles and Design',
      subjectCode: '23CS402',
      semester: 5,
      resourceType: 'lab_manual',
      fileUrl: '/uploads/resources/os_lab_manual_r2021.pdf',
      fileName: 'os_lab_manual_r2021.pdf',
      fileSize: 3120000,
      mimeType: 'application/pdf',
      uploadedBy: facultyRecords[3]?._id || adminUser._id, // Dr. S. Vanitha Sivagami
      tags: ['operating systems', 'lab manual', 'posix', 'scheduling'],
      downloadsCount: 95,
    },
    {
      title: 'Compiler Design: Lexical Analysis and LL(1) Parser Construction Tutorial',
      description: 'Step-by-step tutorial on calculating FIRST and FOLLOW sets, building predictive parsing tables, and handling shift-reduce conflicts.',
      department: 'Computer Science and Engineering',
      subject: 'Compiler Design and Optimization',
      subjectCode: '23CS601',
      semester: 5,
      resourceType: 'tutorial',
      fileUrl: '/uploads/resources/compiler_design_parsing.pdf',
      fileName: 'compiler_design_parsing.pdf',
      fileSize: 1980000,
      mimeType: 'application/pdf',
      uploadedBy: facultyRecords[5]?._id || adminUser._id, // Dr. K. Ruba Soundar
      tags: ['compiler design', 'parsing', 'first and follow', 'll1'],
      downloadsCount: 164,
    },
  ];

  for (const res of sampleResources) {
    const exists = await Resource.findOne({ title: res.title });
    if (!exists) await Resource.create(res);
  }

  // 9. Seed Project Pulse Workspace
  console.log('[seed] Ingesting initial Project Pulse collaboration...');
  if (dhanushaUser && nirupaUser && hodRecord) {
    const projectExists = await Project.findOne({ title: 'Autonomous Smart Campus Navigation & Helpdesk Hub' });
    if (!projectExists) {
      await Project.create({
        title: 'Autonomous Smart Campus Navigation & Helpdesk Hub',
        description: 'An intelligent real-world academic assistance ecosystem connecting student doubts to subject specialists with natural language matching, SLA tracking, and dynamic resource discovery.',
        department: 'Computer Science and Engineering',
        batch: '2024-2028',
        semester: 5,
        category: 'mini_project',
        mentor: hodRecord._id,
        members: [
          { student: dhanushaUser._id, rollNumber: dhanushaUser.rollNumber, name: dhanushaUser.name, role: 'Project Lead & Full-Stack Architect' },
          { student: nirupaUser._id, rollNumber: nirupaUser.rollNumber, name: nirupaUser.name, role: 'NLP & Database Engineer' },
        ],
        status: 'in_progress',
        milestones: [
          { title: 'System Requirement Specification & Architecture Finalization', description: 'Complete entity schemas and API contracts.', dueDate: new Date(Date.now() - 3600000 * 24 * 7), isCompleted: true, completedAt: new Date(Date.now() - 3600000 * 24 * 7) },
          { title: 'Core NLP Matching & Bottom-Up SLA Engine Implementation', description: 'TF-IDF vector cosine matching with explainability output.', dueDate: new Date(Date.now() + 3600000 * 24 * 10), isCompleted: true, completedAt: new Date() },
          { title: 'Final System Evaluation & Academic Deployment Review', description: 'Presentation before faculty evaluation committee.', dueDate: new Date(Date.now() + 3600000 * 24 * 25), isCompleted: false },
        ],
        tasks: [
          { title: 'Verify allowlist registration against official 37 student dataset', assignedTo: dhanushaUser._id, dueDate: new Date(Date.now() + 3600000 * 24 * 2), status: 'completed' },
          { title: 'Connect Academic Pulse knowledge-gap detection to HOD dashboard', assignedTo: nirupaUser._id, dueDate: new Date(Date.now() + 3600000 * 24 * 5), status: 'in_progress' },
        ],
        mentorFeedback: [
          { mentor: hodRecord._id, content: 'Excellent progress on the NLP matching accuracy and bottom-up routing ladder. Ensure SLA deadlines conform to the 6 AM - 12 AM academic window.', createdAt: new Date(Date.now() - 3600000 * 24) },
        ],
      });
    }
  }

  // 10. Seed High Quality Knowledge Base Articles with Full NLP Index
  console.log('[seed] Ingesting verified Knowledge Base Articles...');
  const kbArticles = [
    {
      title: 'DBMS Normalization Rules, Functional Dependencies, and Normal Forms (1NF to BCNF)',
      question: 'How do I decompose a relational schema into 3NF and BCNF, and what are the anomaly differences?',
      answer: 'Relational normalization eliminates data redundancy and insertion, deletion, and modification anomalies. 1NF guarantees that every attribute holds atomic (indivisible) values with no repeating groups. 2NF requires 1NF and ensures every non-prime attribute is fully functionally dependent on the entire primary key. 3NF enforces 2NF and prohibits transitive dependencies (X -> Y -> Z where Z is non-prime). BCNF (Boyce-Codd Normal Form) strictly requires that for every non-trivial functional dependency X -> Y, X must be a superkey. When decomposing into 3NF, both dependency preservation and lossless-join property can always be guaranteed simultaneously, whereas BCNF guarantees lossless-join but may not preserve all functional dependencies.',
      category: 'Database Management Systems',
      department: 'Computer Science and Engineering',
      subject: 'Database Management Systems',
      tags: ['normalization', 'dbms', 'bcnf', '3nf', '2nf', 'lossless join', 'dependency preservation'],
      status: 'published',
      source: 'faculty',
      createdBy: facultyRecords[2]?._id || adminUser._id, // Dr. S. Devi Mahalakshmi
      verifiedBy: hodRecord ? hodRecord._id : adminUser._id,
      helpful: 48,
      views: 312,
    },
    {
      title: 'Computer Networks: TCP Three-Way Handshake and Connection Teardown Mechanism',
      question: 'Explain the working of TCP three-way handshake and four-way termination with sequence numbers and flags.',
      answer: 'TCP provides reliable, stream-oriented data delivery using sequence numbers and acknowledgments. Connection establishment uses a 3-way handshake: (1) Client sends SYN with initial sequence number seq=x. (2) Server responds with SYN-ACK, setting seq=y and ack=x+1. (3) Client sends ACK with ack=y+1, establishing ESTABLISHED state on both endpoints. Connection termination requires a 4-way exchange: (1) Active closer sends FIN (seq=u). (2) Passive receiver sends ACK (ack=u+1) and enters CLOSE_WAIT while remaining free to send pending data. (3) When ready, receiver sends its own FIN (seq=v, ack=u+1). (4) Initiator sends final ACK (ack=v+1) and waits in TIME_WAIT state for 2*MSL (Maximum Segment Lifetime) to ensure the ACK was received.',
      category: 'Computer Networks',
      department: 'Computer Science and Engineering',
      subject: 'Computer Networks and Protocols',
      tags: ['computer networks', 'tcp', 'handshake', 'syn', 'ack', 'connection teardown', 'time wait'],
      status: 'published',
      source: 'faculty',
      createdBy: hodRecord ? hodRecord._id : adminUser._id, // Dr. J. Raja Sekar
      verifiedBy: hodRecord ? hodRecord._id : adminUser._id,
      helpful: 56,
      views: 420,
    },
    {
      title: 'Operating Systems: Banker’s Algorithm for Deadlock Avoidance with Safety Check',
      question: 'How to calculate the Need Matrix and verify if a system state is safe in Banker’s Algorithm?',
      answer: 'Dijkstra’s Banker’s Algorithm evaluates resource requests dynamically to prevent circular wait deadlocks. It operates on vectors: Available[m], Max[n, m], Allocation[n, m], and Need[n, m], where Need[i, j] = Max[i, j] - Allocation[i, j]. Safety Algorithm steps: (1) Initialize Work = Available and Finish[i] = false for all processes. (2) Find index i such that Finish[i] == false and Need[i] <= Work. If no such i exists, check if all Finish[i] == true (system is SAFE; otherwise UNSAFE). (3) When such a process i is found, set Work = Work + Allocation[i], Finish[i] = true, and repeat step 2. If a safe sequence <P0, P1, ..., Pn-1> exists, the resource request is granted.',
      category: 'Operating Systems',
      department: 'Computer Science and Engineering',
      subject: 'Operating Systems Principles and Design',
      tags: ['operating systems', 'banker algorithm', 'deadlock avoidance', 'safe sequence', 'need matrix'],
      status: 'published',
      source: 'faculty',
      createdBy: facultyRecords[3]?._id || adminUser._id, // Dr. S. Vanitha Sivagami
      verifiedBy: hodRecord ? hodRecord._id : adminUser._id,
      helpful: 39,
      views: 285,
    },
    {
      title: 'Data Structures: AVL Tree Self-Balancing Rotations (LL, RR, LR, RL)',
      question: 'How to determine balance factors and apply single and double rotations in AVL trees?',
      answer: 'An AVL tree is a height-balanced binary search tree where the balance factor of every node BF = height(left_subtree) - height(right_subtree) must be in {-1, 0, 1}. When an insertion causes BF to become +2 or -2, four rotation cases apply: (1) LL Imbalance (inserted into left child of left child): Perform Single Right Rotation. (2) RR Imbalance (inserted into right child of right child): Perform Single Left Rotation. (3) LR Imbalance (inserted into right child of left child): Perform Double Rotation — Left rotation on left child, followed by Right rotation on root. (4) RL Imbalance (inserted into left child of right child): Perform Right rotation on right child, followed by Left rotation on root. All rotations preserve BST ordering in O(1) time.',
      category: 'Data Structures',
      department: 'Computer Science and Engineering',
      subject: 'Data Structures and Algorithms',
      tags: ['data structures', 'avl tree', 'rotations', 'balance factor', 'binary search tree'],
      status: 'published',
      source: 'faculty',
      createdBy: facultyRecords[1]?._id || adminUser._id, // Dr. K. Mala
      verifiedBy: hodRecord ? hodRecord._id : adminUser._id,
      helpful: 62,
      views: 450,
    },
    {
      title: 'Compiler Design: Computation of FIRST and FOLLOW Sets for Predictive Parsers',
      question: 'What are the formal rules for calculating FIRST and FOLLOW sets in LL(1) grammars?',
      answer: 'FIRST(X) is the set of terminal symbols that appear as the first symbol of a string derived from X. Rules: (1) If X is a terminal, FIRST(X) = {X}. (2) If X -> epsilon, add epsilon to FIRST(X). (3) If X -> Y1 Y2 ... Yk, add all non-epsilon terminals from FIRST(Y1). If FIRST(Y1) contains epsilon, continue to Y2, etc. If all Y1...Yk derive epsilon, add epsilon to FIRST(X). FOLLOW(A) is the set of terminals that can appear immediately to the right of non-terminal A in any sentential form. Rules: (1) Add $ (end marker) to FOLLOW(S) where S is start symbol. (2) If A -> alpha B beta, add all terminals in FIRST(beta) except epsilon to FOLLOW(B). (3) If A -> alpha B or A -> alpha B beta where FIRST(beta) contains epsilon, add everything in FOLLOW(A) to FOLLOW(B).',
      category: 'Compiler Design',
      department: 'Computer Science and Engineering',
      subject: 'Compiler Design and Optimization',
      tags: ['compiler design', 'first and follow', 'll1 parser', 'grammar', 'predictive parsing'],
      status: 'published',
      source: 'faculty',
      createdBy: facultyRecords[5]?._id || adminUser._id, // Dr. K. Ruba Soundar
      verifiedBy: hodRecord ? hodRecord._id : adminUser._id,
      helpful: 41,
      views: 290,
    },
  ];

  for (const article of kbArticles) {
    const textCorpus = `${article.title} ${article.question} ${article.answer} ${article.tags.join(' ')}`;
    const { tokens, lemmas } = preprocess(textCorpus);
    const tf = termFrequency(lemmas);
    const tfObj = {};
    for (const [k, v] of tf) tfObj[k] = v;

    await KbArticle.findOneAndUpdate(
      { title: article.title },
      {
        ...article,
        tokenized: tokens,
        lemmas: lemmas,
        termFreq: tfObj,
      },
      { upsert: true, new: true }
    );
  }

  console.log('\n======================================================');
  console.log('  MEPCO REAL DATA SEED COMPLETE');
  console.log('======================================================');
  console.log(`  Departments Ingested   : ${DEPARTMENTS.length}`);
  console.log(`  Subjects Ingested      : ${CORE_SUBJECTS.length}`);
  console.log(`  Faculty Ingested       : ${RAW_CSE_FACULTY.length} (HOD: Dr. J. Raja Sekar)`);
  console.log(`  Students In Allowlist  : ${RAW_CSE_STUDENTS.length} (24BCS064 - 24BCS100)`);
  console.log(`  Active Demo Students   : 2 (Dhanusha T S: 24BCS100, Nirupa K V: 24BCS064)`);
  console.log(`  Unclaimed for Testing  : 35`);
  console.log(`  KB Articles Ingested   : ${kbArticles.length}`);
  console.log(`  Resources Ingested     : ${sampleResources.length}`);
  console.log(`  Announcements Ingested : ${sampleAnnouncements.length}`);
  console.log('======================================================\n');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('mepcoRealSeed.js')) {
  runMepcoSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed error]', err);
      process.exit(1);
    });
}
