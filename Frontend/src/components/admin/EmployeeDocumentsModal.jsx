import { useEffect, useRef, useState } from 'react';
import { Upload, X, FileText, Download, Trash2, RefreshCw, Paperclip, Camera } from 'lucide-react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { API_BASE_URL } from '../../utils/constants';
import { documentAPI } from '../../utils/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const formatFileSize = (size = 0) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const resolveDocumentUrl = (fileUrl) => {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return new URL(fileUrl, API_BASE_URL).href;
};

const EmployeeDocumentsModal = ({ isOpen, employee, onClose }) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !employee?._id) return;

    const loadDocuments = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await documentAPI.getEmployeeDocuments(employee._id);
        setDocuments(response.data || []);
      } catch (requestError) {
        setError(requestError.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
    setSelectedFiles([]);
    setProgress(0);
  }, [employee?._id, isOpen]);

  if (!isOpen || !employee) return null;

  const validateFiles = (files) => {
    const validFiles = [];
    const rejected = [];

    Array.from(files).forEach((file) => {
      if (!ACCEPTED_MIME_TYPES.has(file.type)) {
        rejected.push(`${file.name} has an unsupported file type.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} exceeds the 5MB limit.`);
        return;
      }

      validFiles.push(file);
    });

    if (rejected.length > 0) {
      setError(rejected[0]);
    }

    return validFiles;
  };

  const handleFileSelection = (files) => {
    const validated = validateFiles(files);
    if (validated.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validated]);
      setError('');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      handleFileSelection(event.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Select at least one file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const response = await documentAPI.uploadEmployeeDocuments(employee._id, selectedFiles, {
        onProgress: setProgress
      });
      setDocuments((prev) => [...response.data, ...prev]);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Delete this document?')) return;

    setDeletingId(documentId);
    setError('');

    try {
      await documentAPI.deleteEmployeeDocument(employee._id, documentId);
      setDocuments((prev) => prev.filter((document) => document._id !== documentId));
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const removePendingFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="max-w-4xl"
      title={`Documents for ${employee.firstName} ${employee.lastName}`}
      description={`${employee.employeeId}, ${employee.department || 'no department'}`}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 text-center ${
              dragActive ? 'border-shift bg-shift-soft' : 'border-line bg-paper'
            }`}
          >
            <Upload className="mx-auto mb-2 h-5 w-5 text-muted" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">Drop files here, or choose them</p>
            <p className="mt-1 text-xs text-muted">PDF, PNG, JPEG and Word files, up to 5 MB each.</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => handleFileSelection(event.target.files || [])}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                handleFileSelection(event.target.files || []);
                event.target.value = '';
              }}
              className="hidden"
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>Choose files</Button>
              <Button variant="secondary" size="sm" icon={Camera} onClick={() => cameraInputRef.current?.click()}>Take photo</Button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="rounded-xl border border-line">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
                <h3 className="text-sm font-semibold text-ink">Ready to upload ({selectedFiles.length})</h3>
                <button type="button" onClick={() => setSelectedFiles([])} className="text-xs text-muted hover:text-ink">
                  Clear all
                </button>
              </div>
              <ul className="divide-y divide-line">
                {selectedFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{file.name}</p>
                      <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
                    </div>
                    <Button variant="ghost" size="icon" icon={X} onClick={() => removePendingFile(index)} aria-label={`Remove ${file.name}`} />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
                <div className="flex-1">
                  {uploading && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted tabular-nums">Uploading… {progress}%</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-paper">
                        <div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <Button size="sm" icon={Paperclip} onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading…' : `Upload ${selectedFiles.length === 1 ? 'file' : 'files'}`}
                </Button>
              </div>
            </div>
          )}

          {error && <Alert>{error}</Alert>}
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold text-ink">Uploaded</h3>
            <span className="text-xs text-muted tabular-nums">{documents.length} {documents.length === 1 ? 'file' : 'files'}</span>
          </div>

          {loading ? (
            <p className="py-8 text-sm text-muted">Loading documents…</p>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center">
              <FileText className="mx-auto mb-2 h-6 w-6 text-muted" aria-hidden="true" />
              <p className="text-sm text-muted">No documents yet. Upload a CNIC, contract or anything else HR needs on file.</p>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto rounded-xl border border-line divide-y divide-line">
              {documents.map((document) => (
                <li key={document._id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{document.fileName}</p>
                    <p className="text-xs text-muted">
                      {formatFileSize(document.fileSize)}, uploaded {formatDate(document.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={resolveDocumentUrl(document.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Download ${document.fileName}`}
                      title="Download"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      icon={deletingId === document._id ? RefreshCw : Trash2}
                      onClick={() => handleDelete(document._id)}
                      disabled={deletingId === document._id}
                      aria-label={`Delete ${document.fileName}`}
                      title="Delete"
                      className={`hover:text-absent ${deletingId === document._id ? '[&>svg]:animate-spin' : ''}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default EmployeeDocumentsModal;
