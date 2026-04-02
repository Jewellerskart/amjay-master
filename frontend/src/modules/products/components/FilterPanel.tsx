import { useState, useMemo, useCallback, useEffect } from 'react';
import { FilterPanelProps, FacetKey } from '../utils/type';
import { calculateSliderBackground } from '../utils/filter';
import QrSearchInput from '@common/QrSearchInput';

const FACET_LABELS: Record<FacetKey, string> = {
  metals: 'Metal Type',
  diamonds: 'Diamond Type',
  baseQualities: 'Base Qualities',
  category: 'Category',
  subCategory: 'Sub Category',
};
const FACET_KEYS: FacetKey[] = ['metals', 'baseQualities', 'diamonds', 'category', 'subCategory'];

export const FilterPanel = ({
  filters,
  facets,
  bounds,
  totalCount,
  displayedCount,
  isLoading,
  onFilterChange,
  onToggleSelection,
  onClearSelection,
  onApplyFilters,
  onResetFilters,
}: FilterPanelProps) => {
  const [openFacet, setOpenFacet] = useState<FacetKey | null>(null);
  const [facetSearch, setFacetSearch] = useState<Record<FacetKey, string>>(Object.fromEntries(FACET_KEYS.map((k) => [k, ''])) as Record<FacetKey, string>);

  const toggleDropdown = useCallback(
    (key: FacetKey) => {
      setOpenFacet((prev) => (prev === key ? null : key));
    },
    [],
  );

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.facet-accordion')) {
        setOpenFacet(null);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const handleFacetSearch = useCallback((key: FacetKey, value: string) => {
    setFacetSearch((prev) => ({ ...prev, [key]: value }));
  }, []);

  const filteredFacets = useMemo(() => {
    const result: Record<FacetKey, string[]> = {} as Record<FacetKey, string[]>;

    FACET_KEYS.forEach((key) => {
      const query = facetSearch[key].toLowerCase();
      const options = facets[key] || [];
      result[key] = query ? options.filter((opt) => opt.toLowerCase().includes(query)) : options;
    });

    return result;
  }, [facets, facetSearch]);

  const weightSliderBg = useMemo(
    () => calculateSliderBackground(bounds.weightMin, bounds.weightMax, filters.minWeight ?? bounds.weightMin, filters.maxWeight ?? bounds.weightMax),
    [filters.minWeight, filters.maxWeight, bounds],
  );

  const priceSliderBg = useMemo(
    () => calculateSliderBackground(bounds.priceMin, bounds.priceMax, filters.minPrice ?? bounds.priceMin, filters.maxPrice ?? bounds.priceMax),
    [filters.minPrice, filters.maxPrice, bounds],
  );

  return (
    <div className="card shadow-sm border-0 filters-sticky">
      <div className="card-body">
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Filters</h6>
          <button className="btn btn-link p-0 filter-clear-btn" onClick={onResetFilters} disabled={isLoading}>
            <i className="fa fa-times-circle" />
          </button>
        </div>

        {/* COUNT */}
        <div className="small text-muted mb-3">
          Showing {displayedCount} / {totalCount} products
        </div>

        {/* SEARCH */}
        <QrSearchInput
          value={filters.search}
          onChange={(value) => onFilterChange('search', value)}
          onSearch={onApplyFilters}
          onClear={() => onFilterChange('search', '')}
          wrapperClassName="filter-search-group mb-3"
          placeholder="Search by name/style/jewel code"
          ariaLabel="Search products"
          searchButtonAriaLabel="Search products"
          clearButtonAriaLabel="Reset product search"
          scanButtonAriaLabel="Scan product QR"
        />

        {/* FACETS */}
        <div className="accordion facet-accordion mb-3">
          {FACET_KEYS.map((key) => {
            const selected = filters[key] || [];
            const options = filteredFacets[key] || [];
            return (
              <div className="accordion-item" key={key}>
                <div className="accordion-header">
                  <button className={`accordion-button ${openFacet === key ? '' : 'collapsed'}`} type="button" onClick={() => toggleDropdown(key)}>
                    {FACET_LABELS[key]} ({selected.length || 'any'})
                  </button>
                </div>

                <div className={`accordion-collapse collapse ${openFacet === key ? 'show' : ''}`}>
                  <div className="accordion-body p-2">
                    <div className="d-flex mt-2">
                      <QrSearchInput
                        value={facetSearch[key]}
                        onChange={(value) => handleFacetSearch(key, value)}
                        onClear={() => handleFacetSearch(key, '')}
                        wrapperClassName="w-100 mb-2"
                        inputClassName="form-control form-control-sm pm-search-input"
                        placeholder={`Search ${FACET_LABELS[key]}`}
                        ariaLabel={`Search ${FACET_LABELS[key]}`}
                        clearButtonAriaLabel={`Reset ${FACET_LABELS[key]} search`}
                        scanButtonAriaLabel={`Scan ${FACET_LABELS[key]} QR`}
                        showSearchButton={false}
                      />

                      <button className="btn btn-link mx-2" type="button" onClick={() => onClearSelection(key)}>
                        <i className="fa fa-undo" />
                      </button>
                    </div>

                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {options.map((opt) => (
                        <label key={opt} className="d-flex align-items-center small mb-1">
                          <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggleSelection(key, opt)} />
                          <span className="ml-2">{opt}</span>
                        </label>
                      ))}

                      {options.length === 0 && <div className="text-muted small">No matches</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* WEIGHT SLIDER */}
        <div className="mb-3">
          <label className="small text-muted mb-1">Weight (g)</label>

          <div className="p-2 rounded funky-panel">
            <div className="d-flex justify-content-between small mb-1">
              <span>{Math.round(filters.minWeight ?? bounds.weightMin)} g</span>
              <span>{Math.round(filters.maxWeight ?? bounds.weightMax)} g</span>
            </div>

            <div className="slider-stack">
              <input
                type="range"
                min={bounds.weightMin}
                max={bounds.weightMax}
                value={filters.minWeight ?? bounds.weightMin}
                onChange={(e) => onFilterChange('minWeight', Math.min(Number(e.target.value), filters.maxWeight ?? bounds.weightMax))}
                className="form-range position-absolute w-100 funky-range"
                style={{ background: weightSliderBg }}
              />

              <input
                type="range"
                min={bounds.weightMin}
                max={bounds.weightMax}
                value={filters.maxWeight ?? bounds.weightMax}
                onChange={(e) => onFilterChange('maxWeight', Math.max(Number(e.target.value), filters.minWeight ?? bounds.weightMin))}
                className="form-range position-absolute w-100 funky-range"
                style={{ background: 'transparent' }}
              />
            </div>
          </div>
        </div>

        {/* PRICE SLIDER */}
        <div className="mb-3">
          <label className="small text-muted mb-1">Price (Rs.)</label>

          <div className="p-2 rounded funky-panel">
            <div className="d-flex justify-content-between small mb-1">
              <span>Rs. {(filters.minPrice ?? bounds.priceMin).toLocaleString()}</span>
              <span>Rs. {(filters.maxPrice ?? bounds.priceMax).toLocaleString()}</span>
            </div>

            <div className="slider-stack">
              <input
                type="range"
                min={bounds.priceMin}
                max={bounds.priceMax}
                step={500}
                value={filters.minPrice ?? bounds.priceMin}
                onChange={(e) => onFilterChange('minPrice', Math.min(Number(e.target.value), filters.maxPrice ?? bounds.priceMax))}
                className="form-range position-absolute w-100 funky-range"
                style={{ background: priceSliderBg }}
              />

              <input
                type="range"
                min={bounds.priceMin}
                max={bounds.priceMax}
                step={500}
                value={filters.maxPrice ?? bounds.priceMax}
                onChange={(e) => onFilterChange('maxPrice', Math.max(Number(e.target.value), filters.minPrice ?? bounds.priceMin))}
                className="form-range position-absolute w-100 funky-range"
                style={{ background: 'transparent' }}
              />
            </div>
          </div>
        </div>

        {/* APPLY */}
        <button className="btn btn-primary w-100 mt-3" onClick={onApplyFilters} disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Apply Filters'}
        </button>
      </div>
    </div>
  );
};
