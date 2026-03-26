import type { InventoryRequestStatus } from '../hooks';

interface Props {
  stats: Record<InventoryRequestStatus, number>;
  quantityStats: {
    requested: number;
    assigned: number;
    pending: number;
  };
}

const CARD_ORDER: Array<{ key: InventoryRequestStatus; label: string; tone: string }> = [
  { key: 'OPEN', label: 'Open', tone: 'is-open' },
  { key: 'IN_PROGRESS', label: 'In Progress', tone: 'is-progress' },
  { key: 'FULFILLED', label: 'Fulfilled', tone: 'is-fulfilled' },
  { key: 'CANCELLED', label: 'Cancelled', tone: 'is-cancelled' },
];

const QUANTITY_CARDS = [
  { key: 'requested', label: 'Requested Qty', tone: 'is-requested' },
  { key: 'assigned', label: 'Assigned Qty', tone: 'is-assigned' },
  { key: 'pending', label: 'Pending Qty', tone: 'is-pending' },
] as const;

export const RequestSummaryCards = ({ stats, quantityStats }: Props) => (
  <div className="row inventory-summary-grid">
    {CARD_ORDER.map((card) => (
      <div key={card.key} className="col-6 col-md-3 mb-3">
        <div className={`card border-0 shadow-sm inventory-summary-card ${card.tone}`}>
          <div className="card-body">
            <small className="inventory-summary-card__label">{card.label}</small>
            <h3 className="mb-0 inventory-summary-card__value">{stats[card.key] ?? 0}</h3>
          </div>
        </div>
      </div>
    ))}
    {QUANTITY_CARDS.map((card) => (
      <div key={card.key} className="col-6 col-md-4 mb-3">
        <div className={`card border-0 shadow-sm inventory-summary-card ${card.tone}`}>
          <div className="card-body">
            <small className="inventory-summary-card__label">{card.label}</small>
            <h3 className="mb-0 inventory-summary-card__value">{quantityStats[card.key]}</h3>
          </div>
        </div>
      </div>
    ))}
  </div>
);
