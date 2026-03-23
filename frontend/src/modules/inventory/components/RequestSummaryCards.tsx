import type { InventoryRequestStatus } from '../hooks';

interface Props {
  stats: Record<InventoryRequestStatus, number>;
}

const CARD_ORDER: Array<{ key: InventoryRequestStatus; label: string }> = [
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'FULFILLED', label: 'Fulfilled' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export const RequestSummaryCards = ({ stats }: Props) => (
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
);
