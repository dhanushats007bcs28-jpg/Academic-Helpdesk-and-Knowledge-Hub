import mongoose from 'mongoose';

/**
 * Ticket lifecycle:
 *  open -> assigned -> in_progress -> (waiting_student | escalated) -> resolved -> closed
 *
 * Escalation ladder (bottom-up):
 *  level 1 faculty -> level 2 senior faculty -> level 3 HOD
 */
const ticketSchema = new mongoose.Schema(
  {
    ticketCode: { type: String, required: true, unique: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    department: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'waiting_student', 'escalated', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },

    /* Assignment (bottom-up) */
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedAt: { type: Date },
    assignmentLevel: { type: Number, default: 0 }, // which rung of the ladder it sits on
    escalationHistory: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        level: Number,
        reason: String,
        at: { type: Date, default: Date.now },
      },
    ],

    /* SLA */
    slaHours: { type: Number, default: 24 },
    slaDueAt: { type: Date, index: true }, // 24 *working* hours from assignment/creation
    slaBreached: { type: Boolean, default: false },
    firstResponseAt: { type: Date },

    /* Knowledge-base NLP match recorded at creation time */
    kbMatches: [
      {
        article: { type: mongoose.Schema.Types.ObjectId, ref: 'KbArticle' },
        score: Number,
        title: String,
      },
    ],
    autoResolvedByKb: { type: Boolean, default: false },

    resolution: {
      summary: String,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: Date,
    },

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      at: Date,
    },

    /* NLP artefacts of the student query for analytics */
    queryTokens: { type: [String], default: [] },
    queryLemmas: { type: [String], default: [] },

    /* an answered-by-KB flag for analytics */
    resolvedFromKb: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ student: 1, status: 1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
