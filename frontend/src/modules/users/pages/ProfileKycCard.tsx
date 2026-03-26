import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { IKycDocument, KycFormState } from '../types';

type ProfileKycCardProps = {
  canManageKyc: boolean;
  isUploading: boolean;
  uploadedDocTypes: Set<string>;
  kycForm: KycFormState;
  kycDocuments: IKycDocument[];
  setKycForm: Dispatch<SetStateAction<KycFormState>>;
  onUploadKycDocument: (event: FormEvent<HTMLFormElement>) => void;
};

export const ProfileKycCard = ({
  canManageKyc,
  isUploading,
  uploadedDocTypes,
  kycForm,
  kycDocuments,
  setKycForm,
  onUploadKycDocument,
}: ProfileKycCardProps) => {
  return (
    <div className="col-xl-6 mb-3">
      <div className="card shadow-sm">
        <div className="card-header">
          <h5 className="mb-0">KYC Documents</h5>
        </div>
        <div className="card-body">
          {!canManageKyc && (
            <p className="text-muted">KYC controls are restricted for your role.</p>
          )}
          <div className="mb-3">
            <strong>Uploaded documents</strong>
            <div className="mt-2 d-flex flex-wrap" style={{ gap: '4px' }}>
              {Array.from(uploadedDocTypes).map((type) => (
                <span key={type} className="badge badge-light">
                  {type}
                </span>
              ))}
              {uploadedDocTypes.size === 0 && <span className="text-muted">No documents yet.</span>}
            </div>
          </div>
          <form onSubmit={onUploadKycDocument}>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Document Type</label>
                <select
                  className="form-control"
                  value={kycForm.documentType}
                  onChange={(event) =>
                setKycForm((prev) => ({ ...prev, documentType: event.target.value as IKycDocument['documentType'] }))
                  }
                >
                  <option value="aadhaar">Aadhaar</option>
                  <option value="pan">PAN</option>
                  <option value="gst">GST</option>
                  <option value="license">License</option>
                </select>
              </div>
              <div className="form-group col-md-6">
                <label>Document Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={kycForm.documentNumber}
                  onChange={(event) => setKycForm((prev) => ({ ...prev, documentNumber: event.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Document File</label>
              <input
                type="file"
                className="form-control"
                onChange={(event) =>
                  setKycForm((prev) => ({ ...prev, document: event.target.files ? event.target.files[0] : null }))
                }
              />
            </div>
            <button type="submit" className="btn btn-outline-primary" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>
          <div className="mt-3">
            <strong>Existing documents</strong>
            <ul className="list-unstyled mt-2">
              {kycDocuments.length === 0 && <li>No documents uploaded.</li>}
              {kycDocuments.map((doc) => (
                <li key={doc.documentType} className="d-flex justify-content-between align-items-center">
                  <span>{doc.documentType.toUpperCase()}</span>
                  <span className="text-muted">{doc.verified ? 'Verified' : 'Pending'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
