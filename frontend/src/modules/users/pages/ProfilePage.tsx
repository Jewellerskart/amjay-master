import { Header } from '@common/header';
import { ProfileDetailsCard } from './ProfileDetailsCard';
import { ProfileKycCard } from './ProfileKycCard';
import { useProfile } from './useProfile';

export const ProfilePage = () => {
  const {
    form,
    isLoading,
    isSaving,
    isUploading,
    isEditMode,
    setIsEditMode,
    kycForm,
    setKycForm,
    uploadedDocTypes,
    canManageKyc,
    handleFieldChange,
    handleAddressChange,
    onSaveProfile,
    onUploadKycDocument,
  } = useProfile();

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="content-body">
          <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="content-body">
        <div className="container-fluid">
          <div className="row">
            <ProfileDetailsCard
              form={form}
              isEditMode={isEditMode}
              isSaving={isSaving}
              onToggleEditMode={() => setIsEditMode((prev) => !prev)}
              onSaveProfile={onSaveProfile}
              handleFieldChange={handleFieldChange}
              handleAddressChange={handleAddressChange}
            />
            <ProfileKycCard
              canManageKyc={canManageKyc}
              isUploading={isUploading}
              uploadedDocTypes={uploadedDocTypes}
              kycForm={kycForm}
              kycDocuments={form.kycDocuments}
              setKycForm={setKycForm}
              onUploadKycDocument={onUploadKycDocument}
            />
          </div>
        </div>
      </div>
    </>
  );
};
