export const communityColors = ['#dfff7f', '#f399bf', '#b9e5ee', '#f7bc71', '#cfb5f0'];

export interface CuratedProteinStructure {
  code: string;
  entity: string;
  uniprot: string;
}

// Starting points, not proof of a discovery. Each inspection validates the live
// RCSB entry's experimental method and the human polymer entity's UniProt ID.
// Verified against https://data.rcsb.org/rest/v1/core/{entry,polymer_entity}
// on 2026-09-24. These entries can contain fragments, domains, or mutations.
export const proteinStructures: Readonly<Record<string, CuratedProteinStructure>> = {
  TP53: { code: '1TUP', entity: '3', uniprot: 'P04637' },
  CDK2: { code: '1HCK', entity: '1', uniprot: 'P24941' },
  BRCA1: { code: '1T15', entity: '1', uniprot: 'P38398' },
  BRCA2: { code: '1N0W', entity: '2', uniprot: 'P51587' },
  MDM2: { code: '1YCR', entity: '1', uniprot: 'Q00987' },
  ATM: { code: '5NP0', entity: '1', uniprot: 'Q13315' },
  CHEK2: { code: '2CN5', entity: '1', uniprot: 'O96017' },
  RAD51: { code: '1N0W', entity: '1', uniprot: 'Q06609' },
  PALB2: { code: '2W18', entity: '1', uniprot: 'Q86YC2' },
  EGFR: { code: '1M17', entity: '1', uniprot: 'P00533' },
  AKT1: { code: '3O96', entity: '1', uniprot: 'P31749' },
  MTOR: { code: '4JSV', entity: '1', uniprot: 'P42345' },
};
