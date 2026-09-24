import { useLayoutEffect, useRef, useState } from 'react';
import { recordProteinDiscovery, useAchievements } from '../lib/achievements';
import { curatedStructure, fetchExperimentalStructure } from '../lib/structures';
import type { ExperimentalStructureEvidence } from '../lib/structures';
import './experimental-structure.css';

interface Props {
  protein: string | undefined;
  disabled: boolean;
}

export default function ExperimentalStructure({ protein, disabled }: Props) {
  const achievements = useAchievements();
  const [evidence, setEvidence] = useState<ExperimentalStructureEvidence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const target = curatedStructure(protein);

  // Invalidate synchronously at commit, before a previous request can resolve for
  // a newly selected protein, a pending network change, or an unmounted panel.
  useLayoutEffect(() => {
    sequence.current += 1;
    active.current?.abort();
    active.current = null;
    setEvidence(null);
    setLoading(false);
    setError('');
    return () => {
      sequence.current += 1;
      active.current?.abort();
      active.current = null;
    };
  }, [protein, disabled]);

  async function inspect() {
    if (!protein || !target || disabled || active.current) return;
    const inspectedProtein = protein;
    const requestId = ++sequence.current;
    const controller = new AbortController();
    active.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    setLoading(true);
    setError('');
    setEvidence(null);
    try {
      const result = await fetchExperimentalStructure(inspectedProtein, controller.signal);
      if (requestId !== sequence.current || controller.signal.aborted) return;
      setEvidence(result);
      recordProteinDiscovery(result.protein);
    } catch (failure) {
      if (requestId !== sequence.current || (controller.signal.aborted && !timedOut)) return;
      setError(
        timedOut
          ? 'RCSB took too long to respond. No discovery was recorded. Please try again.'
          : failure instanceof Error && failure.name !== 'TypeError'
            ? failure.message
            : 'Could not reach RCSB. No discovery was recorded. Check your connection and try again.',
      );
    } finally {
      window.clearTimeout(timeout);
      if (requestId === sequence.current) {
        active.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <div className="experimental-structure" aria-busy={loading}>
      <h5>Experimental structure</h5>
      <div className="structure-challenge">
        <strong>
          Structure explorer · {Math.min(2, achievements.discoveredProteins.length)}/2
        </strong>
        <p>
          {achievements.stripedBallUnlocked
            ? 'Striped golf ball unlocked.'
            : 'Inspect two different proteins to unlock the striped golf ball.'}
        </p>
        {protein && achievements.discoveredProteins.includes(protein) && (
          <span>{protein} already counted.</span>
        )}
      </div>
      {!protein ? (
        <p>Select a protein to inspect its structural evidence.</p>
      ) : !target ? (
        <p>
          No curated example is available for {protein} here. This does not mean no experimental
          structure exists.
        </p>
      ) : (
        <>
          <p>Inspect a human {protein} structure from RCSB PDB.</p>
          <button
            type="button"
            className="structure-inspect"
            onClick={() => void inspect()}
            disabled={disabled || loading}
          >
            {loading
              ? 'Checking RCSB…'
              : error
                ? 'Retry structure lookup'
                : evidence
                  ? 'Inspect structure again'
                  : 'Inspect experimental structure'}
          </button>
          {disabled && <p>Explore the updated network to inspect this protein.</p>}
          {error && <p role="alert">{error}</p>}
          <div className="structure-results" aria-live="polite">
            {evidence?.protein === protein && (
              <div className="structure-evidence">
                <span className="structure-verified">Experimental evidence verified</span>
                <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">
                  View {evidence.code} at RCSB PDB <span aria-hidden="true">↗</span>
                </a>
                <p className="structure-title">{evidence.title}</p>
                <dl>
                  <div>
                    <dt>Method</dt>
                    <dd>{evidence.methods.join(' · ')}</dd>
                  </div>
                  {evidence.resolution !== null && (
                    <div>
                      <dt>Resolution</dt>
                      <dd>{evidence.resolution} Å</dd>
                    </div>
                  )}
                  <div>
                    <dt>Human protein</dt>
                    <dd>
                      {evidence.protein} · {evidence.uniprot}
                    </dd>
                  </div>
                </dl>
                <p>
                  This entry may cover a domain or fragment and may include mutations; it need not
                  show the whole protein.
                </p>
                <small>
                  Source: RCSB PDB · entity {evidence.entity} · checked{' '}
                  {new Date(evidence.retrievedAt).toLocaleString()}.
                </small>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
