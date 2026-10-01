export const MAX_SUBMISSION_BYTES = 4 * 1024 * 1024;

export function submissionError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function assertDeadlineOpen(assignment, now = Date.now()) {
  if (!assignment.due_date) return;
  const deadline = Date.parse(assignment.due_date);
  if (!Number.isFinite(deadline)) {
    throw submissionError(409, 'This assignment has an invalid deadline. Please contact your teacher.');
  }
  if (now >= deadline) throw submissionError(409, 'Submission closed: the deadline has passed.');
}

export function validateSubmissionPdf(file) {
  if (!file) throw submissionError(400, 'Choose a PDF file to submit.');
  if (!/\.pdf$/i.test(file.originalname) || file.mimetype !== 'application/pdf') {
    throw submissionError(400, 'Only PDF files are allowed.');
  }
  if (!file.size || file.size > MAX_SUBMISSION_BYTES) {
    throw submissionError(400, 'Choose a non-empty PDF of 4 MB or less.');
  }
  // Check the contents as well as the browser-supplied name and MIME type.
  if (!/^%PDF-\d\.\d/.test(file.buffer.subarray(0, 8).toString('ascii')) ||
      !file.buffer.subarray(-1024).includes(Buffer.from('%%EOF'))) {
    throw submissionError(400, 'The selected file is not a valid PDF.');
  }
}

export function submissionMetadata(record) {
  if (!record) return null;
  const { id, assignment_id, student_id, file_name, file_size, submitted_at } = record;
  return { id, assignment_id, student_id, file_name, file_size, submitted_at };
}

export function submissionFailure(res, error) {
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Already submitted. A submission cannot be replaced.' });
  }
  if (error.code === 'P0001') return res.status(409).json({ error: error.message });
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return res.status(503).json({ error: 'Assignment submissions are not set up yet. Ask the project owner to run the assignment_submissions.sql migration.' });
  }
  return res.status(error.status || 500).json({
    error: error.status ? error.message : 'Could not complete the submission request. Please try again.'
  });
}
