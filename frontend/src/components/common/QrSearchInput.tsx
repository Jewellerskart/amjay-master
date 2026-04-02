import QrScanner from 'qr-scanner';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

type QrSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  onClear?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  searchButtonAriaLabel?: string;
  clearButtonAriaLabel?: string;
  scanButtonAriaLabel?: string;
  scanButtonText?: string;
  showSearchButton?: boolean;
  showClearButton?: boolean;
  clearWhenEmptyVisible?: boolean;
  autoSearchOnScan?: boolean;
  stopPropagationOnInputClick?: boolean;
};

type ScannerStatus = 'idle' | 'starting' | 'active' | 'error';

const defaultInputClassName = 'form-control pm-search-input';
const isLocalDevHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

export const QrSearchInput = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder,
  ariaLabel,
  disabled = false,
  wrapperClassName = '',
  inputClassName = defaultInputClassName,
  inputStyle,
  searchButtonAriaLabel = 'Search',
  clearButtonAriaLabel = 'Reset search',
  scanButtonAriaLabel = 'Scan QR',
  scanButtonText = 'Scan',
  showSearchButton = true,
  showClearButton = true,
  clearWhenEmptyVisible = false,
  autoSearchOnScan = false,
  stopPropagationOnInputClick = false,
}: QrSearchInputProps) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [statusText, setStatusText] = useState('Ready to scan');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const scannerOpenRef = useRef(false);
  const activeStartIdRef = useRef(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const canShowClear = showClearButton && !!onClear && (clearWhenEmptyVisible || Boolean(value));
  const hasSearchAction = showSearchButton && !!onSearch;

  const stopAndDestroyScanner = useCallback((status: ScannerStatus = 'idle') => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
    }

    setScannerStatus(status);
  }, []);

  useEffect(() => {
    scannerOpenRef.current = isScannerOpen;
  }, [isScannerOpen]);

  const closeScanner = useCallback(() => {
    activeStartIdRef.current += 1;
    scannerOpenRef.current = false;
    setIsScannerOpen(false);
    stopAndDestroyScanner();
  }, [stopAndDestroyScanner]);

  const runSearchAfterScan = useCallback(() => {
    if (!autoSearchOnScan || !onSearch) return;
    window.setTimeout(() => {
      onSearch();
    }, 0);
  }, [autoSearchOnScan, onSearch]);

  const handleDecode = useCallback(
    (result: QrScanner.ScanResult) => {
      if (!scannerOpenRef.current) return;
      const rawValue = `${result?.data || ''}`.trim();
      if (!rawValue) return;

      onChange(rawValue);
      runSearchAfterScan();
      setStatusText(`Scanned: ${rawValue}`);
      closeScanner();
    },
    [closeScanner, onChange, runSearchAfterScan],
  );

  const createScanner = useCallback(() => {
    if (!videoRef.current) return null;

    const scanner = new QrScanner(videoRef.current, handleDecode, {
      preferredCamera: 'environment',
      maxScansPerSecond: 20,
      returnDetailedScanResult: true,
      onDecodeError: (error) => {
        const message = `${typeof error === 'string' ? error : error?.message || ''}`.toLowerCase();
        if (message && !message.includes('no qr code found')) {
          setStatusText('Camera is active. Keep the QR code inside the frame.');
        }
      },
    });

    scannerRef.current = scanner;
    return scanner;
  }, [handleDecode]);

  const getScannerErrorMessage = useCallback((error: any) => {
    const name = `${error?.name || ''}`.toLowerCase();
    if (name === 'notallowederror') {
      return 'Camera permission denied. Please allow camera access.';
    }
    if (name === 'notfounderror' || name === 'overconstrainederror') {
      return 'No compatible camera found on this device.';
    }
    if (name === 'notreadableerror') {
      return 'Camera is being used by another app.';
    }

    const message = `${error?.message || ''}`.toLowerCase();
    if (message.includes('secure') || message.includes('https')) {
      return 'Camera scanning requires HTTPS (or localhost).';
    }
    return 'Unable to start camera scanner.';
  }, []);

  const startScanner = useCallback(async () => {
    const startId = ++activeStartIdRef.current;

    if (!navigator?.mediaDevices?.getUserMedia) {
      if (startId === activeStartIdRef.current) {
        setScannerStatus('error');
        setStatusText('Camera access is not available on this device/browser.');
      }
      return;
    }

    const hostname = window.location.hostname;
    if (!window.isSecureContext && !isLocalDevHost(hostname)) {
      if (startId === activeStartIdRef.current) {
        setScannerStatus('error');
        setStatusText('Camera scanning requires HTTPS (or localhost).');
      }
      return;
    }

    setScannerStatus('starting');
    setStatusText('Requesting camera permission...');

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (startId !== activeStartIdRef.current || !scannerOpenRef.current) {
        stopAndDestroyScanner();
        return;
      }

      if (!hasCamera) {
        setStatusText('No camera found on this device.');
        stopAndDestroyScanner('error');
        return;
      }

      const scanner = scannerRef.current ?? createScanner();
      if (!scanner) {
        setStatusText('Unable to initialize QR scanner.');
        stopAndDestroyScanner('error');
        return;
      }

      await scanner.start();
      if (startId !== activeStartIdRef.current || !scannerOpenRef.current) {
        stopAndDestroyScanner();
        return;
      }

      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) {
        cameraStreamRef.current = stream;
      }

      setScannerStatus('active');
      setStatusText('Point the camera at a QR code');
    } catch (error: any) {
      if (startId === activeStartIdRef.current) {
        setStatusText(getScannerErrorMessage(error));
        stopAndDestroyScanner('error');
      } else {
        stopAndDestroyScanner();
      }
    }
  }, [createScanner, getScannerErrorMessage, stopAndDestroyScanner]);

  useEffect(() => {
    if (!isScannerOpen) return;
    scannerOpenRef.current = true;
    void startScanner();
    return () => {
      activeStartIdRef.current += 1;
      scannerOpenRef.current = false;
      stopAndDestroyScanner();
    };
  }, [isScannerOpen, startScanner, stopAndDestroyScanner]);

  useEffect(() => {
    return () => {
      stopAndDestroyScanner();
    };
  }, [stopAndDestroyScanner]);

  return (
    <>
      <div className={`pm-input-wrap pm-input-wrap--qr ${hasSearchAction ? '' : 'pm-input-wrap--qr-no-action'} ${wrapperClassName}`.trim()}>
        <input
          className={inputClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && onSearch) {
              event.preventDefault();
              onSearch();
            }
          }}
          onClick={(event) => {
            if (stopPropagationOnInputClick) {
              event.stopPropagation();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={inputStyle}
          disabled={disabled}
        />

        {hasSearchAction && (
          <button type="button" className="pm-input-icon pm-input-action" onClick={onSearch} disabled={disabled} aria-label={searchButtonAriaLabel}>
            <i className="fa fa-search" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          className="pm-input-icon pm-input-action pm-input-scan"
          onClick={() => setIsScannerOpen(true)}
          disabled={disabled}
          aria-label={scanButtonAriaLabel}
          title={scanButtonAriaLabel}
        >
          <i className="fa fa-qrcode" aria-hidden="true" />
          <span className="pm-input-scan-text">{scanButtonText}</span>
        </button>

        {canShowClear && (
          <button type="button" className="pm-input-clear" onClick={onClear} disabled={disabled} aria-label={clearButtonAriaLabel}>
            <i className="fa fa-times" aria-hidden="true" />
          </button>
        )}
      </div>

      {isScannerOpen && (
        <div className="qr-scan-backdrop" onClick={closeScanner}>
          <div className="card qr-scan-modal" onClick={(event) => event.stopPropagation()}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">{scanButtonAriaLabel}</h6>
              <button type="button" className="btn btn-sm btn-light" onClick={closeScanner} aria-label="Close scanner">
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="card-body">
              <div className="qr-scan-video-wrap">
                {(scannerStatus === 'active' || scannerStatus === 'starting') && <video ref={videoRef} autoPlay playsInline muted className="qr-scan-video" />}
                {scannerStatus === 'error' && (
                  <div className="qr-scan-placeholder">
                    <i className="fa fa-exclamation-circle mr-2" />
                    <span>{statusText}</span>
                  </div>
                )}
              </div>
              <div className="small text-muted mt-2">{statusText}</div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button type="button" className="btn btn-outline-secondary mr-2" onClick={closeScanner}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void startScanner()} disabled={scannerStatus === 'starting'}>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QrSearchInput;
