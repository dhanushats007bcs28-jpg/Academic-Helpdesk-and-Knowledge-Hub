import mongoose from 'mongoose';

/**
 * A knowledge-base article. Each article stores a bag of NLP terms
 * (tokens + lemmas) so the text-analytics matcher can do fast
 * TF-IDF / cosine similarity against a student query.
 */
const kbArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    question: { type: String, required: true }, // canonical question / phrasing
    answer: { type: String, required: true }, // resolved answer body
    category: { type: String, required: true, index: true },
    department: { type: String, default: 'Common' },
    subject: { type: String, default: '' },
    tags: [{ type: String }],

    /* NLP pre-processing artifacts */
    tokenized: { type: [String], default: [] },
    lemmas: { type: [String], default: [] },
    termFreq: { type: Map, of: Number, default: {} },

    views: { type: Number, default: 0 },
    helpful: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, enum: ['seed', 'faculty', 'admin'], default: 'seed' },
  },
  { timestamps: true }
);

kbArticleSchema.index({ title: 'text', question: 'text', answer: 'text', tags: 'text' });

export const KbArticle = mongoose.model('KbArticle', kbArticleSchema);
