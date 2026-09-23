import { useEffect, useRef, useState } from 'react';
import { parseAiStatus, parseComparison, parseExplanation, rankSpecies } from '../lib/comparison';
import type { NetworkExplanation, ProteinComparisonData } from '../lib/comparison';
import './protein-comparison.css';

interface Props {
  apiBase: string | undefined;
  query: { pair: [string, string]; confidence: number; neighbors: number } | null;
  disabled: boolean;
}

async function boundedJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (body.length > 256_000) throw new Error('The response was too large. Please try again.');
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('The service returned an unreadable response. Please try again.');
  }
}

function failureMessage(status: number, explaining: boolean) {
  if (status === 429)
    return explaining
      ? 'The explanation limit has been reached. Please try again later.'
      : 'The comparison service is busy. Wait a minute, then try again.';
  if (status === 503 && explaining)
    return 'AI explanations are not available right now. The measured comparison is still available below.';
  if (status === 504) return 'The source took too long to respond. Please try again.';
  return explaining
    ? 'The explanation could not be generated. Please try again.'
    : 'Species data is temporarily unavailable. Please try again.';
}

function percent(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

const orthologyLabels = {
  ortholog_one2one: 'one-to-one',
  ortholog_one2many: 'one-to-many',
  ortholog_many2many: 'many-to-many',
};

export default function ProteinComparison({ apiBase, query, disabled }: Props) {
  const [protein, setProtein] = useState(query?.pair[0] ?? '');
  const [comparison, setComparison] = useState<ProteinComparisonData | null>(null);
  const [explanation, setExplanation] = useState<NetworkExplanation | null>(null);
  const [availability, setAvailability] = useState<'unknown' | 'enabled' | 'disabled' | 'error'>(
    'unknown',
  );
  const [phase, setPhase] = useState<'comparison' | 'explanation' | null>(null);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const unavailable = disabled || !query || !apiBase;

  function clearResults() {
    ++sequence.current;
    request.current?.abort();
    request.current = null;
    setComparison(null);
    setExplanation(null);
    setAvailability('unknown');
    setPhase(null);
    setError('');
  }

  useEffect(() => {
    if (disabled) clearResults();
    return () => {
      ++sequence.current;
      request.current?.abort();
    };
  }, [disabled]);

  async function compare() {
    if (unavailable || !apiBase || !query) return;
    clearResults();
    const current = ++sequence.current;
    const controller = new AbortController();
    request.current = controller;
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 40_000);
    setPhase('comparison');
    const stillCurrent = () => current === sequence.current && !controller.signal.aborted;
    const statusRequest = fetch(`${apiBase}/api/ai/status`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('AI status unavailable');
        const enabled = parseAiStatus(await boundedJson(response));
        if (stillCurrent()) setAvailability(enabled ? 'enabled' : 'disabled');
      })
      .catch(() => {
        if (stillCurrent()) setAvailability('error');
      });
    try {
      const params = new URLSearchParams({ protein });
      const response = await fetch(`${apiBase}/api/comparison?${params}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(failureMessage(response.status, false));
      const result = parseComparison(await boundedJson(response), protein);
      if (stillCurrent()) setComparison(result);
      await statusRequest;
    } catch (failure) {
      if (current !== sequence.current || (controller.signal.aborted && !timedOut)) return;
      setError(
        timedOut
          ? 'The species comparison timed out. Please try again.'
          : failure instanceof Error && failure.name !== 'TypeError'
            ? failure.message
            : 'Could not reach the comparison service. Please try again.',
      );
    } finally {
      controller.abort();
      window.clearTimeout(timer);
      if (current === sequence.current) {
        setPhase(null);
        request.current = null;
        setAvailability((previous) => (previous === 'unknown' ? 'error' : previous));
      }
    }
  }

  async function explain() {
    if (unavailable || !apiBase || !query || !comparison || availability !== 'enabled') return;
    const current = ++sequence.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 95_000);
    setPhase('explanation');
    setExplanation(null);
    setError('');
    try {
      const response = await fetch(`${apiBase}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proteins: query.pair.join(','),
          protein,
          confidence: query.confidence,
          neighbors: query.neighbors,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(failureMessage(response.status, true));
      const result = parseExplanation(await boundedJson(response));
      if (current === sequence.current && !controller.signal.aborted) setExplanation(result);
    } catch (failure) {
      if (current !== sequence.current || (controller.signal.aborted && !timedOut)) return;
      setError(
        timedOut
          ? 'The explanation timed out. Please try again.'
          : failure instanceof Error && failure.name !== 'TypeError'
            ? failure.message
            : 'Could not reach the explanation service. Please try again.',
      );
    } finally {
      window.clearTimeout(timer);
      if (current === sequence.current) {
        setPhase(null);
        request.current = null;
      }
    }
  }

  const rows = comparison ? rankSpecies(comparison) : [];
  const citations =
    explanation?.sources.filter((source) => explanation.citations.includes(source.id)) ?? [];

  return (
    <section className="protein-comparison" aria-labelledby="protein-comparison-heading">
      <div className="protein-comparison-intro">
        <div>
          <span className="protein-eyebrow">ACROSS SPECIES / SEQUENCE IDENTITY</span>
          <h3 id="protein-comparison-heading">Same protein. Different species.</h3>
          <p>
            Compare one human protein with its evolutionary counterparts in chimpanzee, mouse,
            zebrafish, and fruit fly.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void compare();
          }}
          className="protein-comparison-controls"
        >
          <div>
            <label htmlFor="comparison-protein">Human protein to compare</label>
            <select
              id="comparison-protein"
              value={protein}
              disabled={unavailable}
              onChange={(event) => {
                clearResults();
                setProtein(event.target.value);
              }}
            >
              {!query && <option value="">Waiting for network</option>}
              {query?.pair.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={unavailable || phase !== null}>
            Compare species
          </button>
        </form>
      </div>
      <p className="protein-comparison-status" role="status" aria-live="polite">
        {unavailable
          ? query
            ? 'Apply your network selection above to compare and explain this result.'
            : 'Load a human network above to begin.'
          : phase === 'comparison'
            ? `Retrieving ${protein} orthologues from Ensembl…`
            : phase === 'explanation'
              ? 'Writing an explanation from the source evidence…'
              : explanation
                ? `Explanation ready for ${query?.pair.join(' + ')} and the ${protein} species comparison.`
                : comparison
                  ? `${comparison.human.symbol} comparison ready. ${rows.filter((row) => row.best).length} of 4 species returned matches.`
                  : 'Fetches Ensembl release 112 (May 2024) on request. No comparison has loaded yet.'}
      </p>
      {error && (
        <p className="protein-comparison-error" role="alert">
          {error}
        </p>
      )}
      {comparison && !unavailable && (
        <div className="protein-comparison-results" aria-busy={phase !== null}>
          <div className="protein-comparison-metric">
            <h4>{comparison.human.symbol}: % of human protein identical</h4>
            <p>
              Each bar uses the highest identity returned for that species. The ranking covers these
              returned orthologues only.
            </p>
          </div>
          <ol className="protein-species-list" aria-label="Species sequence identity">
            {rows.map((animal) => (
              <li key={animal.species} className={animal.best ? 'is-matched' : 'is-missing'}>
                <div className="protein-species-label">
                  <strong>{animal.label}</strong>
                  <span>{animal.best ? percent(animal.best.humanIdentity) : '—'}</span>
                </div>
                {animal.best ? (
                  <>
                    <div
                      className="protein-identity-track"
                      role="meter"
                      aria-label={`${animal.label}: human sequence identity`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={animal.best.humanIdentity}
                      aria-valuetext={percent(animal.best.humanIdentity)}
                    >
                      <span style={{ width: `${animal.best.humanIdentity}%` }} />
                    </div>
                    {animal.highest && (
                      <span className="protein-highest-identity">
                        Highest identity among returned matches
                      </span>
                    )}
                    <details className="protein-orthologue-details">
                      <summary>
                        {animal.orthologues.length}{' '}
                        {animal.orthologues.length === 1 ? 'orthologue' : 'orthologues'} · sequence
                        details
                      </summary>
                      <ul>
                        {[...animal.orthologues]
                          .sort((a, b) => b.humanIdentity - a.humanIdentity)
                          .map((match) => (
                            <li key={match.proteinId}>
                              <a href={match.sourceUrl} target="_blank" rel="noreferrer">
                                {match.proteinId} ↗
                              </a>
                              <p>
                                Gene {match.geneId} · {orthologyLabels[match.type]}
                              </p>
                              <dl>
                                <div>
                                  <dt>Human identity</dt>
                                  <dd>{percent(match.humanIdentity)}</dd>
                                </div>
                                <div>
                                  <dt>Animal identity</dt>
                                  <dd>{percent(match.animalIdentity)}</dd>
                                </div>
                                <div>
                                  <dt>Human alignment coverage</dt>
                                  <dd>{percent(match.humanCoverage)}</dd>
                                </div>
                                <div>
                                  <dt>Sequence lengths</dt>
                                  <dd>
                                    {match.humanLength} human / {match.animalLength} animal amino
                                    acids
                                  </dd>
                                </div>
                              </dl>
                            </li>
                          ))}
                      </ul>
                    </details>
                  </>
                ) : (
                  <p>
                    {animal.status === 'not_found'
                      ? 'No orthologue returned in this release. This is not a 0% identity result.'
                      : 'This species could not be retrieved. Its identity is unknown.'}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <div className="protein-comparison-provenance">
            <p>
              <a href={comparison.source.url} target="_blank" rel="noreferrer">
                {comparison.source.name}
              </a>{' '}
              · Release 112, May 2024 archive · Retrieved{' '}
              {new Date(comparison.source.retrievedAt).toLocaleString()}
              {comparison.source.cached ? ' · cached response' : ''}.
            </p>
            {comparison.human.proteinId && (
              <p>
                Human reference: {comparison.human.proteinId} · {comparison.human.geneId}.
              </p>
            )}
            <p>
              Orthologues are genes related through speciation. Sequence identity is a measured
              similarity, not proof of identical function. Human and animal percentages use their
              respective sequence lengths. The network above contains human associations only.
            </p>
          </div>
          <div className="protein-explanation">
            <div className="protein-explanation-heading">
              <div>
                <span className="protein-eyebrow">AI / GROUNDED IN THE SOURCES</span>
                <h4>What does this tell us?</h4>
              </div>
              <button
                type="button"
                onClick={() => void explain()}
                disabled={phase !== null || availability !== 'enabled'}
              >
                Explain this network
              </button>
            </div>
            <p className="protein-ai-availability">
              {availability === 'enabled'
                ? 'An AI explanation connects the human network, measured similarities, and their limits. Generated only when you ask.'
                : availability === 'disabled'
                  ? 'AI explanations are not enabled yet. The species comparison above uses Ensembl data.'
                  : availability === 'error'
                    ? 'AI availability could not be checked. Select Compare species to try again.'
                    : 'Checking AI availability…'}
            </p>
            {explanation && (
              <div className="protein-explanation-copy">
                <p className="protein-explanation-overview">{explanation.overview}</p>
                <div className="protein-explanation-grid">
                  {(
                    [
                      ['The human network', 'network'],
                      ['Across species', 'comparison'],
                      ['Why it matters', 'significance'],
                      ['What this cannot establish', 'limitations'],
                    ] as const
                  ).map(([heading, key]) => (
                    <div key={key}>
                      <h5>{heading}</h5>
                      <p>{explanation[key]}</p>
                    </div>
                  ))}
                </div>
                <div className="protein-explanation-sources">
                  <span>Sources used</span>
                  <ul>
                    {citations.map((source) => (
                      <li key={source.id}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="protein-explanation-meta">
                  AI-generated · {explanation.model} ·{' '}
                  {new Date(explanation.generatedAt).toLocaleString()}
                  {explanation.cached ? ' · cached explanation' : ''}. Check the linked evidence; AI
                  explanations can contain mistakes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
