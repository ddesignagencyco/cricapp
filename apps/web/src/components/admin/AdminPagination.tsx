import Pagination, { type PaginationProps } from '../Pagination';

export default function AdminPagination(props: PaginationProps) {
  return <Pagination {...props} className={`!mt-0 ${props.className || ''}`} />;
}
