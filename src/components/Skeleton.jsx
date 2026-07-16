/**
 * Composants Skeleton pour les états de chargement
 * Améliore l'expérience utilisateur pendant le fetch des données
 * Style: Animation pulse avec couleurs SIKA
 */

import { memo } from 'react';

// ── BASE SKELETON ───────────────────────────────────────
const SkeletonBase = memo(function SkeletonBase({ 
  className = '',
  width,
  height,
  circle = false,
  style = {}
}) {
  return (
    <div
      className={`
        animate-pulse bg-gray-200
        ${circle ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={{
        width,
        height,
        ...style
      }}
    />
  );
});

// ── LIGNE DE TEXTE ──────────────────────────────────────
export const SkeletonText = memo(function SkeletonText({ 
  lines = 1, 
  width = '100%',
  className = ''
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={typeof width === 'string' ? width : `${width}%`}
          height="1rem"
          className={i === lines - 1 && lines > 1 ? 'w-3/4' : ''}
        />
      ))}
    </div>
  );
});

// ── CERCLE/AVATAR ───────────────────────────────────────
export const SkeletonCircle = memo(function SkeletonCircle({ 
  size = '2.5rem',
  className = ''
}) {
  return (
    <SkeletonBase
      circle
      width={size}
      height={size}
      className={className}
    />
  );
});

// ── RECTANGLE/CARTE ───────────────────────────────────────
export const SkeletonRect = memo(function SkeletonRect({ 
  width = '100%', 
  height = '10rem',
  className = ''
}) {
  return (
    <SkeletonBase
      width={width}
      height={height}
      className={className}
    />
  );
});

// ── LIGNE DE TABLE ────────────────────────────────────────
export const SkeletonTableRow = memo(function SkeletonTableRow({ 
  columns = 4,
  className = ''
}) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonBase 
            width={i === 0 ? '60%' : '80%'} 
            height="1rem"
          />
        </td>
      ))}
    </tr>
  );
});

// ── TABLE COMPLÈTE ──────────────────────────────────────
export const SkeletonTable = memo(function SkeletonTable({ 
  rows = 5, 
  columns = 4,
  showHeader = true,
  className = ''
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}>
      <table className="w-full">
        {showHeader && (
          <thead className="bg-background">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <SkeletonBase width="60%" height="0.875rem" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

// ── CARTE ───────────────────────────────────────────────
export const SkeletonCard = memo(function SkeletonCard({ 
  hasImage = true,
  lines = 3,
  className = ''
}) {
  return (
    <div className={`bg-surface rounded-lg border border-gray-200 p-4 space-y-4 ${className}`}>
      {hasImage && (
        <SkeletonRect height="8rem" className="rounded-lg" />
      )}
      <SkeletonText lines={lines} />
    </div>
  );
});

// ── LISTE DE CARTES ─────────────────────────────────────
export const SkeletonCardList = memo(function SkeletonCardList({ 
  count = 3,
  hasImage = true,
  className = ''
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasImage={hasImage} />
      ))}
    </div>
  );
});

// ── STATISTIQUES/DASHBOARD ────────────────────────────────
export const SkeletonStats = memo(function SkeletonStats({ 
  count = 4,
  className = ''
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonCircle size="2rem" />
            <SkeletonBase width="3rem" height="1.5rem" />
          </div>
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
});

// ── FORMULAIRE ───────────────────────────────────────────
export const SkeletonForm = memo(function SkeletonForm({ 
  fields = 4,
  className = ''
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBase width="30%" height="0.875rem" />
          <SkeletonBase width="100%" height="2.5rem" className="rounded-md" />
        </div>
      ))}
      <SkeletonBase width="100%" height="2.5rem" className="rounded-md mt-6" />
    </div>
  );
});

// ── PAGE COMPLÈTE ─────────────────────────────────────────
export const SkeletonPage = memo(function SkeletonPage({ 
  layout = 'default',
  className = ''
}) {
  const layouts = {
    default: (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonBase width="40%" height="2rem" />
          <SkeletonBase width="8rem" height="2.5rem" />
        </div>
        <SkeletonStats count={4} />
        <SkeletonTable rows={5} columns={5} />
      </div>
    ),
    dashboard: (
      <div className="space-y-6">
        <SkeletonBase width="30%" height="2rem" />
        <SkeletonStats count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonRect height="16rem" />
          <SkeletonRect height="16rem" />
        </div>
      </div>
    ),
    list: (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonBase width="25%" height="2rem" />
          <SkeletonBase width="12rem" height="2.5rem" />
        </div>
        <SkeletonTable rows={8} columns={6} />
      </div>
    ),
    form: (
      <div className="space-y-6 max-w-2xl">
        <SkeletonBase width="50%" height="2rem" />
        <SkeletonForm fields={5} />
      </div>
    ),
    detail: (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonCircle size="4rem" />
          <div className="flex-1 space-y-2">
            <SkeletonBase width="40%" height="1.5rem" />
            <SkeletonBase width="60%" height="1rem" />
          </div>
        </div>
        <SkeletonCard hasImage={false} lines={5} />
      </div>
    ),
  };

  return (
    <div className={`animate-pulse ${className}`}>
      {layouts[layout] || layouts.default}
    </div>
  );
});

// ── EXPORT DEFAULT ───────────────────────────────────────
export default {
  Base: SkeletonBase,
  Text: SkeletonText,
  Circle: SkeletonCircle,
  Rect: SkeletonRect,
  Table: SkeletonTable,
  TableRow: SkeletonTableRow,
  Card: SkeletonCard,
  CardList: SkeletonCardList,
  Stats: SkeletonStats,
  Form: SkeletonForm,
  Page: SkeletonPage,
};
