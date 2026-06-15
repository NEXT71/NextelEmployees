import Document from '../models/Document.js';
import Employee from '../models/Employee.js';
import { deleteStoredDocument, isSupportedDocumentFile, saveDocumentFile } from '../utils/documentStorage.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const getUploadedFiles = (req) => {
  if (Array.isArray(req.files)) return req.files;
  if (Array.isArray(req.file)) return req.file;
  if (req.file) return [req.file];
  return [];
};

export const uploadEmployeeDocuments = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId).select('_id firstName lastName employeeId');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const files = getUploadedFiles(req);
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files were uploaded' });
    }

    for (const file of files) {
      if (!isSupportedDocumentFile(file)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported file type: ${file.originalname}`
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: `File too large: ${file.originalname}. Max size is 5MB.`
        });
      }
    }

    const createdDocuments = [];
    const savedStorageKeys = [];

    for (const file of files) {
      const stored = await saveDocumentFile(file, employeeId);
      savedStorageKeys.push(stored.storageKey);

      const document = await Document.create({
        employeeId,
        fileName: stored.fileName,
        fileUrl: stored.fileUrl,
        fileSize: stored.fileSize,
        mimeType: stored.mimeType,
        storageKey: stored.storageKey,
        uploadedBy: req.user?._id || null
      });

      createdDocuments.push(document);
    }

    res.status(201).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: createdDocuments
    });
  } catch (error) {
    if (savedStorageKeys.length > 0) {
      await Promise.allSettled(savedStorageKeys.map((storageKey) => deleteStoredDocument(storageKey)));
    }
    next(error);
  }
};

export const getEmployeeDocuments = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    const documents = await Document.find({ employeeId })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username email role');

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployeeDocument = async (req, res, next) => {
  try {
    const { employeeId, documentId } = req.params;

    const document = await Document.findOne({ _id: documentId, employeeId });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await deleteStoredDocument(document.storageKey);
    await Document.findByIdAndDelete(documentId);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};