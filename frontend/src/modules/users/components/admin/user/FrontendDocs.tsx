import { useEffect, useMemo, useState } from 'react';

type FrontendDocEntry = {
  id: string;
  title: string;
  description: string;
  file: string;
};

const DOCS: FrontendDocEntry[] = [
  { id: 'readme', title: 'Documentation Index', description: 'High-level overview and links to all engineering docs.', file: 'README.md' },
  { id: 'architecture', title: 'Architecture', description: 'System boundaries, modules and integration flow.', file: 'architecture.md' },
  { id: 'frontend', title: 'Frontend Standards', description: 'Frontend coding conventions and implementation standards.', file: 'frontend-standards.md' },
  { id: 'backend', title: 'Backend Standards', description: 'Backend conventions, layering, and service standards.', file: 'backend-standards.md' },
  { id: 'api', title: 'API Contract Guidelines', description: 'Request/response standards and contract rules.', file: 'api-contract-guidelines.md' },
  { id: 'security', title: 'Security & Access', description: 'Security controls, access model and deployment safeguards.', file: 'security-and-access.md' },
  { id: 'testing', title: 'Testing & QA', description: 'Testing checklist and release quality gates.', file: 'testing-and-qa.md' },
  { id: 'release', title: 'Release Process', description: 'Versioning and release checklist for production rollout.', file: 'release-process.md' },
];

export const FrontendDocs = () => {
  const [search, setSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>(DOCS[0].id);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredDocs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return DOCS;
    return DOCS.filter((doc) => doc.title.toLowerCase().includes(term) || doc.description.toLowerCase().includes(term) || doc.file.toLowerCase().includes(term));
  }, [search]);

  const selectedDoc = useMemo(() => DOCS.find((doc) => doc.id === selectedDocId) || DOCS[0], [selectedDocId]);

  useEffect(() => {
    const controller = new AbortController();

    const loadDoc = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/docs/${selectedDoc.file}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Unable to load document');
        }
        const markdown = await response.text();
        setContent(markdown);
      } catch (fetchError: any) {
        if (fetchError?.name !== 'AbortError') {
          setError(fetchError?.message || 'Failed to fetch documentation content');
          setContent('');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDoc();
    return () => controller.abort();
  }, [selectedDoc.file]);

  return (
    <div className="content-body user-list-page">
      <div className="container-fluid">
        <div className="row page-titles mx-0 mb-3">
          <div className="col-sm-12 p-md-0">
            <div className="welcome-text">
              <h4 className="mb-1">Frontend Documentation</h4>
              <span className="text-muted">Open and review project docs without leaving the dashboard.</span>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xl-4 mb-3">
            <div className="card users-table-card h-100">
              <div className="card-header border-0 pb-0">
                <h5 className="mb-0">Documents</h5>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <input className="form-control" placeholder="Search docs..." value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <div className="list-group">
                  {filteredDocs.map((doc) => (
                    <button key={doc.id} type="button" className={`list-group-item list-group-item-action ${doc.id === selectedDoc.id ? 'active' : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{doc.title}</h6>
                        <small>{doc.file}</small>
                      </div>
                      <small>{doc.description}</small>
                    </button>
                  ))}
                  {filteredDocs.length === 0 && <div className="text-muted border rounded p-2">No documents matched your search.</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-8 mb-3">
            <div className="card users-table-card h-100">
              <div className="card-header border-0 pb-0 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">{selectedDoc.title}</h5>
                  <small className="text-muted">{selectedDoc.description}</small>
                </div>
                <a className="btn btn-sm btn-outline-primary" href={`/docs/${selectedDoc.file}`} target="_blank" rel="noreferrer">
                  Open Raw
                </a>
              </div>
              <div className="card-body">
                {isLoading && <div className="text-muted">Loading document...</div>}
                {!isLoading && error && <div className="alert alert-warning mb-0">{error}</div>}
                {!isLoading && !error && (
                  <pre className="mb-0 p-3 border rounded bg-light" style={{ maxHeight: 560, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {content}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
