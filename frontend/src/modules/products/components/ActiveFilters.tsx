import React from 'react';
import { ActiveFiltersProps, FacetKey } from '../utils/type';

const renderChip = (
  filterKey: FacetKey,
  label: string,
  values: string[],
  onRemoveFilter: (key: FacetKey, value: string) => void
) =>
  values.map((value) => (
    <span
      key={`${filterKey}-${value}`}
      className="badge bg-primary-subtle text-primary border"
      style={{ cursor: 'pointer' }}
      onClick={() => onRemoveFilter(filterKey, value)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onRemoveFilter(filterKey, value);
        }
      }}
    >
      {label}: {value} x
    </span>
  ));

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filters, onRemoveFilter }) => {
  const hasActiveFilters =
    filters.metals.length > 0 ||
    filters.baseQualities.length > 0 ||
    filters.diamonds.length > 0 ||
    filters.category.length > 0 ||
    filters.subCategory.length > 0;

  if (!hasActiveFilters) return null;

  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {renderChip('metals', 'Metal', filters.metals, onRemoveFilter)}
      {renderChip('baseQualities', 'Base Quality', filters.baseQualities, onRemoveFilter)}
      {renderChip('diamonds', 'Diamond', filters.diamonds, onRemoveFilter)}
      {renderChip('category', 'Category', filters.category, onRemoveFilter)}
      {renderChip('subCategory', 'Sub', filters.subCategory, onRemoveFilter)}
    </div>
  );
};
