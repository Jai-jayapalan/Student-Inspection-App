import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';

const Auth = ({ mode, setToken }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        await api.post('/auth/signup', { email, password, first_name: firstName, last_name: lastName });
        navigate('/login');
      } else {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen justify-center items-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl mb-4 font-bold">{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
        {error && <div role="alert" className="text-red-500 mb-2">{error}</div>}
        {mode === 'signup' && (
          <div className="flex gap-2 mb-3">
            <input className="w-1/2 p-2 border rounded" type="text" placeholder="First Name" required value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input className="w-1/2 p-2 border rounded" type="text" placeholder="Last Name" required value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        )}
        <input className="w-full mb-3 p-2 border rounded" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
        <div className="relative mb-4">
          <input
            className="w-full p-2 pr-11 border rounded"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(visible => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        <button disabled={isSubmitting} className="w-full bg-blue-600 text-white p-2 rounded disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : (mode === 'login' ? 'Login' : 'Sign Up')}
        </button>
        <div className="mt-4 text-sm text-center">
          {mode === 'login' ? <Link to="/signup" className="text-blue-500">Create an account</Link> : <Link to="/login" className="text-blue-500">Back to Login</Link>}
        </div>
      </form>
    </div>
  );
};

export default Auth;