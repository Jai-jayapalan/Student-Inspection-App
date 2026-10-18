import { useState, useEffect } from 'react';
import { User, Save } from 'lucide-react';
import api from '../utils/api';

const Profile = () => {
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      const [firstName = '', ...rest] = (res.data.name || '').split(' ');
      setProfile({ firstName, lastName: rest.join(' '), email: res.data.email });
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      await api.patch('/auth/me', { name: fullName });
      setIsEditing(false);
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b">
        <div className="bg-blue-100 p-4 rounded-full text-blue-600">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
          <p className="text-gray-500 text-sm">Manage your personal information</p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input disabled={!isEditing} type="text" className="w-full p-2 border rounded-md disabled:bg-gray-50 disabled:text-gray-500" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input disabled={!isEditing} type="text" className="w-full p-2 border rounded-md disabled:bg-gray-50 disabled:text-gray-500" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input disabled type="email" className="w-full p-2 border rounded-md bg-gray-50 text-gray-500 cursor-not-allowed" value={profile.email} />
        </div>
        
        <div className="pt-4 flex gap-3">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 cursor-pointer">Edit Profile</button>
          ) : (
            <>
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center shadow hover:bg-blue-700 cursor-pointer"><Save className="h-4 w-4 mr-2" /> Save Changes</button>
              <button onClick={() => { setIsEditing(false); setProfile({...profile}); }} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 cursor-pointer">Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;