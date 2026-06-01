export default function SikaFooter({ page = 1, total = 1 }) {
  return (
    <footer className="bg-gray-100 border-t-2 border-orange">
      <div className="px-8 py-3 flex items-center justify-between text-sm text-gray-700">
        <span className="font-medium">SIKA INDUSTRIE — Confidential</span>
        <span>www.sika-industrie.com</span>
        <span className="font-medium">Page {page}/{total}</span>
      </div>
    </footer>
  )
}
