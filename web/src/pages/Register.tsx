import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { fetchApi } from '../api';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      await login(data.accessToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="max-w-md w-full p-8 bg-slate-800 rounded-lg border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-center">Register for HookRelay</h2>
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 bg-slate-900 border border-slate-700 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 bg-slate-900 border border-slate-700 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full p-2 bg-slate-900 border border-slate-700 rounded" />
          </div>
          <button disabled={loading} type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded font-medium text-white transition-colors">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
}
