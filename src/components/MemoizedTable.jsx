/**
 * Table optimisée avec React.memo pour éviter les re-rendus inutiles
 * À utiliser pour les listes de données volumineuses
 */

import React, { memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── CELLULE MÉMOÏSÉE ─────────────────────────────────────
const TableCell = memo(function TableCell({ value, formatter, className }) {
  const formattedValue = formatter ? formatter(value) : value;
  return <td className={className}>{formattedValue}</td>;
});

// ── LIGNE MÉMOÏSÉE ───────────────────────────────────────
const TableRow = memo(function TableRow({ row, columns, onClick, isSelected }) {
  const handleClick = useCallback(() => onClick?.(row), [onClick, row]);

  return (
    <tr
      onClick={handleClick}
      className={`
        border-b border-gray-200 hover:bg-gray-50 transition-colors
        ${isSelected ? 'bg-blue-50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {columns.map((col) => (
        <TableCell
          key={col.key}
          value={row[col.key]}
          formatter={col.formatter}
          className={`px-4 py-3 text-sm ${col.className || ''}`}
        />
      ))}
    </tr>
  );
});

// ── TABLE PRINCIPALE MÉMOÏSÉE ────────────────────────────
export const MemoizedTable = memo(function MemoizedTable({
  data,
  columns,
  onRowClick,
  selectedId,
  emptyMessage = 'Aucune donnée disponible',
  loading = false,
  pagination,
}) {
  const handleRowClick = useCallback((row) => {
    onRowClick?.(row);
  }, [onRowClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        Chargement...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.headerClassName || ''}`}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <TableRow
              key={row.id || index}
              row={row}
              columns={columns}
              onClick={handleRowClick}
              isSelected={selectedId === row.id}
            />
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-700">
            Affichage de {pagination.startIndex + 1} à {Math.min(pagination.endIndex, pagination.total)} sur {pagination.total} résultats
          </div>
          <div className="flex gap-2">
            <button
              onClick={pagination.onPrevious}
              disabled={!pagination.hasPrevious}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={pagination.onNext}
              disabled={!pagination.hasNext}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ── LISTE MÉMOÏSÉE (alternative à la table) ────────────────
export const MemoizedList = memo(function MemoizedList({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'Aucun élément',
  loading = false,
  className = '',
}) {
  if (loading) {
    return <div className="p-4 text-center text-gray-500">Chargement...</div>;
  }

  if (!items || items.length === 0) {
    return <div className="p-4 text-center text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor ? keyExtractor(item) : index}>
          {renderItem(item)}
        </React.Fragment>
      ))}
    </div>
  );
});

// ── EXPORTS ───────────────────────────────────────────────
export default MemoizedTable;
