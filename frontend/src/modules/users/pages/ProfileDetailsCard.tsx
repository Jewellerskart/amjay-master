import type { ChangeEvent } from 'react';
import type { ProfileForm } from '../types';

type InputEvent = ChangeEvent<HTMLInputElement>;

type ProfileDetailsCardProps = {
  form: ProfileForm;
  isEditMode: boolean;
  isSaving: boolean;
  onToggleEditMode: () => void;
  onSaveProfile: () => void;
  handleFieldChange: (event: InputEvent) => void;
  handleAddressChange: (event: InputEvent) => void;
};

export const ProfileDetailsCard = ({
  form,
  isEditMode,
  isSaving,
  onToggleEditMode,
  onSaveProfile,
  handleFieldChange,
  handleAddressChange,
}: ProfileDetailsCardProps) => {
  return (
    <div className="col-xl-6 mb-3">
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Profile Details</h5>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onToggleEditMode}>
            {isEditMode ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>First Name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleFieldChange}
              className="form-control"
              disabled={!isEditMode}
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              name="lastName"
              value={form.lastName || ''}
              onChange={handleFieldChange}
              className="form-control"
              disabled={!isEditMode}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" value={form.email || ''} className="form-control" disabled />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleFieldChange}
              className="form-control"
              disabled={!isEditMode}
            />
          </div>
          <div className="form-row">
            <div className="form-group col-md-6">
              <label>Street</label>
              <input
                name="street"
                value={form.address?.street || ''}
                onChange={handleAddressChange}
                className="form-control"
                disabled={!isEditMode}
              />
            </div>
            <div className="form-group col-md-6">
              <label>City</label>
              <input
                name="city"
                value={form.address?.city || ''}
                onChange={handleAddressChange}
                className="form-control"
                disabled={!isEditMode}
              />
            </div>
          </div>
          <div className="d-flex justify-content-end">
            {isEditMode && (
              <button className="btn btn-primary" type="button" onClick={onSaveProfile} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
