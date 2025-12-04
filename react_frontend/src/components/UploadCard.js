import React, { useCallback, useRef, useState } from 'react';
import placeholder from '../assets/placeholder-avatar.svg';

// PUBLIC_INTERFACE
export default function UploadCard({
  selectedFile,
  previewUrl,
  onFileSelect,
  onRemove,
  onSubmit,
  primaryLabel = 'Find Social Profiles',
  loading = false,
  requestId
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const onChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  return (
    <section className="upload-card card" aria-label="Upload image">
      <div
        className="dropzone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        aria-label="Drag and drop an image here or browse files"
        style={dragActive ? { borderColor: 'var(--color-primary)' } : undefined}
      >
        <input
          ref={inputRef}
          id="file-input"
          type="file"
          accept="image/*"
          onChange={onChange}
          aria-label="Choose image file"
        />
        <p><strong>Drag & drop</strong> an image here, or click to browse.</p>
        <small>Supported formats: JPG, PNG. Max size depends on configuration.</small>
      </div>

      <div className="preview">
        <img src={previewUrl || placeholder} alt="Selected preview" />
        <div>
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => inputRef.current && inputRef.current.click()}
              aria-label="Browse files"
              disabled={loading}
            >
              📁 Browse
            </button>
            {selectedFile && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onRemove}
                aria-label="Remove selected file"
                disabled={loading}
              >
                ✖ Remove
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSubmit}
              aria-label={primaryLabel}
              disabled={!selectedFile || loading}
            >
              🔎 {primaryLabel}
            </button>
          </div>
          {selectedFile ? (
            <small>Selected: {selectedFile.name} {requestId ? `(request ${requestId})` : ''}</small>
          ) : (
            <small>No file selected.</small>
          )}
        </div>
      </div>
    </section>
  );
}
