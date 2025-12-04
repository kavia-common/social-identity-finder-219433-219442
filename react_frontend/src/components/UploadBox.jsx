import { useCallback, useEffect, useRef, useState } from 'react';
import Spinner from './Spinner';

// PUBLIC_INTERFACE
export default function UploadBox({ onFileSelected, onUpload, selectedFile, isUploading, retrying }) {
  /**
   * Drag-and-drop area + file picker.
   * Accepts image/*, previews selected image, and calls onUpload(file).
   * Shows inline validation errors for type/size.
   */
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const validate = useCallback((file) => {
    if (!file) return 'Please choose a file.';
    if (!file.type || !file.type.startsWith('image/')) return 'Invalid file type. Please upload an image.';
    // 10MB limit
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) return 'File is too large. Max size is 10MB.';
    return null;
  }, []);

  const acceptFile = useCallback((file) => {
    const vErr = validate(file);
    setValidationError(vErr);
    if (!vErr) {
      onFileSelected?.(file);
    }
  }, [onFileSelected, validate]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) acceptFile(file);
    },
    [acceptFile]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onPick = useCallback((e) => {
    const file = e.target?.files?.[0];
    if (file) acceptFile(file);
  }, [acceptFile]);

  const onKeyPress = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      inputRef.current?.click();
    }
  }, []);

  const handleUploadClick = useCallback(() => {
    if (selectedFile && !validationError) onUpload?.(selectedFile);
  }, [onUpload, selectedFile, validationError]);

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        tabIndex={0}
        role="button"
        aria-label="Upload an image by drag and drop or choose a file"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onKeyDown={onKeyPress}
        onClick={() => inputRef.current?.click()}
      >
        <div className="row" style={{ justifyContent: 'center' }}>
          <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>Upload a face photo</div>
        </div>
        <div className="hint">Drag & drop an image here, or click to browse</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          aria-label="Choose image file"
          style={{ display: 'none' }}
        />
        {previewUrl && (
          <div className="preview" aria-live="polite">
            <img src={previewUrl} alt="Selected preview" />
          </div>
        )}
        {validationError && (
          <div className="alert" role="alert" style={{ marginTop: 10 }}>
            {validationError}
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={handleUploadClick}
          disabled={!selectedFile || isUploading || retrying || !!validationError}
          aria-disabled={!selectedFile || isUploading || retrying || !!validationError}
          aria-label="Upload selected image"
        >
          {isUploading || retrying ? <div className="row"><Spinner /> <span>{retrying ? 'Retrying…' : 'Uploading...'}</span></div> : 'Upload'}
        </button>
      </div>
    </div>
  );
}
