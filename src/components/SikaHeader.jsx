import NotificationsPanel from './NotificationsPanel';
import SearchGlobal from './SearchGlobal';
import SikaLogo from './SikaLogo';

export default function SikaHeader({ module }) {
  return (
    <header className="bg-navy text-white relative">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SikaLogo size="sm" />
        </div>

        <h2 className="text-xl font-bold absolute left-1/2 transform -translate-x-1/2">
          {module}
        </h2>

        <div className="flex items-center gap-4">
          <SearchGlobal />
          <NotificationsPanel />
          
          <div className="text-right">
            <p className="text-sm font-medium">ERP/CRM SIKA</p>
            <p className="text-xs text-argent">v1.0</p>
          </div>
        </div>
      </div>
      <div className="h-1 bg-rouge"></div>
    </header>
  )
}
