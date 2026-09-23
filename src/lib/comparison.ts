export const comparisonSpecies = [
  { species: 'pan_troglodytes', taxonId: 9598, label: 'Chimpanzee' },
  { species: 'mus_musculus', taxonId: 10090, label: 'Mouse' },
  { species: 'danio_rerio', taxonId: 7955, label: 'Zebrafish' },
  { species: 'drosophila_melanogaster', taxonId: 7227, label: 'Fruit fly' },
] as const;

export interface Orthologue {
  geneId: string;
  proteinId: string;
  type: 'ortholog_one2one' | 'ortholog_one2many' | 'ortholog_many2many';
  humanIdentity: number;
  animalIdentity: number;
  humanCoverage: number;
  humanLength: number;
  animalLength: number;
  sourceUrl: string;
}

export interface SpeciesMatch {
  species: string;
  taxonId: number;
  label: string;
  status: 'matched' | 'not_found' | 'unavailable';
  orthologues: Orthologue[];
}

export interface ProteinComparisonData {
  human: { symbol: string; geneId: string | null; proteinId: string | null };
  metric: 'human_sequence_identity';
  species: SpeciesMatch[];
  source: {
    name: string;
    release: 112;
    url: string;
    retrievedAt: string;
    cached: boolean;
  };
}

export interface ExplanationSource {
  id: string;
  title: string;
  url: string;
}

export interface NetworkExplanation {
  overview: string;
  network: string;
  comparison: string;
  significance: string;
  limitations: string;
  citations: string[];
  generatedAt: string;
  model: string;
  cached: boolean;
  sources: ExplanationSource[];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(value);
}

function percentage(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function length(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 100_000;
}

function timestamp(value: unknown): value is string {
  return text(value, 64) && Number.isFinite(Date.parse(value));
}

function sourceUrl(value: unknown, ensemblOnly = false): boolean {
  if (!text(value, 500)) return false;
  try {
    const url = new URL(value);
    const hosts = [
      'may2024.rest.ensembl.org',
      'may2024.archive.ensembl.org',
      'ensembl.org',
      'www.ensembl.org',
      'grch37.ensembl.org',
      ...(ensemblOnly ? [] : ['string-db.org', 'version-12-0.string-db.org']),
    ];
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      hosts.includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function parseComparison(value: unknown, expectedProtein: string): ProteinComparisonData {
  const invalid = () =>
    new Error('The service returned an unexpected species comparison. Please try again.');
  if (
    !record(value) ||
    !record(value.human) ||
    value.human.symbol !== expectedProtein ||
    (value.human.geneId !== null && !identifier(value.human.geneId)) ||
    (value.human.proteinId !== null && !identifier(value.human.proteinId)) ||
    value.metric !== 'human_sequence_identity' ||
    !Array.isArray(value.species) ||
    value.species.length !== comparisonSpecies.length ||
    !record(value.source) ||
    !text(value.source.name, 160) ||
    value.source.release !== 112 ||
    value.source.url !== 'https://may2024.rest.ensembl.org/' ||
    !timestamp(value.source.retrievedAt) ||
    typeof value.source.cached !== 'boolean'
  )
    throw invalid();

  const speciesSeen = new Set<string>();
  let humanLength: number | undefined;
  for (const item of value.species) {
    if (!record(item)) throw invalid();
    const definition = comparisonSpecies.find((animal) => animal.species === item.species);
    if (
      !definition ||
      speciesSeen.has(definition.species) ||
      item.taxonId !== definition.taxonId ||
      item.label !== definition.label ||
      !['matched', 'not_found', 'unavailable'].includes(String(item.status)) ||
      !Array.isArray(item.orthologues) ||
      item.orthologues.length > 32 ||
      (item.status === 'matched') !== item.orthologues.length > 0
    )
      throw invalid();
    speciesSeen.add(definition.species);
    const proteinsSeen = new Set<string>();
    for (const match of item.orthologues) {
      if (
        !record(match) ||
        !identifier(match.geneId) ||
        !identifier(match.proteinId) ||
        proteinsSeen.has(match.proteinId) ||
        !text(match.type, 80) ||
        !['ortholog_one2one', 'ortholog_one2many', 'ortholog_many2many'].includes(match.type) ||
        !percentage(match.humanIdentity) ||
        !percentage(match.animalIdentity) ||
        !percentage(match.humanCoverage) ||
        !length(match.humanLength) ||
        !length(match.animalLength) ||
        !sourceUrl(match.sourceUrl, true) ||
        !identifier(value.human.geneId) ||
        !identifier(value.human.proteinId) ||
        (humanLength !== undefined && match.humanLength !== humanLength)
      )
        throw invalid();
      proteinsSeen.add(match.proteinId);
      humanLength = match.humanLength;
    }
  }
  return value as unknown as ProteinComparisonData;
}

export function rankSpecies(comparison: ProteinComparisonData) {
  const rows = comparison.species.map((animal) => ({
    ...animal,
    best: [...animal.orthologues].sort((a, b) => b.humanIdentity - a.humanIdentity)[0] ?? null,
  }));
  rows.sort((a, b) => (b.best?.humanIdentity ?? -1) - (a.best?.humanIdentity ?? -1));
  const highest = rows[0]?.best?.humanIdentity;
  return rows.map((row) => ({
    ...row,
    highest: row.best !== null && row.best.humanIdentity === highest,
  }));
}

export function parseAiStatus(value: unknown): boolean {
  if (!record(value) || typeof value.enabled !== 'boolean') {
    throw new Error('AI availability could not be checked. Try comparing again.');
  }
  return value.enabled;
}

export function parseExplanation(value: unknown): NetworkExplanation {
  const invalid = () =>
    new Error('The service returned an incomplete explanation. Please try again.');
  if (
    !record(value) ||
    !['overview', 'network', 'comparison', 'significance', 'limitations'].every((key) =>
      text(value[key], 1200),
    ) ||
    !timestamp(value.generatedAt) ||
    !text(value.model, 80) ||
    typeof value.cached !== 'boolean' ||
    !Array.isArray(value.sources) ||
    value.sources.length === 0 ||
    value.sources.length > 8 ||
    !Array.isArray(value.citations) ||
    value.citations.length === 0 ||
    value.citations.length > 8
  )
    throw invalid();
  const sources = new Set<string>();
  for (const source of value.sources) {
    if (
      !record(source) ||
      !text(source.id, 80) ||
      !/^[a-zA-Z0-9_:-]+$/.test(source.id) ||
      sources.has(source.id) ||
      !text(source.title, 180) ||
      !sourceUrl(source.url)
    )
      throw invalid();
    sources.add(source.id);
  }
  if (
    new Set(value.citations).size !== value.citations.length ||
    value.citations.some((citation) => typeof citation !== 'string' || !sources.has(citation))
  )
    throw invalid();
  // A live response included this non-content formatting note despite the
  // prompt. Remove only that exact artifact; scientific text and citations stay
  // intact, including any other bracketed notation.
  const result = { ...value };
  for (const key of ['overview', 'network', 'comparison', 'significance', 'limitations']) {
    const cleaned = (result[key] as string).replaceAll('[No source IDs here]', '').trim();
    if (!cleaned) throw invalid();
    result[key] = cleaned;
  }
  return result as unknown as NetworkExplanation;
}
