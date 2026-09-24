export default function LabImplementation() {
  return (
    <section className="lab-implementation" aria-labelledby="lab-implementation-title">
      <span className="protein-eyebrow">BEHIND THE BUILD</span>
      <h4 id="lab-implementation-title">From APIs to a working tool.</h4>
      <ol>
        <li>
          <strong>Connect the sources</strong>
          <p>
            I built a Python API for STRING networks and Ensembl comparisons. The React interface
            checks experimental structure records directly with RCSB and links results to their
            sources.
          </p>
        </li>
        <li>
          <strong>Make the data useful</strong>
          <p>
            pandas cleans the connections; NetworkX finds repeatable communities. AI explains
            retrieved evidence with citations. Sequence data determines similarity scores.
          </p>
        </li>
        <li>
          <strong>Handle the real conditions</strong>
          <p>
            I added caching, request limits, timeouts, and clear recovery paths. Keys stay on the
            server; empty results remain visible. Browser and API tests cover the workflow.
          </p>
        </li>
      </ol>
      <a href="https://github.com/Jake-Costello/Personal-Website" target="_blank" rel="noreferrer">
        Explore the code & tests ↗
      </a>
    </section>
  );
}
