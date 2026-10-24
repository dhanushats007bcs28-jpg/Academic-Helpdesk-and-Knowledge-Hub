import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { User } from '../models/User.js';
import { requireAuth, requireRole, signToken } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { Ticket } from '../models/Ticket.js';
import { KbArticle } from '../models/KbArticle.js';
import { RegistrationEligibility } from '../models/RegistrationEligibility.js';
import { Department } from '../models/Department.js';
import { Subject } from '../models/Subject.js';
import { Announcement } from '../models/Announcement.js';
import { Resource } from '../models/Resource.js';
import { Project } from '../models/Project.js';
import { asyncHandler, logActivity } from '../utils/helpers.js';
import { v2 as cloudinary } from 'cloudinary';

const router = Router();


function cloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error('Profile photo storage is not configured. Set the Cloudinary environment variables on the server.');
    error.status = 503;
    throw error;
  }
  return { cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET };
}

function configureCloudinary() {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
  ) {
    const error = new Error(
      'Cloudinary is not configured. Check the server environment variables.'
    );
    error.status = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

async function uploadProfileImageToCloudinary(dataUrl, userId) {
  const client = configureCloudinary();

  if (
    typeof dataUrl !== 'string' ||
    !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(dataUrl)
  ) {
    const error = new Error(
      'Upload a valid JPEG, PNG, WEBP, or GIF image.'
    );
    error.status = 400;
    throw error;
  }

  try {
    const result = await client.uploader.upload(dataUrl, {
      resource_type: 'image',
      public_id: `academic-helpdesk/profiles/${userId}`,
      overwrite: true,
      invalidate: true,
    });

    if (!result.secure_url || !result.public_id) {
      throw new Error('Cloudinary returned an incomplete upload result.');
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('[Cloudinary upload]', error.message);

    if (error.http_code === 401 || error.http_code === 403) {
      const uploadError = new Error(
        'Cloudinary rejected the credentials or upload permission.'
      );
      uploadError.status = 502;
      throw uploadError;
    }

    const uploadError = new Error(
      'Profile photo upload failed. Check the server connection to Cloudinary and try again.'
    );
    uploadError.status = 502;
    throw uploadError;
  }
}

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;

  const client = configureCloudinary();

  try {
    const result = await client.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });

    if (!['ok', 'not found'].includes(result.result)) {
      throw new Error('Cloudinary could not remove the old profile photo.');
    }
  } catch (error) {
    console.error('[Cloudinary delete]', error.message);
    throw error;
  }
}

/* ----------------------------- AUTH ----------------------------- */

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account deactivated. Contact admin.' });

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: user.toPublic() });
  })
);

/**
 * Check if a student email is on the approved admin allowlist
 * and eligible for self-registration.
 */
router.post(
  '/auth/check-eligibility',
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user account already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        eligible: false,
        message: 'An account is already registered with this email address. Please sign in.',
      });
    }

    // Check allowlist
    const eligibility = await RegistrationEligibility.findOne({
      email: cleanEmail,
      isActive: true,
    });

    if (!eligibility) {
      return res.status(403).json({
        eligible: false,
        message: 'This email is not on the authorized registration list. Please contact your department coordinator.',
      });
    }

    if (eligibility.isClaimed) {
      return res.status(400).json({
        eligible: false,
        message: 'This student record has already been claimed. If you believe this is an error, contact administration.',
      });
    }

    res.json({
      eligible: true,
      student: {
        name: eligibility.name,
        rollNumber: eligibility.rollNumber,
        department: eligibility.department,
        departmentCode: eligibility.departmentCode,
        batch: eligibility.batch,
        year: eligibility.year,
        semester: eligibility.semester,
        section: eligibility.section,
        validationFlags: eligibility.validationFlags,
      },
    });
  })
);

router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const { email, password, phone } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

    // Validate against RegistrationEligibility allowlist
    const eligibility = await RegistrationEligibility.findOne({
      email: cleanEmail,
      isActive: true,
    });

    if (!eligibility) {
      return res.status(403).json({
        error: 'Registration rejected: Email is not authorized on the institutional student allowlist.',
      });
    }

    if (eligibility.isClaimed) {
      return res.status(400).json({
        error: 'Registration rejected: This student authorization has already been claimed.',
      });
    }

    // Create user securely bound to verified allowlist fields
    const user = await User.create({
      name: eligibility.name,
      email: cleanEmail,
      password,
      role: 'student',
      rollNumber: eligibility.rollNumber,
      department: eligibility.department,
      year: eligibility.year,
      semester: eligibility.semester,
      section: eligibility.section,
      phone: phone || '',
      registrationEligibility: eligibility._id,
      validationFlags: eligibility.validationFlags || [],
      avatarColor: '#2563eb',
    });

    // Mark allowlist record as claimed
    eligibility.isClaimed = true;
    eligibility.claimedBy = user._id;
    eligibility.claimedAt = new Date();
    await eligibility.save();

    await logActivity({
      actor: user,
      action: 'student.register_claimed',
      entity: 'User',
      entityId: user._id,
      detail: `Student ${eligibility.name} (${eligibility.rollNumber}) registered via allowlist.`,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: user.toPublic() });
  })
);

router.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toPublic() });
  })
);

router.patch(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const common = ['name', 'phone', 'profileImage', 'bio', 'officeLocation', 'linkedin'];
    const studentFields = ['semester', 'section'];
    const staffFields = ['designation', 'qualification', 'teachingExperienceYears', 'subjects'];
    const hodFields = ['hodOf'];
    const adminFields = [];
    const allowed = [...common,
      ...(req.user.role === 'student' ? studentFields : []),
      ...(req.user.role === 'faculty' ? staffFields : []),
      ...(req.user.role === 'hod' ? [...staffFields, ...hodFields] : []),
      ...(req.user.role === 'admin' ? adminFields : []),
    ];
    for (const key of allowed) {
      if (!(key in req.body)) continue;
      if (key === 'profileImage') {
        const image = String(req.body[key] || '');
        if (image.startsWith('data:image/')) {
          if (image.length > 1400000) return res.status(400).json({ error: 'Profile photo is too large after compression. Choose a smaller image.' });
          const uploaded = await uploadProfileImageToCloudinary(image, req.user._id.toString());
          req.user.profileImage = uploaded.url;
          req.user.profileImagePublicId = uploaded.publicId;
        } else if (!image) {
          const oldPublicId = req.user.profileImagePublicId || (req.user.profileImage?.includes('res.cloudinary.com') ? `academic-helpdesk/profiles/${req.user._id}` : '');
          req.user.profileImage = '';
          req.user.profileImagePublicId = '';
          await req.user.save();
          if (oldPublicId) {
            try { await deleteCloudinaryImage(oldPublicId); }
            catch (error) { console.error('[cloudinary delete]', error.message); }
          }
          continue;
        } else if (/^https:\/\//i.test(image) && image === req.user.profileImage) {
          // Keep an existing Cloudinary URL without re-uploading it.
          req.user.profileImage = image;
        } else {
          return res.status(400).json({ error: 'Profile photos must be uploaded through the profile photo picker.' });
        }
      } else if (key === 'subjects') {
        req.user[key] = Array.isArray(req.body[key]) ? req.body[key].slice(0, 30).map(String) : String(req.body[key] || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 30);
      } else if (key === 'teachingExperienceYears') {
        req.user[key] = Math.max(0, Math.min(60, Number(req.body[key]) || 0));
      } else {
        req.user[key] = typeof req.body[key] === 'string' ? req.body[key].trim().slice(0, key === 'bio' ? 700 : 200) : req.body[key];
      }
    }
    await req.user.save();
    res.json({ user: req.user.toPublic() });
  })
);

router.post(
  '/auth/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Provide current and a new password (min 6 chars)' });
    }
    const user = await User.findById(req.user._id).select('+password');
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  })
);

/* ------------------------ NOTIFICATIONS ------------------------- */

router.get(
  '/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const unread = await Notification.countDocuments({ recipient: req.user._id, read: false });
    res.json({ items, unread });
  })
);

router.post(
  '/notifications/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateOne({ _id: req.params.id, recipient: req.user._id }, { read: true });
    res.json({ success: true });
  })
);

router.post(
  '/notifications/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  })
);

/* ------------------------ STUDENT PROFILE ----------------------- */

router.get(
  '/students/me/academics',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const me = req.user;
    const tickets = await Ticket.find({ student: me._id }).sort({ createdAt: -1 }).lean();
    const advisor = me.advisor ? await User.findById(me.advisor).select('name designation email').lean() : null;
    res.json({
      student: {
        name: me.name,
        rollNumber: me.rollNumber,
        department: me.department,
        year: me.year,
        semester: me.semester,
        section: me.section,
        cgpa: me.cgpa,
        attendance: me.attendance,
        email: me.email,
        phone: me.phone,
      },
      advisor,
      ticketCount: tickets.length,
      resolvedCount: tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
    });
  })
);

/* ------------------- PUBLIC INSTITUTIONAL APIS ------------------ */

router.get(
  '/departments',
  asyncHandler(async (_req, res) => {
    const list = await Department.find({ isActive: true }).populate('hod', 'name designation email').sort({ name: 1 }).lean();
    res.json({ departments: list });
  })
);

// Authenticated, role-scoped subject list used by the Knowledge Graph.
// Keep /subjects public for public curriculum pickers; do not use it for access control.
router.get(
  '/knowledge-graph/subjects',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;
    let filter = { isActive: true };

    if (user.role === 'student') {
      // A student only sees subjects for their own department and semester.
      if (!user.department || !Number.isFinite(Number(user.semester))) {
        return res.json({ subjects: [] });
      }
      filter.department = user.department;
      filter.semester = Number(user.semester);
    } else if (user.role === 'faculty') {
      // Use explicit Subject.facultyInCharge assignments where present, and
      // support existing faculty subject-speciality strings as a fallback.
      if (user.department) filter.department = user.department;
      const candidates = await Subject.find(filter).sort({ semester: 1, code: 1 }).lean();
      const assignedIds = new Set(candidates
        .filter((subject) => (subject.facultyInCharge || []).some((id) => String(id) === String(user._id)))
        .map((subject) => String(subject._id)));
      const specialities = (user.subjects || []).map((value) => String(value).trim().toLowerCase()).filter(Boolean);
      const assigned = candidates.filter((subject) => {
        if (assignedIds.has(String(subject._id))) return true;
        const title = String(subject.title || '').trim().toLowerCase();
        const code = String(subject.code || '').trim().toLowerCase();
        return specialities.some((speciality) => speciality === title || speciality === code);
      });
      return res.json({ subjects: assigned });
    } else if (user.role === 'hod') {
      const department = user.hodOf || user.department;
      if (!department) return res.json({ subjects: [] });
      filter.department = department;
    } else if (user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not allowed to view Knowledge Graph subjects.' });
    }

    const subjects = await Subject.find(filter).sort({ semester: 1, code: 1 }).lean();
    res.json({ subjects });
  })
);

router.get(
  '/subjects',
  asyncHandler(async (req, res) => {
    const { department, semester } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);
    const list = await Subject.find(filter).sort({ semester: 1, code: 1 }).lean();
    res.json({ subjects: list });
  })
);

router.get(
  '/announcements/public',
  asyncHandler(async (_req, res) => {
    const list = await Announcement.find({ isActive: true })
      .populate('author', 'name designation')
      .sort({ publishedAt: -1 })
      .limit(6)
      .lean();
    res.json({ announcements: list });
  })
);

router.get(
  '/resources/public',
  asyncHandler(async (req, res) => {
    const { department, subject, semester, type, q } = req.query;
    const filter = { isApproved: true, isPublic: true };
    if (department) filter.department = department;
    if (subject) filter.subject = subject;
    if (semester) filter.semester = Number(semester);
    if (type) filter.resourceType = type;
    if (q) filter.$text = { $search: q };

    const items = await Resource.find(filter)
      .populate('uploadedBy', 'name designation')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({ items });
  })
);

router.get(
  '/projects/public',
  asyncHandler(async (_req, res) => {
    const list = await Project.find({ status: { $in: ['in_progress', 'completed'] } })
      .populate('mentor', 'name designation')
      .populate('members.student', 'name rollNumber')
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();
    res.json({ projects: list });
  })
);

router.get(
  '/faculty/directory/public',
  asyncHandler(async (req, res) => {
    const { department = 'Computer Science and Engineering' } = req.query;
    const list = await User.find({
      role: { $in: ['faculty', 'hod'] },
      department,
      isActive: true,
    })
      .select('name designation qualification teachingExperienceYears phone email subjects level hodOf')
      .sort({ level: -1, teachingExperienceYears: -1 })
      .lean();
    res.json({ faculty: list });
  })
);

router.get(
  '/stats/public',
  asyncHandler(async (_req, res) => {
    const [departments, subjects, faculty, articles, resources, projects, resolvedTickets] = await Promise.all([
      Department.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['faculty', 'hod'] }, isActive: true }),
      KbArticle.countDocuments({ status: 'published' }),
      Resource.countDocuments({ isApproved: true }),
      Project.countDocuments(),
      Ticket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
    ]);

    res.json({
      departments,
      subjects,
      faculty,
      articles,
      resources,
      projects,
      resolvedTickets,
    });
  })
);

export default router;
