export function sortData<T extends Record<string, any>>(
  data: T[],
  sortCol: keyof T,
  sortDir: 'asc' | 'desc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[sortCol];
    const bVal = b[sortCol];
    const dir = sortDir === 'asc' ? 1 : -1;
    
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir;
    }
    
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
}
