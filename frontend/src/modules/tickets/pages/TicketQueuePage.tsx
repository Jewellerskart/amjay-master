import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Header } from '@common/header';
import { useListTicketsQuery, useUpdateTicketMutation } from '@api/apiHooks/ticket';

type TicketItem = { _id: string; status: string; priority: string; createdAt: string };

export const TicketQueuePage = () => {
  const [filters, setFilters] = useState({ status: 'OPEN', page: 1, limit: 10 });
  const { data, refetch, isFetching } = useListTicketsQuery(filters, { refetchOnMountOrArgChange: true });
  const [updateTicket] = useUpdateTicketMutation();

  const tickets = useMemo<TicketItem[]>(() => {
    const fetched = data?.data?.data;
    return Array.isArray(fetched) ? fetched : [];
  }, [data]);

  useEffect(() => {
    refetch();
  }, [filters.status, refetch]);

  const onUpdate = async (ticketId: string, status: string) => {
    try {
      await updateTicket({ ticketId, status }).unwrap();
      toast.success('Status updated');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="card-title mb-0">Purchase Tickets</h4>
            <div>
              <select
                className="form-control form-control-sm"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        <i className="fa fa-spinner fa-spin mr-2" />
                        Loading tickets...
                      </td>
                    </tr>
                  )}
                  {!isFetching &&
                    tickets.map((ticket) => (
                      <tr key={ticket._id}>
                        <td>{ticket._id}</td>
                        <td>{ticket.status}</td>
                        <td>{ticket.priority}</td>
                        <td>{new Date(ticket.createdAt).toLocaleString()}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => onUpdate(ticket._id, 'IN_PROGRESS')}>
                            Start
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => onUpdate(ticket._id, 'RESOLVED')}>
                            Resolve
                          </button>
                        </td>
                      </tr>
                    ))}
                  {!isFetching && tickets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No tickets found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
