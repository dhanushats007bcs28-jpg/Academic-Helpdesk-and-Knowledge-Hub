import { STOPWORDS, lemmatize } from './stopwords.js';

/**
 * TEXT-ANALYTICS PIPELINE
 * ------------------------------------------------------------------
 *  raw text
 *    -> normalize (lowercase, strip punctuation/digits noise)
 *    -> tokenize (split on non-letters)
 *    -> stop-word removal
 *    -> lemmatization
 *    -> (optional) n-gram for bigrams
 *    -> TF / TF-IDF vectors
 *    -> cosine similarity for KB matching
 * ------------------------------------------------------------------
 */

/** 1. Normalize + tokenize + stopword removal + lemmatize. */
export function preprocess(text = '') {
  const normalized = String(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized
    .split(' ')
    .filter((t) => t.length > 1)
    .filter((t) => !STOPWORDS.has(t));

  const lemmas = tokens.map(lemmatize).filter((t) => t.length > 1 && !STOPWORDS.has(t));

  return { tokens, lemmas };
}

/** Bigram helper — useful signal for phrases like "password reset". */
export function bigrams(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length - 1; i++) out.push(`${tokens[i]}_${tokens[i + 1]}`);
  return out;
}

/** 2. Term frequency map from a list of terms. */
export function termFrequency(terms) {
  const tf = new Map();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
  const total = terms.length || 1;
  for (const [k, v] of tf) tf.set(k, v / total); // normalized TF
  return tf;
}

/** 3. Inverse document frequency across a document set. */
export function inverseDocumentFrequency(docs) {
  const idf = new Map();
  const N = docs.length || 1;
  const df = new Map();
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const term of seen) df.set(term, (df.get(term) || 0) + 1);
  }
  for (const [term, count] of df) idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  return idf;
}

/** 4. Build a TF-IDF weight vector for one document. */
export function tfidfVector(terms, idf) {
  const tf = termFrequency(terms);
  const vec = new Map();
  for (const [term, freq] of tf) {
    const weight = freq * (idf.get(term) ?? 1);
    vec.set(term, weight);
  }
  return vec;
}

/** 5. Cosine similarity between two sparse vectors. */
export function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const v of a.values()) magA += v * v;
  for (const v of b.values()) magB += v * v;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [term, val] of small) if (large.has(term)) dot += val * large.get(term);
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Keywords = highest-weighted terms, used for tagging tickets. */
export function keywords(lemmas, topN = 6) {
  const tf = termFrequency(lemmas);
  return [...tf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term);
}

/**
 * 6. KB MATCHER.
 * Compares a student query against all knowledge-base articles using
 * TF-IDF + cosine similarity and returns ranked matches above a floor.
 */
export function matchKnowledgeBase(queryText, articles, { threshold = 0.18, limit = 5 } = {}) {
  const queryLemmas = preprocess(queryText).lemmas;
  if (!queryLemmas.length || !articles.length) return [];

  // corpus = query + every KB article's searchable text
  const corpus = [queryLemmas];
  const articleTerms = articles.map((a) => {
    const text = [a.title, a.question, a.answer, (a.tags || []).join(' '), a.subject || '', a.category || ''].join(' ');
    const terms = preprocess(text).lemmas;
    corpus.push(terms);
    return { article: a, terms };
  });

  const idf = inverseDocumentFrequency(corpus);
  const queryVec = tfidfVector(queryLemmas, idf);

  const scored = articleTerms.map(({ article, terms }) => {
    const docVec = tfidfVector(terms, idf);
    const cosine = cosineSimilarity(queryVec, docVec);
    // exact term-overlap boost
    const qSet = new Set(queryLemmas);
    const matchedTerms = [...new Set(terms.filter((t) => qSet.has(t)))];
    const overlap = matchedTerms.length;
    const boost = Math.min(overlap / (queryLemmas.length || 1), 1) * 0.25;
    return { article, score: Math.min(cosine + boost, 1), overlap, cosine, boost, matchedTerms };
  });

  return scored
    .filter((s) => s.score >= threshold && s.overlap > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => {
      const confidence = s.score >= 0.55 ? 'high' : s.score >= 0.35 ? 'medium' : 'low';
      const termList = s.matchedTerms.slice(0, 4).join(', ');
      const explanation = `Matched ${s.matchedTerms.length} core technical terms (${termList}) in ${s.article.subject || s.article.category} with ${(s.score * 100).toFixed(1)}% TF-IDF cosine relevance.`;
      return {
        article: s.article._id,
        title: s.article.title,
        category: s.article.category,
        subject: s.article.subject,
        answer: s.article.answer,
        score: Number(s.score.toFixed(4)),
        confidence,
        matchedTerms: s.matchedTerms,
        explanation,
      };
    });
}

/** Category classifier — nearest category by TF-IDF among ticket history. */
export function suggestCategory(queryText, tickets) {
  const q = preprocess(queryText).lemmas;
  if (!q.length) return null;
  const byCategory = {};
  for (const t of tickets) {
    if (!t.category) continue;
    byCategory[t.category] = byCategory[t.category] || [];
    byCategory[t.category].push(...preprocess(`${t.subject} ${t.description}`).lemmas);
  }
  const cats = Object.keys(byCategory);
  if (!cats.length) return null;
  const idf = inverseDocumentFrequency([q, ...cats.map((c) => byCategory[c])]);
  const qv = tfidfVector(q, idf);
  let best = null;
  for (const c of cats) {
    const score = cosineSimilarity(qv, tfidfVector(byCategory[c], idf));
    if (!best || score > best.score) best = { category: c, score };
  }
  return best;
}

export { STOPWORDS, lemmatize };
