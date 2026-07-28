const fs = require('fs');
const file = 'src/app/dashboard/admin/raporlar/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace sticky header
content = content.replace(
  '<div className="flex flex-col md:flex-row justify-between gap-4">',
  '<div className="flex flex-col md:flex-row justify-between gap-4 sticky top-16 z-10 bg-[#f8fafc] p-4 -mx-4 rounded-xl shadow-sm border border-brand-dark/5">'
);

// Add state for search, sort, typeFilter
content = content.replace(
  'const [subUnitFilter, setSubUnitFilter] = useState("")',
  'const [subUnitFilter, setSubUnitFilter] = useState("")\n  const [searchQuery, setSearchQuery] = useState("")\n  const [typeFilter, setTypeFilter] = useState("ALL")\n  const [sortOrder, setSortOrder] = useState("DESC")'
);

// Add the extra filters into the FILTER PANEL
const filterPanelTarget = '<div className="flex justify-end pt-2">';
const extraFilters = `
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Arama (Faaliyet / SOP)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={14} className="text-brand-dark/40" /></div>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary" placeholder="Arama..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Rapor Türü</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary">
              <option value="ALL">Tümü</option>
              <option value="WEEKLY">Haftalık</option>
              <option value="ANNUAL">Yıllık</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Sıralama</label>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary">
              <option value="DESC">Yeniden Eskiye</option>
              <option value="ASC">Eskiden Yeniye</option>
            </select>
          </div>
        </div>
        ` + filterPanelTarget;

content = content.replace(filterPanelTarget, extraFilters);

// Add filtering logic before mapping
const filteredReportsLogic = `
  const filteredReports = reports.filter(report => {
    const searchMatch = 
      (report.annualDetails?.sopName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.activities || []).some((act: any) => (act.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (act.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!searchMatch && searchQuery) return false;
    if (typeFilter === "WEEKLY" && report.isAnnual) return false;
    if (typeFilter === "ANNUAL" && !report.isAnnual) return false;
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
  });
`;

content = content.replace(
  'const toggleSelectAll = () => {',
  filteredReportsLogic + '\n\n  const toggleSelectAll = () => {'
);

// Replace mapping/length checks to use filteredReports
content = content.replace(/reports\.length/g, 'filteredReports.length');
content = content.replace(/reports\.map\(/g, 'filteredReports.map(');
content = content.replace(/reports\.filter/g, 'filteredReports.filter');
// But we should be careful: "setReports(data)" shouldn't be replaced, because it uses "setReports". 
// Since we used regex "reports\.length", "reports\.map(", "reports\.filter", "setReports" is untouched.

fs.writeFileSync(file, content);
console.log('Admin raporlar updated.');
