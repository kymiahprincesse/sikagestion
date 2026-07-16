import { memo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Table optimisée pour mobile avec vue carte alternative
 * Affiche les données sous forme de cartes sur mobile
 * et sous forme de table sur desktop
 */

export const MobileTable = memo(function MobileTable({
  data,
  columns,
  onRowClick,
  selectedId,
  emptyMessage = 'Aucune donnée disponible',
  loading = false,
  keyExtractor = (row) => row.id,
  renderMobileCard,
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mr-3"></div>
        Chargement...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 bg-background rounded-lg">
        {emptyMessage}
      </div>
    );
  }

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Vue mobile : cartes empilées
  const MobileCard = ({ row }) => {
    const id = keyExtractor(row);
    const isExpanded = expandedRows.has(id);
    const isSelected = selectedId === id;

    if (renderMobileCard) {
      return renderMobileCard(row, { isExpanded, isSelected, onClick: () => onRowClick?.(row) });
    }

    // Rendu par défaut
    const mainColumn = columns[0];
    const secondaryColumns = columns.slice(1, 3);
    const otherColumns = columns.slice(3);

    return (
      <div
        onClick={() => onRowClick?.(row)}
        className={`
          bg-surface rounded-lg shadow-sm border mb-2 overflow-hidden
          ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}
          ${onRowClick ? 'cursor-pointer active:bg-gray-50' : ''}
          transition-all duration-150
        `}
      >
        {/* En-tête de carte */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">
              {mainColumn.formatter ? mainColumn.formatter(row[mainColumn.key]) : row[mainColumn.key]}
            </div>
            <div className="flex gap-2 mt-1">
              {secondaryColumns.map((col) => (
                <span key={col.key} className="text-xs text-gray-500">
                  {col.label}: {' '}
                  <span className="text-gray-700">
                    {col.formatter ? col.formatter(row[col.key]) : row[col.key]}
                  </span>
                </span>
              ))}
            </div>
          </div>
          
          {otherColumns.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(id);
              }}
              className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
        </div>

        {/* Contenu expansé */}
        {isExpanded && otherColumns.length > 0 && (
          <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-1">
            {otherColumns.map((col) => (
              <div key={col.key} className="flex justify-between text-sm">
                <span className="text-gray-500">{col.label}</span>
                <span className="text-gray-900 font-medium">
                  {col.formatter ? col.formatter(row[col.key]) : row[col.key]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 md:hidden">
      {data.map((row) => (
        <MobileCard key={keyExtractor(row)} row={row} />
      ))}
    </div>
  );
});

/**
 * Wrapper qui combine table desktop + cartes mobile
 */
export const ResponsiveTable = memo(function ResponsiveTable({
  data,
  columns,
  onRowClick,
  selectedId,
  emptyMessage = 'Aucune donnée disponible',
  loading = false,
  keyExtractor = (row) => row.id,
  renderMobileCard,
  className = '',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mr-3"></div>
        Chargement...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 bg-background rounded-lg">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Vue Desktop : Table traditionnelle */}
      <div className={`hidden md:block overflow-x-auto ${className}`}>
        <table className="w-full min-w-[600px]">
          <thead className="bg-background sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row) => {
              const id = keyExtractor(row);
              const isSelected = selectedId === id;
              
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    hover:bg-gray-50 transition-colors
                    ${isSelected ? 'bg-blue-50' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-gray-900 whitespace-nowrap ${col.cellClassName || ''}`}
                    >
                      {col.formatter ? col.formatter(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vue Mobile : Cartes */}
      <MobileTable
        data={data}
        columns={columns}
        onRowClick={onRowClick}
        selectedId={selectedId}
        emptyMessage={emptyMessage}
        keyExtractor={keyExtractor}
        renderMobileCard={renderMobileCard}
      />
    </>
  );
});

export default ResponsiveTable;
