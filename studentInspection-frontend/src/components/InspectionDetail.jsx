import React from 'react';
import { ArrowLeft } from 'lucide-react';

const InspectionDetail = ({ record, onBack }) => {
  if (!record) return null;
  return (
    <div className="max-w-4xl mx-auto bg-white rounded shadow-sm border border-gray-100 p-8">
      <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-800 mb-8 cursor-pointer font-medium">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Records
      </button>
      
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Inspection Details</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-sm text-gray-500 mb-1">Date Submitted</p>
          <p className="font-semibold text-gray-900">{new Date(record.created_at).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Inspecting Officer</p>
          <p className="font-semibold text-gray-900">{record.officer_name || record.officer_email}</p>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-4 text-gray-800">Form Data</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
        {Object.entries(record.data || {}).map(([key, value]) => (
          <div key={key} className="border-b border-gray-100 pb-2">
            <p className="text-sm text-gray-500 mb-1">{key}</p>
            <p className="font-medium text-gray-900">
              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || 'N/A')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InspectionDetail;