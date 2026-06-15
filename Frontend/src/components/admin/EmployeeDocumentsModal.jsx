import { useEffect, useRef, useState } from 'react';
import { Upload, X, FileText, Download, Trash2, RefreshCw, Paperclip } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-blue-300/60">Employee Documents</p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-sm text-white/50">{employee.employeeId} · {employee.department || 'No department'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-500/10' : 'border-white/15 bg-white/5'
              }`}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                <Upload className="h-5 w-5 text-blue-300" />
              </div>
              <h3 className="text-lg font-semibold text-white">Upload multiple documents</h3>
              <p className="mt-2 text-sm text-white/55">
                Drag and drop files here or use the file picker. PDF, PNG, JPEG, and DOCX files up to 5MB each.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => handleFileSelection(event.target.files || [])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-lg bg-blue-500/25 px-4 py-2 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-500/35"
              >
                Choose Files
              </button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Pending Uploads</h4>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-white/40 transition-colors hover:text-white"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{file.name}</p>
                        <p className="text-xs text-white/45">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingFile(index)}
                        className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    {uploading ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>Uploading...</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/25 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/35 disabled:opacity-60"
                  >
                    {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    Upload Files
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Uploaded Files</h4>
              <span className="text-xs text-white/40">{documents.length} total</span>
            </div>

            {loading ? (
              <div className="flex h-56 items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-300" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-white/40">
                <FileText className="mb-2 h-8 w-8 text-white/25" />
                No documents uploaded yet.
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {documents.map((document) => (
                  <div key={document._id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{document.fileName}</p>
                        <p className="text-xs text-white/45">Uploaded {formatDate(document.createdAt)}</p>
                        <p className="text-xs text-white/45">{formatFileSize(document.fileSize)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={resolveDocumentUrl(document.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                        >
                          <Download size={12} />
                          Download
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(document._id)}
                          disabled={deletingId === document._id}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs text-red-200 transition-colors hover:bg-red-500/25 disabled:opacity-60"
                        >
                          {deletingId === document._id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDocumentsModal;