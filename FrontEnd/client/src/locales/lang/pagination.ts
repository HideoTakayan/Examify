/** Pagination strings — merged explicitly in i18n init so keys are never missing. */
export const paginationByLang = {
  vi: {
    showing_range: '({{from}}–{{to}})',
    empty: 'Không có bản ghi',
    select_all_page: 'Chọn tất cả trên trang này',
    total_count: 'Tổng: {{total}}',
    page_size_option: '{{size}}/trang',
    page_size_label: 'Số dòng / trang',
    go_to: 'Đến trang',
    page_label: 'Trang',
  },
  en: {
    showing_range: '({{from}}–{{to}})',
    empty: 'No records',
    select_all_page: 'Select all on this page',
    total_count: 'Total: {{total}}',
    page_size_option: '{{size}}/page',
    page_size_label: 'Rows per page',
    go_to: 'Go to page',
    page_label: 'Page',
  },
  ja: {
    showing_range: '({{from}}–{{to}})',
    empty: 'データがありません',
    select_all_page: 'このページをすべて選択',
    total_count: '合計: {{total}}',
    page_size_option: '{{size}}件/ページ',
    page_size_label: '1ページの行数',
    go_to: 'ページへ',
    page_label: 'ページ',
  },
} as const;
