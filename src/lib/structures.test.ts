import test from 'node:test';
import assert from 'node:assert/strict';
import { proteinStructures } from '../data/proteins';
import {
  curatedStructure,
  fetchExperimentalStructure,
  parseExperimentalStructure,
} from './structures';

// Minimal RCSB-shaped test records; never used as application data.
function records(protein = 'TP53') {
  const target = proteinStructures[protein];
  return {
    entry: {
      rcsb_id: target.code,
      rcsb_entry_container_identifiers: {
        entry_id: target.code,
        polymer_entity_ids: [target.entity],
      },
      struct: { title: `${protein} experimental test structure` },
      exptl: [{ method: 'X-RAY DIFFRACTION' }],
      rcsb_entry_info: {
        structure_determination_methodology: 'experimental',
        resolution_combined: [2.2],
      },
    },
    entity: {
      rcsb_id: `${target.code}_${target.entity}`,
      rcsb_polymer_entity_container_identifiers: {
        entry_id: target.code,
        entity_id: target.entity,
        uniprot_ids: [target.uniprot],
      },
      entity_poly: { rcsb_entity_polymer_type: 'Protein' },
      rcsb_entity_source_organism: [{ ncbi_taxonomy_id: 9606 }],
    },
  };
}

test('valid experimental evidence retains its protein, method, entity and official source', () => {
  for (const protein of ['TP53', 'MDM2', 'BRCA2', 'RAD51']) {
    const { entry, entity } = records(protein);
    const evidence = parseExperimentalStructure(protein, entry, entity);
    assert.equal(evidence.protein, protein);
    assert.equal(evidence.entity, proteinStructures[protein].entity);
    assert.equal(evidence.uniprot, proteinStructures[protein].uniprot);
    assert.deepEqual(evidence.methods, ['X-RAY DIFFRACTION']);
    assert.equal(evidence.resolution, 2.2);
    assert.equal(
      evidence.sourceUrl,
      `https://www.rcsb.org/structure/${proteinStructures[protein].code}`,
    );
  }
});

test('computed models and missing experimental evidence are rejected', () => {
  const { entry, entity } = records();
  for (const invalid of [
    { ...entry, rcsb_id: 'AF_AFP04637F1' },
    { ...entry, exptl: undefined },
    { ...entry, exptl: [] },
    { ...entry, exptl: [{ method: 'THEORETICAL MODEL' }] },
    { ...entry, exptl: [{ method: 'X-RAY DIFFRACTION' }, { method: 'THEORETICAL MODEL' }] },
    { ...entry, rcsb_entry_info: { structure_determination_methodology: 'computational' } },
    { ...entry, rcsb_entry_info: { structure_determination_methodology: 'integrative' } },
    { ...entry, rcsb_entry_info: {} },
  ]) {
    assert.throws(() => parseExperimentalStructure('TP53', invalid, entity), /verifiable/);
  }
});

test('another protein, a nonhuman entity or the wrong polymer cannot pass identity checks', () => {
  const { entry, entity } = records();
  for (const invalid of [
    { ...entity, rcsb_id: '1TUP_1' },
    { ...entity, rcsb_entity_source_organism: [] },
    { ...entity, rcsb_entity_source_organism: [{ ncbi_taxonomy_id: 10090 }] },
    { ...entity, entity_poly: { rcsb_entity_polymer_type: 'DNA' } },
    {
      ...entity,
      rcsb_polymer_entity_container_identifiers: {
        ...entity.rcsb_polymer_entity_container_identifiers,
        uniprot_ids: ['Q00987'],
      },
    },
    {
      ...entity,
      rcsb_polymer_entity_container_identifiers: {
        ...entity.rcsb_polymer_entity_container_identifiers,
        entry_id: '1YCR',
      },
    },
    {
      ...entity,
      rcsb_polymer_entity_container_identifiers: {
        ...entity.rcsb_polymer_entity_container_identifiers,
        entity_id: '1',
      },
    },
  ]) {
    assert.throws(() => parseExperimentalStructure('TP53', entry, invalid), /verifiable/);
  }
  assert.throws(() => parseExperimentalStructure('MDM2', entry, entity), /verifiable/);
  assert.throws(
    () =>
      parseExperimentalStructure(
        'TP53',
        {
          ...entry,
          rcsb_entry_container_identifiers: { entry_id: '1TUP', polymer_entity_ids: ['1'] },
        },
        entity,
      ),
    /verifiable/,
  );
});

test('electron microscopy and NMR are experimental; resolution is optional', () => {
  const { entry, entity } = records('ATM');
  for (const method of ['ELECTRON MICROSCOPY', 'SOLUTION NMR']) {
    const result = parseExperimentalStructure(
      'ATM',
      {
        ...entry,
        exptl: [{ method }],
        rcsb_entry_info: { structure_determination_methodology: 'experimental' },
      },
      entity,
    );
    assert.deepEqual(result.methods, [method]);
    assert.equal(result.resolution, null);
  }
});

test('unknown symbols and malformed records fail closed', () => {
  for (const protein of [undefined, '', 'UNKNOWN', 'constructor', '__proto__']) {
    assert.equal(curatedStructure(protein), undefined);
  }
  for (const raw of [null, [], {}, 'structure']) {
    assert.throws(() => parseExperimentalStructure('TP53', raw, raw), /verifiable/);
  }
});

test('lookup retrieves both public records with the same abort signal and without credentials', async () => {
  const { entry, entity } = records();
  const controller = new AbortController();
  const urls: string[] = [];
  const request: typeof fetch = async (input, init) => {
    urls.push(String(input));
    assert.equal(init?.signal, controller.signal);
    assert.equal(init?.credentials, 'omit');
    return Response.json(String(input).includes('/polymer_entity/') ? entity : entry);
  };
  assert.equal(
    (await fetchExperimentalStructure('TP53', controller.signal, request)).protein,
    'TP53',
  );
  assert.deepEqual(urls.sort(), [
    'https://data.rcsb.org/rest/v1/core/entry/1TUP',
    'https://data.rcsb.org/rest/v1/core/polymer_entity/1TUP/3',
  ]);
});

test('HTTP errors including a missing curated record are unavailable, never absence or success', async () => {
  for (const status of [404, 429, 503]) {
    await assert.rejects(
      fetchExperimentalStructure(
        'TP53',
        new AbortController().signal,
        async () => new Response('', { status }),
      ),
      /temporarily unavailable.*No discovery was recorded/,
    );
  }
  await assert.rejects(
    fetchExperimentalStructure(
      'TP53',
      new AbortController().signal,
      async () => new Response('<html>upstream error</html>'),
    ),
    /verifiable/,
  );
});

test('aborted or stale fetches cannot return evidence even when a transport ignores cancellation', async () => {
  const { entry, entity } = records();
  const controller = new AbortController();
  const request: typeof fetch = async (input) => {
    controller.abort();
    return Response.json(String(input).includes('/polymer_entity/') ? entity : entry);
  };
  await assert.rejects(fetchExperimentalStructure('TP53', controller.signal, request), {
    name: 'AbortError',
  });
  let requested = false;
  await assert.rejects(
    fetchExperimentalStructure('TP53', controller.signal, async () => {
      requested = true;
      return Response.json(entry);
    }),
    { name: 'AbortError' },
  );
  assert.equal(requested, false);
});
