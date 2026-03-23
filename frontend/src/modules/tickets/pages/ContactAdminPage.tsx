import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Header } from '@common/header';
import { ContactAdminApi, ProductApi } from '@api/api.index';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { isAdminRole } from '@shared/utils/roles';

type QueryForm = {
  subject: string;
  message: string;
  queryType: 'general' | 'product-request';
  productRequest: {
    productRefId: string;
    preferredProductName: string;
    preferredColor: string;
    preferredCut: string;
    preferredCarat: string;
    qty: string;
    budgetPerCarat: string;
  };
  priority: 'low' | 'medium' | 'high';
  deadlineAt: string;
  documents: File[];
};

type EditModalState = {
  id: string;
  status: string;
  remark: string;
  deadlineAt: string;
  assignedToUserId: string;
  query: any;
  canEdit: boolean;
};

type AttachmentItem = {
  fileName?: string;
  fileUrl?: string;
};

type Assignee = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

type ProductBrowseItem = {
  _id?: string;
  product?: { jewelCode?: string; styleCode?: string };
  currentHolder?: { role?: string; name?: string };
};

const STATUS_OPTIONS = ['new', 'in-progress', 'waiting-user', 'resolved', 'complete', 'cancelled'];

const initialForm: QueryForm = {
  subject: '',
  message: '',
  queryType: 'general',
  productRequest: {
    productRefId: '',
    preferredProductName: '',
    preferredColor: '',
    preferredCut: '',
    preferredCarat: '',
    qty: '',
    budgetPerCarat: '',
  },
  priority: 'medium',
  deadlineAt: '',
  documents: [],
};

const toDateInput = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const toReadableStatus = (value?: string) => `${value || '-'}`.replace('-', ' ');

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '-');
const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '-');

const filterByDateRange = (value?: string, start?: string, end?: string) => {
  if (!value) return false;
  const current = new Date(value).getTime();
  const startOk = !start || current >= new Date(start).getTime();
  const endOk = !end || current <= new Date(end).getTime() + 86400000 - 1;
  return startOk && endOk;
};

const getAttachments = (query: any): AttachmentItem[] => {
  if (Array.isArray(query?.attachments)) return query.attachments;
  if (Array.isArray(query?.documents)) return query.documents;
  if (Array.isArray(query?.files)) return query.files;
  return [];
};

const AttachmentCell = ({ query, keyPrefix }: { query: any; keyPrefix: string }) => {
  const items = getAttachments(query);
  if (items.length === 0) return <>-</>;

  return (
    <>
      {items.map((file: AttachmentItem, idx: number) => {
        const href = file?.fileUrl || '';
        if (!href)
          return (
            <span key={`${keyPrefix}-${idx}`} className="d-block">
              -
            </span>
          );
        return (
          <a key={`${keyPrefix}-${idx}`} href={href} target="_blank" rel="noreferrer" className="d-block">
            {file?.fileName || `attachment-${idx + 1}`}
          </a>
        );
      })}
    </>
  );
};

const PaginationBar = ({ page, totalPages, onPrev, onNext, totalLabel }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void; totalLabel?: string }) => (
  <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap">
    <small className="text-muted">
      Page {page} of {totalPages}
      {totalLabel ? ` | ${totalLabel}` : ''}
    </small>
    <div>
      <button className="btn btn-sm btn-outline-secondary mr-2" onClick={onPrev} disabled={page <= 1}>
        Previous
      </button>
      <button className="btn btn-sm btn-outline-secondary" onClick={onNext} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  </div>
);

export const ContactAdminPage = () => {
  const { data: user } = useAuthSellerLogin();
  const isAdmin = isAdminRole(user?.role);
  const isJeweler = `${user?.role || ''}`.toLowerCase() === 'jeweler';

  const [form, setForm] = useState<QueryForm>(initialForm);
  const [createQuery, { isLoading: isCreating }] = ContactAdminApi.useCreateContactQueryMutation();
  const { data: myQueriesData, refetch: refetchMyQueries, isFetching: isMyQueriesLoading } = ContactAdminApi.useGetMyContactQueriesQuery();
  const [getAllQueries, { isLoading: isAllQueriesLoading }] = ContactAdminApi.useGetAllContactQueriesMutation();
  const [updateQueryStatus, { isLoading: isUpdatingStatus }] = ContactAdminApi.useUpdateContactQueryStatusMutation();
  const { data: assignableUsersData } = ContactAdminApi.useGetAssignableContactUsersQuery(undefined, { skip: !isAdmin });
  const [fetchProductsForRequest, { isLoading: isProductBrowseLoading }] = ProductApi.useListProductsMutation();

  const [allQueries, setAllQueries] = useState<any[]>([]);
  const [allQueriesTotal, setAllQueriesTotal] = useState(0);

  const [mySearch, setMySearch] = useState('');
  const [myStatus, setMyStatus] = useState('');
  const [myStartDate, setMyStartDate] = useState('');
  const [myEndDate, setMyEndDate] = useState('');
  const [myPage, setMyPage] = useState(1);
  const [myLimit, setMyLimit] = useState(10);

  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [adminStartDate, setAdminStartDate] = useState('');
  const [adminEndDate, setAdminEndDate] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit, setAdminLimit] = useState(10);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [productBrowseList, setProductBrowseList] = useState<ProductBrowseItem[]>([]);
  const [productBrowseSearch, setProductBrowseSearch] = useState('');
  const assignableUsers = useMemo<Assignee[]>(() => {
    const list = Array.isArray(assignableUsersData?.data?.assignees) ? assignableUsersData.data.assignees : [];
    return list
      .map((item: any) => ({
        id: `${item?.id || ''}`,
        name: `${item?.name || ''}`.trim(),
        email: `${item?.email || ''}`.trim(),
        role: `${item?.role || ''}`.trim(),
      }))
      .filter((item: Assignee) => item.id && item.email);
  }, [assignableUsersData]);

  const myQueries = useMemo(() => (Array.isArray(myQueriesData?.data?.queries) ? myQueriesData?.data?.queries : []), [myQueriesData]);
  const filteredMyQueries = useMemo(() => {
    const search = mySearch.trim().toLowerCase();
    return myQueries.filter((query: any) => {
      const searchMatch = !search || `${query?.subject || ''}`.toLowerCase().includes(search) || `${query?.message || ''}`.toLowerCase().includes(search) || `${query?.status || ''}`.toLowerCase().includes(search);
      const statusMatch = !myStatus || query?.status === myStatus;
      const dateMatch = filterByDateRange(query?.createdAt, myStartDate, myEndDate);
      return searchMatch && statusMatch && dateMatch;
    });
  }, [myEndDate, myQueries, mySearch, myStartDate, myStatus]);

  const myTotalPages = Math.max(1, Math.ceil(filteredMyQueries.length / myLimit));
  const myVisibleQueries = useMemo(() => {
    const start = (myPage - 1) * myLimit;
    return filteredMyQueries.slice(start, start + myLimit);
  }, [filteredMyQueries, myLimit, myPage]);

  const adminTotalPages = Math.max(1, Math.ceil(allQueriesTotal / adminLimit));

  const loadAllQueries = async () => {
    if (!isAdmin) return;
    try {
      const payload ={
        status: adminStatus,
        search: adminSearch,
        startDate: adminStartDate,
        endDate: adminEndDate,
        page: adminPage,
        limit: adminLimit,
      }
      const res: any = await getAllQueries(payload).unwrap();
      setAllQueries(Array.isArray(res?.data?.data) ? res.data.data : []);
      setAllQueriesTotal(Number(res?.data?.count || 0));
    } catch {
      setAllQueries([]);
      setAllQueriesTotal(0);
    }
  };

  useEffect(() => {
    setMyPage(1);
  }, [myEndDate, mySearch, myStartDate, myStatus, myLimit]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAllQueries();
  }, [isAdmin, adminSearch, adminStatus, adminStartDate, adminEndDate, adminPage, adminLimit]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setForm((prev) => ({ ...prev, documents: files.slice(0, 5) }));
  };

  const loadProductsForRequest = async (searchText = '') => {
    try {
      const payload: any = { page: 1, limit: 50, search: searchText, holderRole: '' };
      const res: any = await fetchProductsForRequest(payload).unwrap();
      setProductBrowseList(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch {
      setProductBrowseList([]);
    }
  };

  const onCreateQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    try {
      const response: any = await createQuery({
        subject: form.subject.trim(),
        message: form.message.trim(),
        queryType: form.queryType,
        productRequest:
          form.queryType === 'product-request'
            ? {
                productRefId: form.productRequest.productRefId || undefined,
                preferredProductName: form.productRequest.preferredProductName || undefined,
                preferredColor: form.productRequest.preferredColor || undefined,
                preferredCut: form.productRequest.preferredCut || undefined,
                preferredCarat: form.productRequest.preferredCarat ? Number(form.productRequest.preferredCarat) : undefined,
                qty: form.productRequest.qty ? Number(form.productRequest.qty) : undefined,
                budgetPerCarat: form.productRequest.budgetPerCarat ? Number(form.productRequest.budgetPerCarat) : undefined,
              }
            : undefined,
        priority: form.priority,
        deadlineAt: form.deadlineAt || undefined,
        documents: form.documents,
      }).unwrap();

      toast.success(response?.message || 'Query created');
      setForm(initialForm);
      setIsCreateModalOpen(false);
      refetchMyQueries();
      if (isAdmin) {
        loadAllQueries();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create query');
    }
  };

  const openEditModal = (query: any, canEdit = true) => {
    const latestAction = Array.isArray(query?.actionLogs) && query.actionLogs.length > 0 ? query.actionLogs[query.actionLogs.length - 1] : null;
    setEditModal({
      id: query?._id || '',
      status: query?.status || 'new',
      remark: latestAction?.remark || '',
      deadlineAt: toDateInput(query?.deadlineAt),
      assignedToUserId: `${query?.assignedToUserId || ''}`,
      query,
      canEdit,
    });
  };

  const onSaveEdit = async () => {
    if (!editModal?.id) return;
    try {
      const response: any = await updateQueryStatus({
        id: editModal.id,
        status: editModal.status,
        remark: editModal.remark || undefined,
        deadlineAt: editModal.deadlineAt || undefined,
        assignedToUserId: editModal.assignedToUserId || null,
      }).unwrap();
      toast.success(response?.message || 'Status updated');
      setEditModal(null);
      refetchMyQueries();
      if (isAdmin) {
        loadAllQueries();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update status');
    }
  };

  const clearMyFilters = () => {
    setMySearch('');
    setMyStatus('');
    setMyStartDate('');
    setMyEndDate('');
    setMyPage(1);
  };

  const clearAdminFilters = () => {
    setAdminSearch('');
    setAdminStatus('');
    setAdminStartDate('');
    setAdminEndDate('');
    setAdminPage(1);
  };

  return (
    <>
      <Header />
      <div className="content-body user-list-page contact-admin-page">
        <div className="container-fluid">
          <div className="row page-titles mx-0 mb-3">
            <div className="col-sm-12 p-md-0">
              <div className="welcome-text">
                <h4 className="mb-1">Contact Admin</h4>
                <span className="text-muted">Raise support queries, upload documents, and track actions.</span>
              </div>
            </div>
          </div>

          <div className="card users-table-card mb-3">
            <div className="card-header border-0 pb-0 d-flex flex-wrap justify-content-between align-items-center">
              <div>
                <h4 className="card-title mb-2 mb-sm-0">My Queries</h4>
                <i className="text-muted card-subtitle-note">View status, attachments, and history of your raised queries.</i>
              </div>
              <div className="d-flex action-gap-sm">
                <button
                  className="btn btn-outline-primary"
                  type="button"
                  onClick={() => {
                    setForm(initialForm);
                    setProductBrowseList([]);
                    setProductBrowseSearch('');
                    setIsCreateModalOpen(true);
                  }}
                >
                  <i className="fa fa-plus mr-1" />
                  Add New
                </button>
                <button className="btn btn-primary" type="button" onClick={() => refetchMyQueries()} disabled={isMyQueriesLoading}>
                  <i className={`fa ${isMyQueriesLoading ? 'fa-spinner fa-spin' : 'fa-refresh'}`} />
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3 align-items-end">
                <div className="col-md-4 mb-2">
                  <label className="mb-1 small text-muted">Search</label>
                  <div className="input-group">
                    <input className="form-control" placeholder="Search subject/message/status" value={mySearch} onChange={(e) => setMySearch(e.target.value)} />
                    <div className="input-group-append">
                      <button className="btn btn-outline-secondary" type="button" title="Clear filters" onClick={clearMyFilters}>
                        <i className="fa fa-filter" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 mb-2">
                  <label className="mb-1 small text-muted">Status</label>
                  <select className="form-control" value={myStatus} onChange={(e) => setMyStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={`my-status-${status}`} value={status}>
                        {toReadableStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2 mb-2">
                  <label className="mb-1 small text-muted">Start date</label>
                  <input type="date" className="form-control" value={myStartDate} onChange={(e) => setMyStartDate(e.target.value)} />
                </div>
                <div className="col-md-2 mb-2">
                  <label className="mb-1 small text-muted">End date</label>
                  <input type="date" className="form-control" value={myEndDate} onChange={(e) => setMyEndDate(e.target.value)} />
                </div>
                <div className="col-md-2 mb-2">
                  <label className="mb-1 small text-muted">Rows per page</label>
                  <select className="form-control" value={myLimit} onChange={(e) => setMyLimit(Number(e.target.value))}>
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isMyQueriesLoading && <p className="text-muted mb-0">Loading...</p>}
              {!isMyQueriesLoading && myVisibleQueries.length === 0 && <p className="text-muted mb-0">No queries found.</p>}
              {!isMyQueriesLoading && myVisibleQueries.length > 0 && (
                <div className="table-responsive table-ui-responsive users-table-wrapper">
                  <table className="table table-ui text-center mb-0">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Deadline</th>
                        <th>Attachments</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myVisibleQueries.map((query: any) => (
                        <tr key={query?._id}>
                          <td>{query?.subject || '-'}</td>
                          <td>{query?.message || '-'}</td>
                          <td className="text-capitalize">{toReadableStatus(query?.status)}</td>
                          <td className="text-capitalize">{query?.priority || '-'}</td>
                          <td>{formatDate(query?.deadlineAt)}</td>
                          <td>
                            <AttachmentCell query={query} keyPrefix={`${query?._id}-my-file`} />
                          </td>
                          <td>{formatDateTime(query?.createdAt)}</td>
                          <td>
                            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => openEditModal(query, false)}>
                              <i className="fa fa-eye mr-1" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <PaginationBar page={myPage} totalPages={myTotalPages} onPrev={() => setMyPage((p) => Math.max(1, p - 1))} onNext={() => setMyPage((p) => Math.min(myTotalPages, p + 1))} totalLabel={`Total ${filteredMyQueries.length}`} />
            </div>
          </div>

          {isAdmin && (
            <>
              <div className="card users-table-card mb-3">
                <div className="card-header border-0 pb-0 d-flex flex-wrap justify-content-between align-items-center">
                  <div>
                    <h4 className="card-title mb-2 mb-sm-0">All Queries (Admin)</h4>
                    <i className="text-muted card-subtitle-note">Manage user queries, attachments, deadlines and status actions.</i>
                  </div>
                  <button className="btn btn-primary" type="button" onClick={loadAllQueries} disabled={isAllQueriesLoading}>
                    <i className={`fa ${isAllQueriesLoading ? 'fa-spinner fa-spin' : 'fa-refresh'}`} />
                  </button>
                </div>
                <div className="card-body">
                  <div className="row mb-3 align-items-end">
                    <div className="col-md-4 mb-2">
                      <label className="mb-1 small text-muted">Search</label>
                      <div className="input-group">
                        <input
                          className="form-control"
                          placeholder="Search user/subject/message"
                          value={adminSearch}
                          onChange={(e) => {
                            setAdminSearch(e.target.value);
                            setAdminPage(1);
                          }}
                        />
                        <div className="input-group-append">
                          <button className="btn btn-outline-secondary" type="button" title="Clear filters" onClick={clearAdminFilters}>
                            <i className="fa fa-filter" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="mb-1 small text-muted">Status</label>
                      <select
                        className="form-control"
                        value={adminStatus}
                        onChange={(e) => {
                          setAdminStatus(e.target.value);
                          setAdminPage(1);
                        }}
                      >
                        <option value="">All Status</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={`admin-status-${status}`} value={status}>
                            {toReadableStatus(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="mb-1 small text-muted">Start date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={adminStartDate}
                        onChange={(e) => {
                          setAdminStartDate(e.target.value);
                          setAdminPage(1);
                        }}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="mb-1 small text-muted">End date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={adminEndDate}
                        onChange={(e) => {
                          setAdminEndDate(e.target.value);
                          setAdminPage(1);
                        }}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="mb-1 small text-muted">Rows per page</label>
                      <select
                        className="form-control"
                        value={adminLimit}
                        onChange={(e) => {
                          setAdminLimit(Number(e.target.value));
                          setAdminPage(1);
                        }}
                      >
                        {[10, 25, 50].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isAllQueriesLoading && <p className="text-muted mb-0">Loading...</p>}
                  {!isAllQueriesLoading && allQueries.length === 0 && <p className="text-muted mb-0">No queries found.</p>}
                  {!isAllQueriesLoading && allQueries.length > 0 && (
                    <div className="table-responsive table-ui-responsive users-table-wrapper">
                      <table className="table table-ui text-center mb-0">
                        <thead>
                          <tr>
                            <th>User Name</th>
                            <th>User Email</th>
                            <th>Subject</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Assignee</th>
                            <th>Deadline</th>
                            <th>Attachments</th>
                            <th>Created</th>
                            <th>Updated</th>
                            <th>Latest Action</th>
                            <th>Edit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allQueries.map((query: any) => {
                            const latestAction = Array.isArray(query?.actionLogs) && query.actionLogs.length > 0 ? query.actionLogs[query.actionLogs.length - 1] : null;
                            return (
                              <tr key={query?._id}>
                                <td>{query?.userName || '-'}</td>
                                <td>{query?.userEmail || '-'}</td>
                                <td>{query?.subject || '-'}</td>
                                <td>{query?.message || '-'}</td>
                                <td className="text-capitalize">{toReadableStatus(query?.status)}</td>
                                <td className="text-capitalize">{query?.priority || '-'}</td>
                                <td>{query?.assignedToName || query?.assignedToEmail || '-'}</td>
                                <td>{formatDate(query?.deadlineAt)}</td>
                                <td>
                                  <AttachmentCell query={query} keyPrefix={`${query?._id}-admin-file`} />
                                </td>
                                <td>{formatDateTime(query?.createdAt)}</td>
                                <td>{formatDateTime(query?.updatedAt)}</td>
                                <td>{latestAction ? `${latestAction?.action || '-'} (${latestAction?.status || '-'})` : '-'}</td>
                                <td>
                                  <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => openEditModal(query, true)}>
                                    <i className="fa fa-pencil mr-1" />
                                    Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <PaginationBar page={adminPage} totalPages={adminTotalPages} onPrev={() => setAdminPage((p) => Math.max(1, p - 1))} onNext={() => setAdminPage((p) => Math.min(adminTotalPages, p + 1))} totalLabel={`Total ${allQueriesTotal}`} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="contact-admin-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="card contact-admin-modal contact-admin-modal--create" onClick={(event) => event.stopPropagation()}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Raise New Query</h5>
              <button className="btn btn-sm btn-light" onClick={() => setIsCreateModalOpen(false)} type="button">
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="card-body contact-admin-modal-body">
              <form id="contact-query-form" onSubmit={onCreateQuery}>
                <div className="form-row">
                  {isJeweler && (
                    <div className="form-group col-md-3">
                      <label>Request Type</label>
                      <select
                        className="form-control"
                        value={form.queryType}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            queryType: e.target.value as QueryForm['queryType'],
                          }))
                        }
                      >
                        <option value="general">General</option>
                        <option value="product-request">Product Request</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group col-md-6">
                    <label>Subject</label>
                    <input className="form-control" value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder="Enter subject" />
                  </div>
                  <div className="form-group col-md-3">
                    <label>Priority</label>
                    <select className="form-control" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as QueryForm['priority'] }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group col-md-3">
                    <label>Deadline</label>
                    <input type="date" className="form-control" value={form.deadlineAt} onChange={(e) => setForm((prev) => ({ ...prev, deadlineAt: e.target.value }))} />
                  </div>
                </div>
                {isJeweler && form.queryType === 'product-request' && (
                  <div className="border rounded p-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                      <label className="mb-1">Browse Products</label>
                      <div className="d-flex align-items-center product-browse-actions">
                        <input className="form-control product-browse-search" value={productBrowseSearch} onChange={(e) => setProductBrowseSearch(e.target.value)} placeholder="Search code/style/client" />
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => loadProductsForRequest(productBrowseSearch)} disabled={isProductBrowseLoading}>
                          {isProductBrowseLoading ? 'Loading...' : 'Load'}
                        </button>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group col-md-6">
                        <label>Select Product (optional)</label>
                        <select
                          className="form-control"
                          value={form.productRequest.productRefId}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              productRequest: { ...prev.productRequest, productRefId: e.target.value },
                            }))
                          }
                        >
                          <option value="">Select</option>
                          {productBrowseList.map((item) => (
                            <option key={item?._id} value={item?._id}>
                              {`${item?.product?.jewelCode || '-'} | ${item?.product?.styleCode || '-'} | holder: ${item?.currentHolder?.role || '-'}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group col-md-6">
                        <label>Preferred Product Name</label>
                        <input
                          className="form-control"
                          value={form.productRequest.preferredProductName}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              productRequest: { ...prev.productRequest, preferredProductName: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="form-group col-md-3">
                        <label>Preferred Color</label>
                        <input
                          className="form-control"
                          value={form.productRequest.preferredColor}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              productRequest: { ...prev.productRequest, preferredColor: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="form-group col-md-3">
                        <label>Preferred Cut</label>
                        <input
                          className="form-control"
                          value={form.productRequest.preferredCut}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              productRequest: { ...prev.productRequest, preferredCut: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="form-group col-md-2">
                        <label>Carat</label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.productRequest.preferredCarat}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              productRequest: { ...prev.productRequest, preferredCarat: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="form-group col-md-2">
                        <label>Qty</label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.productRequest.qty}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              productRequest: { ...prev.productRequest, qty: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="form-group col-md-2">
                        <label>Budget/Carat</label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.productRequest.budgetPerCarat}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              productRequest: { ...prev.productRequest, budgetPerCarat: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>Message</label>
                  <textarea className="form-control" rows={4} value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Write your query" />
                </div>
                <div className="form-group">
                  <label>Upload Documents (max 5)</label>
                  <input type="file" className="form-control" multiple onChange={onFileChange} accept=".pdf,.png,.jpg,.jpeg,.webp,.heic" />
                  {form.documents.length > 0 && <small className="text-muted d-block mt-1">{form.documents.length} file(s) selected</small>}
                </div>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-outline-secondary mr-2" type="button" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isCreating}>
                    {isCreating ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="contact-admin-modal-backdrop" onClick={() => setEditModal(null)}>
          <div className="card contact-admin-modal contact-admin-modal--edit" onClick={(event) => event.stopPropagation()}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{editModal.canEdit ? 'Query Details and Action' : 'Query Details'}</h5>
              <div className="d-flex justify-content-end">
                <button className="btn btn-outline-secondary mr-2" type="button" onClick={() => setEditModal(null)}>
                  Close
                </button>
                {editModal.canEdit && (
                  <button className="btn btn-primary  mr-2" type="button" onClick={onSaveEdit} disabled={isUpdatingStatus}>
                    {isUpdatingStatus ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button className="btn btn-sm btn-light" onClick={() => setEditModal(null)} type="button">
                  <i className="fa fa-times" />
                </button>
              </div>
            </div>
            <div className="card-body contact-admin-modal-body">
              <div className="row">
                <div className="col-md-3 mb-2">
                  <small className="text-muted d-block">Status</small>
                  <div className="text-capitalize">{toReadableStatus(editModal.query?.status)}</div>
                </div>
                <div className="col-md-3 mb-2">
                  <small className="text-muted d-block">User Name</small>
                  <div>{editModal.query?.userName || '-'}</div>
                </div>
                <div className="col-md-3 mb-2">
                  <small className="text-muted d-block">User Email</small>
                  <div>{editModal.query?.userEmail || '-'}</div>
                </div>
                <div className="col-md-3 mb-2">
                  <small className="text-muted d-block">Priority</small>
                  <div className="text-capitalize">{editModal.query?.priority || '-'}</div>
                </div>
                <div className="col-md-4 mb-2">
                  <small className="text-muted d-block">Deadline</small>
                  <div>{formatDateTime(editModal.query?.deadlineAt)}</div>
                </div>
                <div className="col-md-4 mb-2">
                  <small className="text-muted d-block">Assigned To</small>
                  <div>{editModal.query?.assignedToName || editModal.query?.assignedToEmail || '-'}</div>
                </div>
                <div className="col-md-4 mb-2">
                  <small className="text-muted d-block">Created At</small>
                  <div>{formatDateTime(editModal.query?.createdAt)}</div>
                </div>
                <div className="col-md-4 mb-2">
                  <small className="text-muted d-block">Updated At</small>
                  <div>{formatDateTime(editModal.query?.updatedAt)}</div>
                </div>
                <div className="col-6 mb-2">
                  <small className="text-muted d-block">Subject</small>
                  <div className="border rounded p-2">{editModal.query?.subject || '-'}</div>
                </div>
                <div className="col-6 mb-2">
                  <small className="text-muted d-block">Message</small>
                  <div className="border rounded p-2">{editModal.query?.message || '-'}</div>
                </div>
                <div className="col-12 mb-2">
                  <small className="text-muted d-block">Attachments</small>
                  <div className="border rounded p-2">
                    <AttachmentCell query={editModal.query} keyPrefix={`${editModal.id}-modal-file`} />
                  </div>
                </div>
                <div className="col-12 mb-3">
                  <small className="text-muted d-block">Action Logs</small>
                  <div className="border rounded p-2 action-log-scroll">
                    {Array.isArray(editModal.query?.actionLogs) && editModal.query.actionLogs.length > 0 ? (
                      editModal.query.actionLogs.map((log: any, idx: number) => (
                        <div key={`${editModal.id}-log-${idx}`} className="mb-2">
                          <strong>{log?.action || '-'}</strong> ({toReadableStatus(log?.status)})
                          <div className="text-muted action-log-note">
                            {formatDateTime(log?.createdAt)} {log?.remark ? `| ${log.remark}` : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted">No actions available.</span>
                    )}
                  </div>
                </div>
              </div>

              {editModal.canEdit && (
                <>
                  <div className="row">
                    <div className="col-md-4 form-group">
                      <label>Update Status</label>
                      <select className="form-control" value={editModal.status} onChange={(e) => setEditModal((prev) => (prev ? { ...prev, status: e.target.value } : prev))}>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={`edit-status-${status}`} value={status}>
                            {toReadableStatus(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Assign Ticket</label>
                      <select className="form-control" value={editModal.assignedToUserId} onChange={(e) => setEditModal((prev) => (prev ? { ...prev, assignedToUserId: e.target.value } : prev))}>
                        <option value="">Unassigned</option>
                        {assignableUsers.map((assignee) => (
                          <option key={assignee.id} value={assignee.id}>
                            {assignee.name ? `${assignee.name} (${assignee.email})` : assignee.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Update Deadline</label>
                      <input type="date" className="form-control" value={editModal.deadlineAt} onChange={(e) => setEditModal((prev) => (prev ? { ...prev, deadlineAt: e.target.value } : prev))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Remark</label>
                    <textarea className="form-control" rows={3} value={editModal.remark} onChange={(e) => setEditModal((prev) => (prev ? { ...prev, remark: e.target.value } : prev))} placeholder="Enter action remark" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
