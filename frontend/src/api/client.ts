import type {
  ChatRequestPayload,
  ChatResponse,
  MetricRow,
  UploadResponse,
} from './types';

export async function getMetrics(): Promise<MetricRow[]> {
  const res = await fetch('/api/metrics');
  if (!res.ok) {
    throw new Error(`Failed to load metrics (${res.status})`);
  }
  return res.json();
}

/**
 * Uses XMLHttpRequest (not fetch) specifically for xhr.upload.onprogress,
 * which fetch has no equivalent for. onProgress reports raw byte-progress
 * 0-100; staged/cosmetic animation on top of that lives in useFileUpload.
 */
export function uploadReport(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          resolve({ message: 'Upload succeeded', file_name: file.name });
        }
      } else {
        // routes/ingestion.py has no try/except around the ingest pipeline,
        // so an unhandled server error comes back as a plain-text 500, not
        // JSON - parse defensively rather than assuming a body shape.
        try {
          const parsed = JSON.parse(xhr.responseText);
          reject(new Error(parsed.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Failed to communicate with the ingestion service.'));
    };

    xhr.send(formData);
  });
}

export async function sendChatMessage(
  payload: ChatRequestPayload
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `Server error (${res.status})`;
    try {
      const errorData = await res.json();
      detail = errorData.detail || detail;
    } catch {
      // body wasn't JSON - fall back to the generic message above
    }
    throw new Error(detail);
  }

  return res.json();
}
