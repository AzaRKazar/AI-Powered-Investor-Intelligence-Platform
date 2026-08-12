import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import type { ToastType } from '../../hooks/useToasts';
import { UploadProgressBar } from './UploadProgressBar';

interface UploadDropzoneProps {
  onUploadSuccess: () => void;
  pushToast: (title: string, message: string, type?: ToastType) => void;
}

export function UploadDropzone({ onUploadSuccess, pushToast }: UploadDropzoneProps) {
  const { phase, percent, statusText, upload } = useFileUpload(onUploadSuccess, pushToast);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    // Allow re-selecting the same file (e.g. after a failed upload).
    e.target.value = '';
  };

  return (
    <>
      <div
        className={`uploader-card${isDragOver ? ' dragover' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="uploader-icon">
          <svg viewBox="0 0 24 24">
            <path
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              stroke="currentColor"
            />
          </svg>
        </div>
        <div className="uploader-title">Ingest Report</div>
        <div className="uploader-desc">Drag &amp; drop or browse PDF</div>
        <input
          type="file"
          ref={fileInputRef}
          className="file-input"
          accept=".pdf"
          onChange={handleFileChange}
        />
      </div>

      {phase !== 'idle' && <UploadProgressBar percent={percent} statusText={statusText} />}
    </>
  );
}
