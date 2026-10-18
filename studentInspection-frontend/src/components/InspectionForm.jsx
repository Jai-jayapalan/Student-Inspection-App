import { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import api from '../utils/api';

const InspectionForm = ({ editRecord, onClearEdit }) => {
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState(editRecord ? editRecord.data : {});
  const [message, setMessage] = useState('');
  const [isMessageError, setIsMessageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    api.get('/config/active', { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data.sections)) {
          throw new Error('The server returned an invalid form configuration.');
        }
        setConfig(data);
        setLoadError('');
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setLoadError(error.response?.data?.detail || error.message || 'Unable to load the inspection form.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const handleChange = (name, value) => {
    setFormData(previous => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!config || isSubmitting) return;

    setIsSubmitting(true);
    setMessage('');
    setIsMessageError(false);

    try {
      if (editRecord) {
        await api.put(`/inspections/${editRecord._id}`, { data: formData });
        setMessage('Inspection updated successfully!');
      } else {
        await api.post('/inspections', { config_version: config.version, data: formData });
        setMessage('Inspection saved successfully!');
        setFormData({});
      }
    } catch (error) {
      setIsMessageError(true);
      setMessage(error.response?.data?.detail || 'Error saving record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 font-medium" role="status">Loading inspection form...</div>;
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 text-center shadow-sm border border-gray-200" role="alert">
        <p className="text-red-600 font-medium">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setLoadError('');
            setReloadKey(key => key + 1);
          }}
          className="mt-4 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-gray-700 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  const hasFields = config.sections.some(section => Array.isArray(section.fields) && section.fields.length > 0);
  if (!hasFields) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm border border-gray-200" role="status">
        No inspection form fields are configured yet. Please contact an administrator.
      </div>
    );
  }

  // The wrapper is restricted by max-h to force inner scroll while keeping headers and footers pinned
  return (
    <div className="mx-auto max-w-4xl flex flex-col max-h-[calc(100vh-5rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Sticky Header */}
      <div className="flex-shrink-0 flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white">
        <h2 className="text-xl font-bold text-gray-900">
          {editRecord ? 'Edit Inspection Record' : 'New Inspection Record'}
        </h2>
        {editRecord && (
          <button 
            type="button"
            onClick={onClearEdit} 
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50/30">
        {message && (
          <div role={isMessageError ? 'alert' : 'status'} className={`mb-6 rounded-lg p-4 font-medium border ${isMessageError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
            {message}
          </div>
        )}

        <form id="inspection-form" onSubmit={handleSubmit} className="space-y-8">
          {config.sections.map((section, sectionIndex) => (
            <div key={section.name || sectionIndex} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="mb-5 text-lg font-semibold text-gray-800 border-b border-gray-50 pb-2">{section.name}</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {section.fields.map((field, fieldIndex) => (
                  <div key={field.name || fieldIndex}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      {field.name} 
                      {field.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
                    </label>
                    {field.type === 'boolean' ? (
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        required={field.required}
                        value={formData[field.name] ?? ''}
                        onChange={event => handleChange(field.name, event.target.value === '' ? '' : event.target.value === 'true')}
                      >
                        <option value="">Select...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        type={field.type === 'number' ? 'number' : 'text'}
                        required={field.required}
                        value={formData[field.name] ?? ''}
                        onChange={event => handleChange(field.name, field.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </form>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 px-8 py-5 border-t border-gray-100 bg-white flex justify-end">
        <button
          type="submit"
          form="inspection-form"
          disabled={isSubmitting}
          className="flex items-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {isSubmitting ? 'Saving Record...' : 'Submit Report'}
        </button>
      </div>
    </div>
  );
};

export default InspectionForm;