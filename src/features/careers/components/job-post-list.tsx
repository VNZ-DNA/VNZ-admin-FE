import { Button, Chip, Skeleton, useOverlayState } from "@heroui/react";
import axios from "axios";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { useDepartments } from "@/features/careers/hooks/use-departments";
import { useDeleteJobPost } from "@/features/careers/hooks/use-delete-job-post";
import { useJobPosts } from "@/features/careers/hooks/use-job-posts";
import { JobPostDeleteConfirmationModal } from "@/features/careers/components/job-post-delete-confirmation-modal";
import { isJobPostEditableStatus } from "@/features/careers/job-post-status";
import {
  JOB_POST_LEVELS,
  type JobPostLevel,
  type JobPostListItem,
  type JobPostStatusFilter,
} from "@/features/careers/types";
import type { ApiResponse } from "@/lib/http/api-response";
import { ROUTE_PATHS } from "@/routes/route-paths";

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const statusOptions: Array<{ label: string; value: JobPostStatusFilter }> = [
  { label: "Bản nháp", value: "Draft" },
  { label: "Đang tuyển", value: "Open" },
  { label: "Đã đóng", value: "Closed" },
  { label: "Đã hết hạn", value: "Expired" },
];

type JobPostFilterOption = { label: string; value: string };

type JobPostMultiSelectFilterProps = {
  label: string;
  options: JobPostFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
};

function JobPostMultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  disabled = false,
}: JobPostMultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function toggleValue(value: string) {
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues, value];

    onChange(
      options
        .filter((option) => nextValues.includes(option.value))
        .map((option) => option.value),
    );
  }

  return (
    <div ref={filterRef} className="job-post-list__filter">
      <button
        type="button"
        className="job-post-list__filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          {selectedValues.length > 0
            ? `${label} · ${selectedValues.length}`
            : label}
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="job-post-list__filter-menu"
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
        >
          <div className="job-post-list__filter-menu-header">
            <span>{label}</span>
            {selectedValues.length > 0 && (
              <button type="button" onClick={() => onChange([])}>
                Xóa chọn
              </button>
            )}
          </div>
          {options.length > 0 ? (
            options.map((option) => {
              const isSelected = selectedValues.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`job-post-list__filter-option ${isSelected ? "is-selected" : ""}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleValue(option.value)}
                >
                  <span
                    className="job-post-list__filter-checkbox"
                    aria-hidden="true"
                  >
                    {isSelected && <Check size={12} strokeWidth={2.4} />}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })
          ) : (
            <p className="job-post-list__filter-empty">Chưa có dữ liệu</p>
          )}
        </div>
      )}
    </div>
  );
}

type JobPostRowActionsProps = {
  postId: string;
  title: string;
  isEditableStatus: boolean;
  canDelete?: boolean;
  deleteBlockedReason?: string | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onRequestDelete: () => void;
};

function JobPostRowActions({
  postId,
  title,
  isEditableStatus,
  canDelete = false,
  deleteBlockedReason,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
  onRequestDelete,
}: JobPostRowActionsProps) {
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const triggerRect = actionsRef.current?.getBoundingClientRect();
    if (!triggerRect) return;

    const menuWidth = 160;
    const menuHeight = isEditableStatus ? 132 : 100;
    const viewportPadding = 8;
    const gap = 5;
    const left = Math.max(
      viewportPadding,
      Math.min(
        triggerRect.right - menuWidth,
        window.innerWidth - menuWidth - viewportPadding,
      ),
    );
    const top =
      triggerRect.bottom + gap + menuHeight <=
      window.innerHeight - viewportPadding
        ? triggerRect.bottom + gap
        : Math.max(viewportPadding, triggerRect.top - gap - menuHeight);

    setMenuPosition({ top, left });
  }, [isEditableStatus]);

  function navigateTo(path: string) {
    setMenuPosition(null);
    onClose();
    onNavigate(path);
  }

  function toggleMenu() {
    if (isOpen) {
      setMenuPosition(null);
      onClose();
      return;
    }

    updateMenuPosition();
    onOpen();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !actionsRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setMenuPosition(null);
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuPosition(null);
        onClose();
      }
    }

    updateMenuPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isEditableStatus, isOpen, onClose, updateMenuPosition]);

  return (
    <div ref={actionsRef} className="job-post-list__row-actions">
      <button
        type="button"
        className="job-post-list__row-actions-trigger"
        aria-label={`Thao tác với ${title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="job-post-list__row-menu"
            role="menu"
            style={menuPosition}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => navigateTo(`/careers/${postId}`)}
            >
              <FileText size={14} aria-hidden="true" />
              <span>Xem chi tiết</span>
            </button>
            {isEditableStatus && (
              <button
                type="button"
                role="menuitem"
                onClick={() => navigateTo(`/careers/${postId}/edit`)}
              >
                <Pencil size={14} aria-hidden="true" />
                <span>Chỉnh sửa</span>
              </button>
            )}
            <div
              className="job-post-list__row-menu-separator"
              role="separator"
            />
            <button
              type="button"
              className="job-post-list__row-menu-danger"
              role="menuitem"
              disabled={!canDelete}
              title={
                !canDelete
                  ? deleteBlockedReason ||
                    "Tin tuyển dụng chưa thể xóa ở trạng thái hiện tại."
                  : undefined
              }
              onClick={() => {
                if (!canDelete) return;
                setMenuPosition(null);
                onClose();
                onRequestDelete();
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>Xóa</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getStatusClassName(status: string): string {
  const normalizedStatus = status.trim().toLocaleLowerCase("vi-VN");

  if (normalizedStatus === "bản nháp" || normalizedStatus === "draft")
    return "draft";
  if (normalizedStatus === "đang tuyển" || normalizedStatus === "open")
    return "open";
  if (normalizedStatus === "đã đóng" || normalizedStatus === "closed")
    return "closed";
  if (normalizedStatus === "đã hết hạn" || normalizedStatus === "expired")
    return "expired";

  return "default";
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return (
      error.response?.data?.message || "Không thể tải danh sách tin tuyển dụng."
    );
  }

  return "Không thể tải danh sách tin tuyển dụng.";
}

function getDeleteErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error))
    return "Không thể xóa tin tuyển dụng.";

  if (error.response?.data?.errors?.code === "JOB_POST_DELETE_FORBIDDEN") {
    return "Tin tuyển dụng đang hiển thị công khai. Hãy đóng tin trước khi xóa.";
  }

  return error.response?.data?.message || "Không thể xóa tin tuyển dụng.";
}

function JobPostListSkeleton() {
  return (
    <div
      className="job-post-list__skeleton"
      aria-label="Đang tải danh sách tin tuyển dụng"
    >
      <Skeleton className="job-post-list__skeleton-heading" />
      <div className="job-post-list__skeleton-filters">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
      <Skeleton className="job-post-list__skeleton-table" />
    </div>
  );
}

export function JobPostList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<JobPostStatusFilter[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [jobLevels, setJobLevels] = useState<JobPostLevel[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobPostListItem | null>(
    null,
  );
  const deleteConfirmation = useOverlayState();
  const deleteJobPost = useDeleteJobPost();
  const departmentsQuery = useDepartments();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      setSearch(nextSearch);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const jobPostsQuery = useJobPosts({
    search: search || undefined,
    status: statuses.length > 0 ? statuses : undefined,
    departmentId: departmentIds.length > 0 ? departmentIds : undefined,
    jobLevel: jobLevels.length > 0 ? jobLevels : undefined,
    page,
    pageSize,
  });

  if (jobPostsQuery.isPending) {
    return <JobPostListSkeleton />;
  }

  if (!jobPostsQuery.data || jobPostsQuery.error) {
    return (
      <section className="job-post-list__error">
        <h1>Quản lý tuyển dụng</h1>
        <p>{getErrorMessage(jobPostsQuery.error)}</p>
        <Button
          type="button"
          variant="primary"
          onClick={() => void jobPostsQuery.refetch()}
        >
          Thử lại
        </Button>
      </section>
    );
  }

  const data = jobPostsQuery.data;
  const departmentOptions = (departmentsQuery.data ?? []).map((department) => ({
    label: department.name,
    value: department.id,
  }));
  const jobLevelOptions = JOB_POST_LEVELS.map((level) => ({
    label: level,
    value: level,
  }));

  function requestDelete(jobPost: JobPostListItem) {
    deleteJobPost.reset();
    setDeleteTarget(jobPost);
    deleteConfirmation.open();
  }

  async function confirmDelete() {
    if (
      !deleteTarget ||
      deleteJobPost.isPending ||
      deleteTarget.canDelete !== true
    )
      return;

    try {
      await deleteJobPost.mutateAsync(deleteTarget.id);
      deleteConfirmation.close();
      setDeleteTarget(null);
    } catch {
      // Keep the modal open so the backend error remains visible in context.
    }
  }

  return (
    <section
      className={`job-post-list ${location.state?.careerNavigation === "back-to-list" ? "job-post-list--back-enter" : ""}`}
    >
      <header className="job-post-list__heading">
        <h1>Quản lý tuyển dụng</h1>
        <div className="job-post-list__heading-actions">
          <Button
            className="job-post-list__create"
            type="button"
            variant="primary"
            aria-label="Tạo tin tuyển dụng mới"
            onClick={() => navigate(ROUTE_PATHS.CAREER_CREATE)}
          >
            <Plus size={16} aria-hidden="true" />
            Tạo tin tuyển dụng mới
          </Button>
        </div>
      </header>

      <div className="job-post-list__filters" aria-label="Bộ lọc tuyển dụng">
        <label className="job-post-list__search">
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            value={searchInput}
            maxLength={300}
            aria-label="Tìm kiếm theo tên công việc"
            placeholder="Tìm kiếm theo tên công việc..."
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <JobPostMultiSelectFilter
          label="Trạng thái"
          options={statusOptions}
          selectedValues={statuses}
          onChange={(values) => {
            setStatuses(values as JobPostStatusFilter[]);
            setPage(1);
          }}
        />

        <JobPostMultiSelectFilter
          label="Phòng ban"
          options={departmentOptions}
          selectedValues={departmentIds}
          disabled={
            departmentsQuery.isPending || Boolean(departmentsQuery.error)
          }
          onChange={(values) => {
            setDepartmentIds(values);
            setPage(1);
          }}
        />

        <JobPostMultiSelectFilter
          label="Cấp bậc"
          options={jobLevelOptions}
          selectedValues={jobLevels}
          onChange={(values) => {
            setJobLevels(values as JobPostLevel[]);
            setPage(1);
          }}
        />
      </div>

      {departmentsQuery.error && (
        <div className="job-post-list__filter-error" role="alert">
          <span>Không thể tải phòng ban để lọc.</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void departmentsQuery.refetch()}
          >
            Thử lại
          </Button>
        </div>
      )}

      <div
        className={`job-post-list__content ${jobPostsQuery.isFetching ? "job-post-list__content--refreshing" : ""}`}
        aria-busy={jobPostsQuery.isFetching}
      >
        {jobPostsQuery.isFetching && (
          <div className="job-post-list__table-loading" role="status">
            <span
              className="job-post-list__table-loading-dot"
              aria-hidden="true"
            />
            Đang tải dữ liệu...
          </div>
        )}
        {data.items.length > 0 ? (
          <div className="job-post-list__table-scroll">
            <table
              className="job-post-list__table"
              aria-label="Danh sách tin tuyển dụng"
            >
              <thead>
                <tr>
                  <th scope="col">Tên công việc</th>
                  <th scope="col">Mô tả ngắn</th>
                  <th scope="col">Ngày hết hạn</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Chỉ tiêu</th>
                  <th scope="col">Số đơn chờ duyệt</th>
                  <th scope="col" className="job-post-list__actions-heading">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="job-post-list__row">
                    <td>
                      <span className="job-post-list__title">{item.title}</span>
                    </td>
                    <td>
                      <span className="job-post-list__description">
                        {item.shortDescription || "—"}
                      </span>
                    </td>
                    <td>{formatDate(item.expiredDate)}</td>
                    <td>
                      <Chip
                        className={`job-post-list__status job-post-list__status--${getStatusClassName(item.status)}`}
                        color="default"
                        size="sm"
                        variant="secondary"
                      >
                        {item.status}
                      </Chip>
                    </td>
                    <td>{item.numberOfPositions}</td>
                    <td>{item.pendingApplicationCount}</td>
                    <td className="job-post-list__actions-cell">
                      <JobPostRowActions
                        postId={item.id}
                        title={item.title}
                        isEditableStatus={isJobPostEditableStatus(item.status)}
                        canDelete={item.canDelete}
                        deleteBlockedReason={
                          item.deleteBlockedReason === "PUBLIC_VISIBLE"
                            ? "Tin tuyển dụng đang hiển thị công khai. Hãy đóng tin trước khi xóa."
                            : item.deleteBlockedReason
                        }
                        isOpen={openActionId === item.id}
                        onOpen={() => setOpenActionId(item.id)}
                        onClose={() => setOpenActionId(null)}
                        onNavigate={navigate}
                        onRequestDelete={() => requestDelete(item)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="job-post-list__empty">
            <p>Không tìm thấy tin tuyển dụng phù hợp.</p>
          </div>
        )}

        <footer className="job-post-list__pagination">
          <label className="job-post-list__page-size">
            <span>Số dòng/trang</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="job-post-list__pagination-controls">
            <div className="job-post-list__pagination-actions">
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang đầu"
                isDisabled={data.page <= 1 || jobPostsQuery.isFetching}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang trước"
                isDisabled={data.page <= 1 || jobPostsQuery.isFetching}
                onClick={() =>
                  setPage((currentPage) => Math.max(1, currentPage - 1))
                }
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang sau"
                isDisabled={
                  data.totalPages === 0 ||
                  data.page >= data.totalPages ||
                  jobPostsQuery.isFetching
                }
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                <ChevronRight size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang cuối"
                isDisabled={
                  data.totalPages === 0 ||
                  data.page >= data.totalPages ||
                  jobPostsQuery.isFetching
                }
                onClick={() => setPage(data.totalPages)}
              >
                <ChevronsRight size={17} />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      <JobPostDeleteConfirmationModal
        state={deleteConfirmation}
        jobPostTitle={deleteTarget?.title ?? null}
        isPending={deleteJobPost.isPending}
        errorMessage={
          deleteJobPost.error
            ? getDeleteErrorMessage(deleteJobPost.error)
            : null
        }
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
