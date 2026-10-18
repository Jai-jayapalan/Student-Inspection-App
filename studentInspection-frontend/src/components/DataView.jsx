import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Upload, MoreVertical, UploadCloud, X, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const getErrorMessage = (error, fallback) => error.response?.data?.detail || fallback;

const DataView = ({ onEditRecord, onViewRecord }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [file, setFile] = useState(null);
  const [importStatus, setImportStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Close the action menu on outside click, scroll, or Escape key
  useEffect(() => {
    if (!activeMenuId) return;
    
    const closeMenu = () => setActiveMenuId(null);
    const handleKeyDown = (e) => { if (e.key === 'Escape') closeMenu(); };

    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/inspections/${id}`);
      setRefreshKey(key => key + 1);
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to delete record.'));
    }
  };

  const handleMenuToggle = (e, rowId) => {
    e.stopPropagation();
    if (activeMenuId === rowId) {
      setActiveMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPos({ 
        top: rect.bottom + window.scrollY, 
        left: rect.left + window.scrollX - 120 // Shift left to align the dropdown nicely
      });
      setActiveMenuId(rowId);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      limit: '10',
      search,
    });

    api.get(`/inspections?${params}`, { signal: controller.signal })
      .then(({ data: response }) => {
        if (!Array.isArray(response.data)) {
          throw new Error('The server returned an invalid inspection list.');
        }
        setData(response.data);
        setTotal(Number.isFinite(response.pages) ? response.pages : 0);
        setLoadError('');
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setLoadError(getErrorMessage(error, error.message || 'Unable to load inspection records.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [page, search, refreshKey]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
    setIsLoading(true);
    setLoadError('');
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    setIsLoading(true);
    setLoadError('');
  };

  const retryLoading = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshKey(key => key + 1);
  };

  const handleImport = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsImporting(true);
    setImportStatus('');

    try {
      const { data: result } = await api.post('/inspections/import', formData);
      setImportStatus(`Imported ${result.imported} records; ${result.errors.length} errors.`);
      setFile(null);
      setIsLoading(true);
      setRefreshKey(key => key + 1);
    } catch (error) {
      setImportStatus(getErrorMessage(error, 'Import failed. Please try again.'));
    } finally {
      setIsImporting(false);
    }
  };

  const seedData = async () => {
    setIsSeeding(true);
    setImportStatus('');

    try {
      await api.post('/inspections/seed');
      setImportStatus('Sample data added successfully.');
      setIsLoading(true);
      setRefreshKey(key => key + 1);
    } catch (error) {
      setImportStatus(getErrorMessage(error, 'Unable to add sample data. Please try again.'));
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-xl font-bold">Inspection Records</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="group relative flex items-center">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center text-sm transition-colors shadow-sm"
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              Import Data
            </button>
            <div className="absolute top-full left-1/2 mt-2 -translate-x-1/2 w-max rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-10">
              Upload .csv or .xlsx files
            </div>
          </div>
          <button
            type="button"
            onClick={seedData}
            disabled={isSeeding}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSeeding ? 'Adding sample data...' : 'Seed Sample Data'}
          </button>
        </div>
      </div>

      {importStatus && <div role="status" className="mb-4 text-sm font-medium text-blue-600">{importStatus}</div>}

      <div className="mb-4 flex relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search schools, codes, officers..."
          aria-label="Search inspection records"
          className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] border border-gray-200 rounded-lg">
        <table className="min-w-full border-collapse relative">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-gray-100 text-left text-sm text-gray-700 uppercase tracking-wider">
              <th className="p-4 border-b bg-gray-100 font-semibold">Date</th>
              <th className="p-4 border-b bg-gray-100 font-semibold">Officer Name</th>
              <th className="p-4 border-b bg-gray-100 font-semibold">School Name</th>
              <th className="p-4 border-b bg-gray-100 font-semibold w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500" role="status">Loading inspection records...</td></tr>
            ) : loadError ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-red-600" role="alert">
                  <p>{loadError}</p>
                  <button type="button" onClick={retryLoading} className="mt-2 text-blue-700 underline hover:text-blue-800">Try again</button>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-500">
                  {search ? 'No inspection records match your search.' : 'No inspection records yet. Import a file or add sample data to get started.'}
                </td>
              </tr>
            ) : data.map(row => (
              <tr key={row._id} className="border-b hover:bg-gray-50 text-sm transition-colors">
                <td className="p-3 text-gray-700">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-gray-700">{row.officer_name || row.officer_email}</td>
                <td className="p-3 font-medium text-gray-900">{row.data?.['School Name'] || 'N/A'}</td>
                <td className="p-3 text-center">
                  <button 
                    onClick={(e) => handleMenuToggle(e, row._id)} 
                    aria-label="Open Actions Menu"
                    aria-expanded={activeMenuId === row._id}
                    className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-600 font-medium">
          Showing page <span className="text-gray-900">{page}</span> of <span className="text-gray-900">{total || 1}</span>
        </div>
        
        <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <button
            type="button"
            disabled={page === 1 || isLoading}
            onClick={() => handlePageChange(page - 1)}
            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          
          {Array.from({ length: total || 1 }, (_, i) => i + 1).map((p) => {
            if (p === 1 || p === total || (p >= page - 1 && p <= page + 1)) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  disabled={isLoading}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                    p === page
                      ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {p}
                </button>
              );
            }
            if (p === page - 2 || p === page + 2) {
              return (
                <span key={p} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                  ...
                </span>
              );
            }
            return null;
          })}

          <button
            type="button"
            disabled={isLoading || (total > 0 && page >= total)}
            onClick={() => handlePageChange(page + 1)}
            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <span className="sr-only">Next</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>

      {/* Render the dropdown via Portal so it escapes overflow constraints */}
      {activeMenuId && createPortal(
        <div 
          className="absolute w-36 bg-white border border-gray-100 rounded-md shadow-xl z-[9999] py-1 overflow-hidden"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {data.map(row => row._id === activeMenuId && (
            <div key={`menu-${row._id}`}>
              <button 
                onClick={() => { onViewRecord(row); setActiveMenuId(null); }} 
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center cursor-pointer transition-colors"
              >
                <Eye className="h-4 w-4 mr-2"/> View
              </button>
              <button 
                onClick={() => { onEditRecord(row); setActiveMenuId(null); }} 
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center cursor-pointer transition-colors"
              >
                <Edit className="h-4 w-4 mr-2"/> Edit
              </button>
              <button 
                onClick={() => { handleDelete(row._id); setActiveMenuId(null); }} 
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center cursor-pointer transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2"/> Delete
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors p-1"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Upload Inspection Data</h3>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer group"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <UploadCloud className="h-10 w-10 text-gray-400 group-hover:text-blue-500 mb-3 transition-colors" />
              <p className="text-sm font-medium text-gray-700">Click or drag file to this area</p>
              <p className="text-xs text-gray-500 mt-1">Supports a single .csv or .xlsx file</p>
              <input id="file-upload" type="file" accept=".csv, .xlsx" className="hidden" onChange={(e) => { setFile(e.target.files?.[0]); handleImport(); setIsModalOpen(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataView;