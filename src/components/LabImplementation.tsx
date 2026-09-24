export default function LabImplementation() {
  return (
    <section className="lab-implementation" aria-labelledby="lab-implementation-title">
      <span className="protein-eyebrow">BEHIND THE BUILD</span>
      <h4 id="lab-implementation-title">From APIs to a working tool.</h4>
      <ol>
        <li>
          <strong>Connect the sources</strong>
          <p>
            My Python API connects STRING networks and Ensembl comparisons. React checks RCSB
            structure records; each result links to its source.
          </p>
        </li>
        <li>
          <strong>Make the data useful</strong>
          <p>
            pandas cleans connections; NetworkX finds repeatable communities. AI explains retrieved
            evidence with citations; sequence data determines similarity.
          </p>
        </li>
        <li>
          <strong>Handle the real conditions</strong>
          <p>
            Caching, request limits, timeouts, and recovery paths keep the workflow usable. Keys
            stay server-side. Browser and API tests cover success and failure.
          </p>
        </li>
      </ol>
      <a href="https://github.com/Jake-Costello/Personal-Website" target="_blank" rel="noreferrer">
        Explore the code & tests ↗
      </a>
    </section>
  );
}
