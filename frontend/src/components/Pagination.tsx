import { Button, Dropdown } from 'react-bootstrap';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalElements,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50]
}: PaginationProps) {
  if (totalPages === 0) {
    return null;
  }

  return (
    <div className="d-flex justify-content-end align-items-center gap-3 mt-4 mb-0">
      <div className="d-flex align-items-center gap-2 me-3">
        <span className="text-muted small">На странице:</span>
        <Dropdown onSelect={(key) => onPageSizeChange(Number(key))}>
          <Dropdown.Toggle
            id="page-size-dropdown"
            className="select-pill select-pill-sm"
          >
            {pageSize} <span className="text-muted ms-1">шт.</span>
          </Dropdown.Toggle>
          <Dropdown.Menu className="select-menu">
            {pageSizeOptions.map(size => (
              <Dropdown.Item
                key={size}
                eventKey={size.toString()}
                active={pageSize === size}
              >
                {size} {pageSize === size && <i className="bi bi-check2 ms-2" />}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
      <Button
        size="sm"
        variant="link"
        className="p-0"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <i
          className="bi bi-chevron-left"
          style={{ fontSize: 20, color: currentPage > 0 ? '#2f7fc4' : '#b0b0b0' }}
        />
      </Button>
      <span className="text-muted small">
        {currentPage + 1} из {Math.max(1, totalPages)}
      </span>
      <Button
        size="sm"
        variant="link"
        className="p-0"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <i
          className="bi bi-chevron-right"
          style={{ fontSize: 20, color: currentPage < totalPages - 1 ? '#2f7fc4' : '#b0b0b0' }}
        />
      </Button>
    </div>
  );
}
