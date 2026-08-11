interface UploadProgressBarProps {
  percent: number;
  statusText: string;
}

export function UploadProgressBar({ percent, statusText }: UploadProgressBarProps) {
  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>{statusText}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
