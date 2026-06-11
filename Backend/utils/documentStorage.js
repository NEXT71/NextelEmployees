import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '..', 'uploads', 'documents');

const normalizeFileName = (value = '') => String(value)
  .trim()
  .replace(/[^a-zA-Z0-9._-]+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '');

const ensureDirectory = async (directoryPath) => {
  await fs.mkdir(directoryPath, { recursive: true });
};

const buildStorageKey = (employeeId, originalName) => {
  const safeName = normalizeFileName(originalName) || 'document';
  const uniqueToken = `${Date.now()}-${crypto.randomUUID()}`;
  return path.posix.join(String(employeeId), `${uniqueToken}-${safeName}`);
};

export const isSupportedDocumentFile = (file) => {
  const allowedMimeTypes = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]);

  return file && allowedMimeTypes.has(file.mimetype);
};

export const saveDocumentFile = async (file, employeeId) => {
  const storageKey = buildStorageKey(employeeId, file.originalname);
  const absoluteFilePath = path.join(uploadsRoot, storageKey.replaceAll('/', path.sep));
  await ensureDirectory(path.dirname(absoluteFilePath));
  await fs.writeFile(absoluteFilePath, file.buffer);

  return {
    fileName: file.originalname,
    fileUrl: `/uploads/documents/${storageKey.split(path.sep).join('/')}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    storageKey
  };
};

export const deleteStoredDocument = async (storageKey) => {
  if (!storageKey) return;

  const absoluteFilePath = path.join(uploadsRoot, storageKey.replaceAll('/', path.sep));
  try {
    await fs.unlink(absoluteFilePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

export const getDocumentPublicUrl = (storageKey) => `/uploads/documents/${storageKey.split(path.sep).join('/')}`;