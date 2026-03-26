import type { InventoryRequestStatus } from '../hooks';

interface Props {
  stats: Record<InventoryRequestStatus, number>;
  quantityStats: {
    requested: number;
    assigned: number;
    pending: number;
  };
}

const CARD_ORDER: Array<{ key: InventoryRequestStatus; label: string }> = [
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'FULFILLED', label: 'Fulfilled' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const QUANTITY_CARDS = [
  { key: 'requested', label: 'Requested Qty', className: 'text-primary' },
  { key: 'assigned', label: 'Assigned Qty', className: 'text-success' },
  { key: 'pending', label: 'Pending Qty', className: 'text-warning' },
] as const;

export const RequestSummaryCards = ({ stats, quantityStats }: Props) => (
  <>
    <div className="row">
      {CARD_ORDER.map((card) => (
        <div key={card.key} className="col-md-3 mb-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">{card.label}</small>
              <h3 className="mb-0">{stats[card.key] ?? 0}</h3>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="row">
      {QUANTITY_CARDS.map((card) => (
        <div key={card.key} className="col-md-4 mb-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">{card.label}</small>
              <h3 className={`mb-0 ${card.className}`}>{quantityStats[card.key]}</h3>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);
