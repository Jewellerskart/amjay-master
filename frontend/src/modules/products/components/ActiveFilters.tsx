import React from 'react';
import { ActiveFiltersProps } from '../utils/type';

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filters, onRemoveFilter }) => {
  const hasActiveFilters = filters.metals.length > 0 || filters.diamonds.length > 0 || filters.category.length > 0 || filters.subCategory.length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {filters.metals.map((type) => (
        <span
          key={`metal-${type}`}
          className="badge bg-primary-subtle text-primary border"
          style={{ cursor: 'pointer' }}
          onClick={() => onRemoveFilter('metals', type)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onRemoveFilter('metals', type);
            }
          }}
        >
          Metal: {type} ✕
        </span>
      ))}

      {filters.diamonds.map((type) => (
        <span
          key={`diamond-${type}`}
          className="badge bg-primary-subtle text-primary border"
          style={{ cursor: 'pointer' }}
          onClick={() => onRemoveFilter('diamonds', type)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onRemoveFilter('diamonds', type);
            }
          }}
        >
          Diamond: {type} ✕
        </span>
      ))}

      {filters.category.map((category) => (
        <span
          key={`category-${category}`}
          className="badge bg-primary-subtle text-primary border"
          style={{ cursor: 'pointer' }}
          onClick={() => onRemoveFilter('category', category)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onRemoveFilter('category', category);
            }
          }}
        >
          Category: {category} ✕
        </span>
      ))}

      {filters.subCategory.map((subCategory) => (
        <span
          key={`sub-${subCategory}`}
          className="badge bg-primary-subtle text-primary border"
          style={{ cursor: 'pointer' }}
          onClick={() => onRemoveFilter('subCategory', subCategory)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onRemoveFilter('subCategory', subCategory);
            }
          }}
        >
          Sub: {subCategory} ✕
        </span>
      ))}
    </div>
  );
};
