import { useState } from 'react';
import './assignmentSubmissions.css';

export function SubmissionFileActions({ loadLinks }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');

  async function openFile(download) {
    // Open during the user's click so the browser does not block the new tab.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setBusy(true);
    setError('');
    setFallbackUrl('');
    try {
      const links = await loadLinks();
      const url = download ? links.download_url : links.view_url;
      if (tab) tab.location.replace(url);
      else setFallbackUrl(url);
    } catch (err) {
      tab?.close();
      setError(err.message || 'Could not open the PDF. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <div className="submission-file-actions">
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => openFile(false)}>View PDF</button>
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => openFile(true)}>Download PDF</button>
      {busy && <span role="status">Opening PDF…</span>}
      {fallbackUrl && <a href={fallbackUrl} target="_blank" rel="noreferrer">Open PDF (link valid for 2 minutes)</a>}
      {error && <p className="submission-error" role="alert">{error}</p>}
    </div>
  );
}
