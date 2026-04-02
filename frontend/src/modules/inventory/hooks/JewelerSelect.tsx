import { useEffect, useRef, useState } from 'react';
import QrSearchInput from '@common/QrSearchInput';

interface JewelerOption {
  id: string;
  label: {
    name: string;
    businessName: string;
    email: string;
  };
}

interface JewelerSelectProps {
  value: string;
  onChange: (value: string) => void;
  jewelers: JewelerOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const JewelerSelect = ({ value, onChange, jewelers, placeholder = 'Select jeweler', className = '', disabled = false }: JewelerSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedJeweler = jewelers.find((j) => j.id === value);
  const filteredJewelers = jewelers.filter((j) => `${j.label.name} ${j.label.businessName} ${j.label.email}`.toLowerCase().includes(searchTerm.toLowerCase()));
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      const input = dropdownRef.current?.querySelector('input');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (jewelerId: string) => {
    onChange(jewelerId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`jeweler-select ${className}`} ref={dropdownRef}>
      <button type="button" className="form-control jeweler-select-trigger text-left d-flex justify-content-between align-items-center" onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled}>
        <span className={selectedJeweler ? '' : 'text-muted'}>{selectedJeweler ? `${selectedJeweler.label.name} (${selectedJeweler.label.businessName})` : placeholder}</span>
        <i className={`fa fa-chevron-${isOpen ? 'up' : 'down'} ml-2`} style={{ fontSize: 12 }} />
      </button>

      {isOpen && (
        <div className="jeweler-select-dropdown">
          <QrSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm('')}
            placeholder="Search jewelers..."
            ariaLabel="Search jewelers"
            wrapperClassName="jeweler-select-search"
            inputClassName="form-control form-control-sm pm-search-input"
            showSearchButton={false}
            stopPropagationOnInputClick
            scanButtonAriaLabel="Scan jeweler QR"
          />

          <div className="jeweler-select-list">
            {value && (
              <>
                <button type="button" className="jeweler-select-option jeweler-select-option--clear" onClick={() => handleSelect('')}>
                  <i className="fa fa-times-circle mr-2" />
                  Clear selection
                </button>
                <div className="jeweler-select-divider" />
              </>
            )}

            {filteredJewelers.length === 0 && (
              <div className="jeweler-select-empty">
                <i className="fa fa-search mb-2" style={{ fontSize: 24, opacity: 0.3 }} />
                <div className="text-muted">No jewelers found</div>
              </div>
            )}

            {filteredJewelers.map((jeweler) => (
              <button key={jeweler.id} type="button" className={`jeweler-select-option ${jeweler.id === value ? 'jeweler-select-option--selected' : ''}`} onClick={() => handleSelect(jeweler.id)}>
                {jeweler.id === value && <i className="fa fa-check mr-2" />}
                <div className="detail">
                  <div>{jeweler.label.name}</div>
                  <small className="text-muted">
                    {jeweler.label.businessName} • {jeweler.label.email}
                  </small>
                </div>
              </button>
            ))}
          </div>

          {filteredJewelers.length > 0 && (
            <div className="jeweler-select-footer">
              {filteredJewelers.length} of {jewelers.length} jewelers
            </div>
          )}
        </div>
      )}
    </div>
  );
};
