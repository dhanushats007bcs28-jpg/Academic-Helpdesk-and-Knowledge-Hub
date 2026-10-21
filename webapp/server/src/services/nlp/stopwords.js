/**
 * English stop-word list used before tokenization-based matching.
 * Kept local (no network / native deps) so the pipeline is deterministic
 * and runs inside the plain Node runtime.
 */
export const STOPWORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are','aren',
  'as','at','be','because','been','before','being','below','between','both','but','by',
  'can','cannot','could','couldn','did','didn','do','does','doesn','doing','don','down',
  'during','each','few','for','from','further','had','hadn','has','hasn','have','haven',
  'having','he','her','here','hers','herself','him','himself','his','how','i','if','in',
  'into','is','isn','it','its','itself','just','me','more','most','my','myself','no','nor',
  'not','now','of','off','on','once','only','or','other','ought','our','ours','ourselves',
  'out','over','own','same','shan','she','should','shouldn','so','some','such','than',
  'that','the','their','theirs','them','themselves','then','there','these','they','this',
  'those','through','to','too','under','until','up','very','was','wasn','we','were','weren',
  'what','when','where','which','while','who','whom','why','will','with','won','would',
  'wouldn','you','your','yours','yourself','yourselves','please','kindly','sir','madam',
  'help','need','want','hello','hi','hey','thanks','thank','shall','may','might','also',
  'get','got','give','given','make','made','let','us','ok','okay','plz','pls','the',
]);

/**
 * Lightweight rule-based lemmatizer.
 * Reduces common inflectional suffixes to a base form so that
 * "normalizations", "normalizing", "normalized" all map to "normaliz"-family.
 * (A Porter-stemmer-style reducer — good enough for query<->KB matching and
 * dependency-free, which matters for a portable MERN bundle.)
 */
export function lemmatize(word) {
  let w = word.toLowerCase();
  if (w.length <= 3) return w;

  // irregulars commonly seen in an academic helpdesk corpus
  const irregulars = {
    assignments: 'assignment',
    studies: 'study',
    studies_: 'study',
    analyses: 'analysis',
    courses: 'course',
    classes: 'class',
    marks: 'mark',
    formulae: 'formula',
    criteria: 'criterion',
    syllabi: 'syllabus',
    theses: 'thesis',
    indices: 'index',
    matrices: 'matrix',
  };
  if (irregulars[w]) return irregulars[w];

  // plural / third-person
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes') || w.endsWith('zes')) return w.slice(0, -2);
  if (w.endsWith('ss')) return w;
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);

  // gerund / continuous
  if (w.endsWith('ing') && w.length > 5) {
    const stem = w.slice(0, -3);
    if (/([bdfghklmnprt])\1$/.test(stem)) return stem.slice(0, -1);
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(stem)) return stem + 'e';
    return stem;
  }

  // past tense
  if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ed') && w.length > 4) {
    const stem = w.slice(0, -2);
    if (/([bdfghklmnprt])\1$/.test(stem)) return stem.slice(0, -1);
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(stem)) return stem + 'e';
    return stem;
  }

  // adverbs
  if (w.endsWith('ly') && w.length > 4) return w.slice(0, -2);

  return w;
}
