import { proteinStructures } from '../data/proteins';

const DATA_API = 'https://data.rcsb.org/rest/v1/core';
const verificationFailure =
  'RCSB did not return verifiable experimental evidence for this human protein. No discovery was recorded. Try again.';
const unavailableFailure =
  'RCSB structure data is temporarily unavailable. No discovery was recorded. Please try again.';

// PDB experimental methods, excluding computational and integrative models.
const experimentalMethods = new Set([
  'X-RAY DIFFRACTION',
  'SOLUTION NMR',
  'SOLID-STATE NMR',
  'ELECTRON MICROSCOPY',
  'ELECTRON CRYSTALLOGRAPHY',
  'NEUTRON DIFFRACTION',
  'FIBER DIFFRACTION',
  'POWDER DIFFRACTION',
]);

export interface ExperimentalStructureEvidence {
  protein: string;
  code: string;
  entity: string;
  uniprot: string;
  title: string;
  methods: string[];
  resolution: number | null;
  sourceUrl: string;
  retrievedAt: string;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function curatedStructure(protein: string | undefined) {
  return protein && Object.hasOwn(proteinStructures, protein)
    ? proteinStructures[protein]
    : undefined;
}

export function parseExperimentalStructure(
  protein: string,
  rawEntry: unknown,
  rawEntity: unknown,
): ExperimentalStructureEvidence {
  const target = curatedStructure(protein);
  if (!target) throw new Error(verificationFailure);
  const entry = object(rawEntry);
  const entity = object(rawEntity);
  const entryIds = object(entry.rcsb_entry_container_identifiers);
  const entityIds = object(entity.rcsb_polymer_entity_container_identifiers);
  const info = object(entry.rcsb_entry_info);
  const sources = entity.rcsb_entity_source_organism;
  const methods = Array.isArray(entry.exptl)
    ? entry.exptl.map((item: unknown) => object(item).method)
    : [];
  const title = object(entry.struct).title;
  if (
    entry.rcsb_id !== target.code ||
    entryIds.entry_id !== target.code ||
    !Array.isArray(entryIds.polymer_entity_ids) ||
    !entryIds.polymer_entity_ids.includes(target.entity) ||
    info.structure_determination_methodology !== 'experimental' ||
    !methods.length ||
    !methods.every(
      (method): method is string => typeof method === 'string' && experimentalMethods.has(method),
    ) ||
    entity.rcsb_id !== `${target.code}_${target.entity}` ||
    entityIds.entry_id !== target.code ||
    entityIds.entity_id !== target.entity ||
    !Array.isArray(entityIds.uniprot_ids) ||
    !entityIds.uniprot_ids.includes(target.uniprot) ||
    object(entity.entity_poly).rcsb_entity_polymer_type !== 'Protein' ||
    !Array.isArray(sources) ||
    !sources.length ||
    !sources.every((source: unknown) => object(source).ncbi_taxonomy_id === 9606) ||
    typeof title !== 'string' ||
    !title.trim() ||
    title.length > 2_000
  ) {
    throw new Error(verificationFailure);
  }
  const resolutions = Array.isArray(info.resolution_combined)
    ? info.resolution_combined.filter(
        (value: unknown): value is number =>
          typeof value === 'number' && Number.isFinite(value) && value > 0,
      )
    : [];
  return {
    protein,
    ...target,
    title: title.trim(),
    methods: [...new Set(methods)],
    resolution: resolutions.length ? Math.min(...resolutions) : null,
    sourceUrl: `https://www.rcsb.org/structure/${target.code}`,
    retrievedAt: new Date().toISOString(),
  };
}

async function readRecord(response: Response): Promise<unknown> {
  // 404 means this curated record is unavailable, not that the protein lacks a structure.
  if (!response.ok) throw new Error(unavailableFailure);
  const body = await response.text();
  if (body.length > 1_000_000) throw new Error(verificationFailure);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(verificationFailure);
  }
}

export async function fetchExperimentalStructure(
  protein: string,
  signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<ExperimentalStructureEvidence> {
  const target = curatedStructure(protein);
  if (!target) throw new Error(verificationFailure);
  signal.throwIfAborted();
  const [entry, entity] = await Promise.all([
    request(`${DATA_API}/entry/${target.code}`, { signal, credentials: 'omit' }).then(readRecord),
    request(`${DATA_API}/polymer_entity/${target.code}/${target.entity}`, {
      signal,
      credentials: 'omit',
    }).then(readRecord),
  ]);
  signal.throwIfAborted();
  return parseExperimentalStructure(protein, entry, entity);
}
