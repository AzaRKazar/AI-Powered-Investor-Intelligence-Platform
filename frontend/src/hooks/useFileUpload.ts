import { useCallback, useRef, useState } from 'react';
import { uploadReport } from '../api/client';
import type { ToastType } from './useToasts';

type UploadPhase = 'idle' | 'uploading' | 'processing' | 'success';

interface UploadState {
  phase: UploadPhase;
  percent: number;
  statusText: string;
}

const IDLE_STATE: UploadState = { phase: 'idle', percent: 0, statusText: '' };

export function useFileUpload(
  onUploadSuccess: () => void,
  pushToast: (title: string, message: string, type?: ToastType) => void
) {
  const [state, setState] = useState<UploadState>(IDLE_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const upload = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        pushToast('Invalid File Type', 'Please upload a PDF financial report.', 'error');
        return;
      }

      setState({ phase: 'uploading', percent: 15, statusText: 'Uploading report...' });

      uploadReport(file, (rawPercent) => {
        // Real byte progress is compressed into the 0-45% displayed range,
        // matching the old animation's pacing.
        const percent = Math.round((rawPercent / 100) * 45);
        setState((s) => ({ ...s, percent }));
      })
        .then(() => {
          setState({ phase: 'processing', percent: 75, statusText: 'Extracting KPIs...' });

          // The server has already fully finished by the time we get here
          // (upload is synchronous) - this is a purely cosmetic ramp so the
          // progress bar doesn't just jump straight to 100%, not real
          // progress. Preserved faithfully from the old behavior.
          let extractProgress = 75;
          intervalRef.current = setInterval(() => {
            if (extractProgress < 95) {
              extractProgress += 2;
              setState((s) => ({ ...s, percent: extractProgress }));
            }
          }, 400);

          setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setState({ phase: 'success', percent: 100, statusText: 'Success!' });
            pushToast('Ingestion Complete', 'Successfully extracted metrics for report.', 'success');
            onUploadSuccess();

            // No more page reload to reset the UI for us - do it explicitly.
            setTimeout(() => {
              setState(IDLE_STATE);
            }, 1200);
          }, 4000);
        })
        .catch((err: Error) => {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setState(IDLE_STATE);
          pushToast('Ingestion Failed', err.message, 'error');
        });
    },
    [onUploadSuccess, pushToast]
  );

  return { ...state, upload };
}
