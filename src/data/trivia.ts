export interface BioinformaticsQuestion {
  topic: string;
  prompt: string;
  choices: [string, string, string, string];
  correct: number; // Zero-based index into choices.
  explanation: string;
  source: { label: string; url: string };
}

// One question per club, in bag order. Keep prompts short for the seven-second round.
export const bioinformaticsQuestions: BioinformaticsQuestion[] = [
  {
    topic: 'The genetic code',
    prompt: 'How many nucleotides make up one codon?',
    choices: ['Two', 'Three', 'Four', 'Six'],
    correct: 1,
    explanation:
      'A codon contains three nucleotides. In translation, a codon specifies an amino acid or a stop signal.',
    source: { label: 'NHGRI · Codon', url: 'https://www.genome.gov/genetics-glossary/Codon' },
  },
  {
    topic: 'DNA and RNA',
    prompt: 'Which base replaces thymine in RNA?',
    choices: ['Adenine', 'Guanine', 'Cytosine', 'Uracil'],
    correct: 3,
    explanation: 'RNA uses uracil (U) in place of the thymine (T) found in DNA.',
    source: {
      label: 'NHGRI · Nucleotide',
      url: 'https://www.genome.gov/genetics-glossary/Nucleotide',
    },
  },
  {
    topic: 'Protein networks',
    prompt: 'A STRING network edge represents what?',
    choices: ['A protein association', 'A DNA sequence', 'A golf score', 'A 3D coordinate'],
    correct: 0,
    explanation:
      'STRING includes direct physical and indirect functional associations. An edge does not necessarily mean two proteins bind directly.',
    source: { label: 'STRING · About', url: 'https://www.string-db.org/cgi/about' },
  },
  {
    topic: 'Experimental structures',
    prompt: 'Which method can measure a protein structure experimentally?',
    choices: ['A text summary', 'A network layout', 'X-ray diffraction', 'A predicted model alone'],
    correct: 2,
    explanation:
      'X-ray diffraction uses experimental measurements. The human p53–DNA structure 1TUP is one example in RCSB PDB.',
    source: { label: 'RCSB PDB · 1TUP', url: 'https://www.rcsb.org/structure/1TUP' },
  },
  {
    topic: 'Bioinformatics',
    prompt: 'Bioinformatics uses computing to study what?',
    choices: ['Only weather', 'Biological data', 'Only finances', 'Only maps'],
    correct: 1,
    explanation:
      'Bioinformatics uses computational methods to collect, store, analyze, and share biological information, including DNA and protein sequences.',
    source: {
      label: 'NHGRI · Bioinformatics',
      url: 'https://www.genome.gov/genetics-glossary/Bioinformatics',
    },
  },
  {
    topic: 'Making proteins',
    prompt: 'Which cellular structure builds proteins?',
    choices: ['A chromosome', 'A nucleotide', 'A codon', 'A ribosome'],
    correct: 3,
    explanation: 'Ribosomes read messenger RNA and assemble amino acids into proteins.',
    source: { label: 'NHGRI · Ribosome', url: 'https://www.genome.gov/genetics-glossary/Ribosome' },
  },
];
