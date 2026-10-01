import { useEffect, useState } from 'react';
import { api } from '../api/apiClient';
import { SubmissionFileActions } from './SubmissionFileActions';

export function TeacherAssignmentSubmissions({ assignment }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let running = false;
    async function load() {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const result = await api.teacher.getAssignmentSubmissions(assignment.id);
        if (!cancelled) { setData(result); setError(''); setNow(Date.now()); }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load submissions.');
      } finally { running = false; }
    }
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener('focus', load);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', load); };
  }, [assignment.id, open, refresh]);

  const closed = assignment.due_date && now >= Date.parse(assignment.due_date);
  return (
    <section className="assignment-submission">
      <button type="button" className="btn btn-teacher btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide submissions' : 'View student submissions'}
      </button>
      {open && <div className="submission-roster">
        <div className="submission-roster-heading">
          <strong>{data ? `${data.submitted_count} Submitted · ${data.pending_count} Not submitted` : 'Loading submissions…'}</strong>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRefresh(n => n + 1)}>Refresh</button>
        </div>
        <small>Updates every 15 seconds while this panel is open.</small>
        {error && <p className="submission-error" role="alert">{error}{data ? ' The list below may be out of date.' : ''}</p>}
        {data?.students.length === 0 && <p>No students are enrolled yet.</p>}
        {data?.students.map(row => <article className="submission-student" key={row.student?.id || row.submission.student_id}>
          <strong>{row.student?.name || 'Student'}</strong>
          <p>{row.student?.email}</p>
          {row.submission ? <>
            <span className="submission-success">✓ Submitted</span>
            <p className="submission-filename">{row.submission.file_name}</p>
            <p>{new Date(row.submission.submitted_at).toLocaleString()}</p>
            <SubmissionFileActions loadLinks={() => api.teacher.getSubmissionFile(assignment.id, row.submission.student_id)} />
          </> : <p>{closed ? 'Not submitted — submission closed' : 'Not submitted'}</p>}
        </article>)}
      </div>}
    </section>
  );
}
