import { useState } from 'react';
import { LogOut, PlusCircle, Database, User } from 'lucide-react';
import InspectionForm from '../components/InspectionForm';
import DataView from '../components/DataView';
import Profile from '../components/Profile';
import InspectionDetail from '../components/InspectionDetail';

const Dashboard = ({ setToken }) => {
  const [view, setView] = useState('form');
  const [editRecord, setEditRecord] = useState(null);

  const handleEditRecord = (record) => {
    setEditRecord(record);
    setView('form');
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-800 text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">School Inspection Portal</h1>
        <button onClick={() => { localStorage.removeItem('token'); setToken(null); }} className="flex items-center hover:text-gray-300">
          <LogOut className="mr-2 h-4 w-4"/> Logout
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 bg-white shadow p-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setView('form'); setEditRecord(null); }} className={`w-full text-left p-2 rounded flex items-center cursor-pointer ${view === 'form' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <PlusCircle className="mr-2 h-4 w-4"/> New Inspection
          </button>
          <button onClick={() => { setView('data'); setEditRecord(null); }} className={`w-full text-left p-2 rounded flex items-center cursor-pointer ${view === 'data' || view === 'detail' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Database className="mr-2 h-4 w-4"/> View Data
          </button>
          <button onClick={() => setView('profile')} className={`w-full text-left p-2 rounded flex items-center cursor-pointer ${view === 'profile' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <User className="mr-2 h-4 w-4"/> Profile
          </button>
        </nav>
        <main className="flex-1 p-8 bg-gray-50 overflow-y-auto">
          {view === 'form' && <InspectionForm editRecord={editRecord} onClearEdit={() => { setEditRecord(null); setView('data'); }} />}
          {view === 'data' && <DataView onEditRecord={handleEditRecord} onViewRecord={(record) => { setEditRecord(record); setView('detail'); }} />}
          {view === 'detail' && <InspectionDetail record={editRecord} onBack={() => setView('data')} />}
          {view === 'profile' && <Profile />}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;