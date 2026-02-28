/**
 * Subject Classification Utility
 * Classifies educational questions into subject categories
 */

export type Subject = 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology' | 'History' | 'Computer Science' | 'General Science'

interface ClassificationResult {
  subject: Subject
  confidence: number
}

// Keywords for each subject
const SUBJECT_KEYWORDS: Record<Subject, string[]> = {
  Mathematics: [
    // Basic operations
    'solve', 'equation', 'calculate', 'compute', 'find', 'determine',
    // Algebra
    'algebra', 'polynomial', 'quadratic', 'linear', 'variable', 'coefficient',
    'factor', 'expand', 'simplify', 'expression', 'term', 'constant',
    // Geometry
    'geometry', 'triangle', 'circle', 'square', 'rectangle', 'polygon',
    'angle', 'degree', 'radius', 'diameter', 'area', 'perimeter', 'volume',
    'hypotenuse', 'perpendicular', 'parallel', 'congruent', 'similar',
    // Trigonometry
    'trigonometry', 'sin', 'cos', 'tan', 'sine', 'cosine', 'tangent',
    'sec', 'csc', 'cot', 'radian',
    // Calculus
    'calculus', 'derivative', 'integral', 'limit', 'differentiate', 'integrate',
    'slope', 'tangent line', 'rate of change', 'optimization',
    // Advanced
    'matrix', 'vector', 'determinant', 'eigenvalue', 'logarithm', 'exponential',
    'function', 'graph', 'domain', 'range', 'theorem', 'proof',
    'fraction', 'decimal', 'percentage', 'ratio', 'proportion',
    'probability', 'statistics', 'mean', 'median', 'mode', 'variance',
    // Symbols
    'x', 'y', 'z', '=', '+', '-', '×', '÷', '^'
  ],
  Physics: [
    'physics', 'force', 'velocity', 'acceleration', 'momentum', 'energy',
    'power', 'work', 'motion', 'gravity', 'friction', 'pressure', 'density',
    'mass', 'weight', 'speed', 'distance', 'displacement', 'time',
    'newton', 'joule', 'watt', 'meter', 'kilogram', 'second',
    'electric', 'magnetic', 'circuit', 'current', 'voltage', 'resistance',
    'capacitor', 'inductor', 'charge', 'field', 'potential',
    'wave', 'frequency', 'wavelength', 'amplitude', 'oscillation',
    'optics', 'lens', 'mirror', 'refraction', 'reflection', 'light',
    'thermodynamics', 'heat', 'temperature', 'entropy', 'kinetic', 'potential energy',
    'mechanics', 'dynamics', 'kinematics', 'projectile', 'collision',
    // Rotational Mechanics (Added)
    'torque', 'inertia', 'rotational', 'angular', 'moment', 'disc', 'sphere',
    'cylinder', 'axis', 'rotation', 'radius', 'diameter', 'angular velocity',
    // Modern Physics
    'quantum', 'relativity', 'photon', 'electron', 'nucleus', 'atomic',
    'radioactive', 'decay', 'fusion', 'fission', 'particle'
  ],
  Chemistry: [
    'chemistry', 'atom', 'molecule', 'element', 'compound', 'reaction',
    'chemical', 'bond', 'ionic', 'covalent', 'metallic',
    'acid', 'base', 'pH', 'neutral', 'salt',
    'oxidation', 'reduction', 'redox', 'catalyst', 'equilibrium',
    'mole', 'molarity', 'molality', 'concentration', 'solution', 'solvent', 'solute',
    'periodic', 'table', 'electron', 'proton', 'neutron', 'nucleus',
    'isotope', 'ion', 'valence', 'orbital',
    'organic', 'inorganic', 'hydrocarbon', 'polymer', 'synthesis',
    'alkane', 'alkene', 'alkyne', 'benzene', 'functional group',
    'stoichiometry', 'titration', 'precipitation', 'combustion',
    'thermodynamics', 'enthalpy', 'entropy', 'kinetics', 'rate law'
  ],
  Biology: [
    'biology', 'cell', 'organism', 'tissue', 'organ', 'system',
    'DNA', 'RNA', 'gene', 'chromosome', 'genome', 'allele',
    'protein', 'enzyme', 'amino acid', 'nucleotide',
    'photosynthesis', 'respiration', 'cellular', 'mitochondria', 'chloroplast',
    'evolution', 'natural selection', 'adaptation', 'species', 'taxonomy',
    'ecosystem', 'habitat', 'population', 'community', 'biodiversity',
    'mitosis', 'meiosis', 'cell division', 'reproduction',
    'bacteria', 'virus', 'fungi', 'archaea', 'prokaryote', 'eukaryote',
    'plant', 'animal', 'human', 'anatomy', 'physiology',
    'genetics', 'heredity', 'mutation', 'ecology', 'biome',
    'nervous', 'digestive', 'circulatory', 'immune', 'endocrine'
  ],
  History: [
    'history', 'war', 'battle', 'empire', 'kingdom', 'revolution',
    'independence', 'treaty', 'constitution', 'president', 'king', 'queen',
    'dynasty', 'civilization', 'ancient', 'medieval', 'modern', 'contemporary',
    'century', 'era', 'period', 'age', 'epoch',
    'colonization', 'imperialism', 'freedom', 'movement', 'leader',
    'event', 'timeline', 'historical', 'reign', 'conquest', 'reform',
    'renaissance', 'enlightenment', 'industrial revolution',
    'world war', 'cold war', 'democracy', 'monarchy', 'republic',
    'culture', 'society', 'trade', 'economy', 'religion'
  ],
  'Computer Science': [
    'algorithm', 'complexity', 'P', 'NP', 'NP-hard', 'NP-complete',
    'polynomial time', 'exponential time', 'big O', 'big omega', 'big theta',
    'reduction', 'decidable', 'undecidable', 'turing machine',
    'data structure', 'array', 'linked list', 'tree', 'graph', 'hash table',
    'sorting', 'searching', 'recursion', 'dynamic programming',
    'greedy', 'divide and conquer', 'backtracking',
    'programming', 'code', 'function', 'loop', 'variable',
    'database', 'SQL', 'network', 'security', 'encryption',
    'web', 'app', 'frontend', 'backend', 'api', 'server'
  ],
  'General Science': []
}

/**
 * Classify a question into a subject category
 */
export function classifySubject(question: string): ClassificationResult {
  const normalizedQuestion = question.toLowerCase()
  const scores: Record<Subject, number> = {
    Mathematics: 0,
    Physics: 0,
    Chemistry: 0,
    Biology: 0,
    History: 0,
    'Computer Science': 0,
    'General Science': 0
  }

  // Count keyword matches for each subject
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const keyword of keywords) {
      // Check if keyword is only word characters (letters, numbers, underscores)
      // If it has symbols (like +, -, ^), regex word boundaries \b might fail or act unexpectedly
      const isWord = /^\w+$/.test(keyword)

      if (isWord) {
        // Use regex for whole word matching to avoid false positives (e.g. "his" in "history")
        const regex = new RegExp(`\\b${keyword}\\b`, 'i')
        if (regex.test(normalizedQuestion)) {
          scores[subject as Subject]++
        }
      } else {
        // For symbols or non-word keywords, just check inclusion directly
        // No regex needed, or just simple includes
        if (normalizedQuestion.includes(keyword.toLowerCase())) {
          scores[subject as Subject]++
        }
      }
    }
  }

  // Special pattern detection for Mathematics
  // Check for mathematical patterns: equations, numbers with operators, etc.
  const mathPatterns = [
    /\d+\s*[\+\-\*\/\^=]\s*\d+/,  // Numbers with operators: 2+3, x-5, etc.
    /[a-z]\s*[\+\-\*\/\^=]\s*\d+/, // Variables with numbers: x+5, a-3
    /\d+\s*[a-z]/,                 // Numbers with variables: 2x, 3y
    /\([^\)]*[\+\-\*\/\^][^\)]*\)/, // Expressions in parentheses
    /\b(solve|simplify|calculate|find|determine)\b.*\d/, // Math action words with numbers
    /\b(equation|expression|formula|polynomial)\b/,      // Math-specific terms
  ]

  let hasMathPattern = false
  for (const pattern of mathPatterns) {
    if (pattern.test(normalizedQuestion)) {
      hasMathPattern = true
      break
    }
  }

  // Find subject with highest score
  let maxScore = 0
  let detectedSubject: Subject = 'General Science' // Default to General Science if completely uncertain

  for (const [subject, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedSubject = subject as Subject
    }
  }

  // Mathematics Bias Adjustment:
  // Only apply math bias if NO other subject has a strong score OR if Math score is already competitive.
  // We verified that "radius", "mass" etc should boost Physics/Chemistry/Bio too.

  if (hasMathPattern) {
    // If we detected a math pattern, but another subject (like Physics) has a high score,
    // it's likely a numerical problem in that subject (e.g. Physics problem).
    // So we DON'T blindly force Mathematics.
    // We only boost Math if it's the dominant trait or ambiguous.

    if (detectedSubject !== 'Mathematics' && maxScore > 1) {
      // Strong signal for another subject (e.g. Physics), keep it.
      // E.g. "Calculate the force..." -> Math pattern (calculate) but 'force' is Physics.
    } else {
      // Weak signal for others, boost Math.
      scores.Mathematics += 2
    }
  }

  // Recalculate max after potential boost
  for (const [subject, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedSubject = subject as Subject
    }
  }

  // If absolute ties or zero, fallback logic
  if (maxScore === 0) {
    if (hasMathPattern) detectedSubject = 'Mathematics'
    else detectedSubject = 'General Science'
  }

  // Calculate confidence (0-1)
  const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0)
  const confidence = totalMatches > 0 ? maxScore / totalMatches : 0.5

  return {
    subject: detectedSubject,
    confidence
  }
}

/**
 * Get subject-specific prompt instructions
 */
export function getSubjectPrompt(subject: Subject): string {
  const prompts: Record<Subject, string> = {
    Mathematics: `
For mathematical questions:
- Show all algebraic steps clearly
- Use proper mathematical notation
- Verify the solution when applicable
- Explain the mathematical principle used
`,
    Physics: `
For physics questions:
- First state the relevant law or principle
- Show all calculations with units
- Draw diagrams in text if helpful
- Explain the physical concept
`,
    Chemistry: `
For chemistry questions:
- Write balanced chemical equations
- Show electron configurations if relevant
- Explain the chemical principle
- Include safety notes if applicable
`,
    Biology: `
For biology questions:
- Provide clear definitions
- Use proper scientific terminology
- Explain biological processes step-by-step
- Include examples when helpful
`,
    History: `
For history questions:
- Provide factual, chronological information
- Include key dates and figures
- Explain cause and effect relationships
- Provide historical context
`,
    'Computer Science': `
For computer science questions:
- State the problem type clearly (decision, optimization, etc.)
- Identify the complexity class if applicable
- Explain algorithms step-by-step
- Show time and space complexity analysis
`,
    'General Science': `
For general science questions:
- Provide clear, accurate information
- Use simple language
- Include relevant examples
- Explain underlying concepts
`
  }

  return prompts[subject]
}
