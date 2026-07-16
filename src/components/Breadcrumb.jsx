import { Link } from 'react-router-dom'

export default function Breadcrumb({ items }) {
  return (
    <nav className="bg-surface px-4 py-2 rounded-lg shadow-sm border border-argent mb-4">
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-rouge font-bold">›</span>}
            {item.path ? (
              <Link to={item.path} className="text-bleu hover:text-rouge transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-navy font-bold">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
