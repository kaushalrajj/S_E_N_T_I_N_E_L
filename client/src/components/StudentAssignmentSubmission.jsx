import { useEffect, useRef, useState } from 'react';
import { api } from '../api/apiClient';
import { SubmissionFileActions } from './SubmissionFileActions';

export function StudentAssignmentSubmission({ assignment, onSubmitted, onRefresh }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const sending = useRef(false);
  const fileInput = useRef(null);
  const deadline = assignment.due_date ? Date.parse(assignment.due_date) : null;
  const closed = deadline !== null && (!Number.isFinite(deadline) || now >= deadline);

  useEffect(() => {
    if (!Number.isFinite(deadline) || now >= deadline) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(deadline - Date.now(), 0) + 1, 2147483647));
    return () => clearTimeout(timer);
  }, [deadline, now]);

  function chooseFile(event) {
    setError('');
    const selected = event.target.files?.[0];
    if (!selected) { setFile(null); return; }
    if (!/\.pdf$/i.test(selected.name) || (selected.type && selected.type !== 'application/pdf') || !selected.size || selected.size > 4 * 1024 * 1024) {
      setError('Choose a non-empty PDF of 4 MB or less.');
      setFile(null);
      event.target.value = '';
      return;
    }
    setFile(selected);
  }

  async function submit(event) {
    event.preventDefault();
    if (!file || sending.current || closed) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api.student.submitAssignment(assignment.id, file);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      onSubmitted(assignment.id, result.submission);
    } catch (err) {
      setError(err.message || 'Could not submit your PDF. Please try again.');
      // Also reconcile if the upload succeeded but the response was lost.
      onRefresh?.();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (assignment.submission) {
    return (
      <section className="assignment-submission" aria-label="Your submission">
        <strong className="submission-success" role="status">✓ Submitted</strong>
        <p className="submission-filename">{assignment.submission.file_name}</p>
        <p>Submitted: {new Date(assignment.submission.submitted_at).toLocaleString()}</p>
        <SubmissionFileActions loadLinks={() => api.student.getSubmissionFile(assignment.id)} />
        <small>This is your final submission. It cannot be replaced.</small>
      </section>
    );
  }

  return (
    <section className="assignment-submission" aria-label="Submit your assignment">
      <strong role="status">{closed ? 'Submission closed' : 'Not submitted'}</strong>
      {closed ? <p>The deadline has passed. Late submissions are not accepted.</p> : (
        <form onSubmit={submit}>
          <label htmlFor={`submission-${assignment.id}`}>Your answer PDF (maximum 4 MB)</label>
          <input ref={fileInput} id={`submission-${assignment.id}`} type="file" accept=".pdf,application/pdf" disabled={busy} onChange={chooseFile} />
          {file && <p className="submission-filename">Selected: {file.name}</p>}
          <small>Submit once only. You cannot replace your PDF afterwards.</small>
          <button type="submit" className="btn btn-student btn-sm" disabled={!file || busy}>{busy ? 'Submitting…' : 'Submit PDF'}</button>
        </form>
      )}
      {error && <p className="submission-error" role="alert">{error}</p>}
    </section>
  );
}
