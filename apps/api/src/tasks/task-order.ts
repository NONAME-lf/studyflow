/** K2: ids of a kanban column after placing `id` at `index` (clamped to the column size). */
export function placeInColumn(columnIds: string[], id: string, index: number): string[] {
  const rest = columnIds.filter((x) => x !== id);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}
