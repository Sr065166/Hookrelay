import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { useAuth } from '../AuthContext';
import { fetchApi } from '../api';
import { Plus, Trash2, Key, Copy } from 'lucide-react';

export function ApiKeys() {
  const { activeOrgId, activeRole } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New key form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [newRawKey, setNewRawKey] = useState('');

  const canManageKeys = activeRole && ['OWNER', 'ADMIN', 'DEVELOPER'].includes(activeRole);

  const loadKeys = async () => {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      const data = await fetchApi(`/orgs/${activeOrgId}/api-keys`);
      setKeys(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [activeOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await fetchApi(`/orgs/${activeOrgId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewRawKey(data.rawKey);
      setShowForm(false);
      setName('');
      loadKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    try {
      await fetchApi(`/orgs/${activeOrgId}/api-keys/${id}`, { method: 'DELETE' });
      loadKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API Key copied to clipboard!');
  };

  if (loading) return <div>Loading API keys...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">API Keys</h1>
        {canManageKeys && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Key</span>
          </button>
        )}
      </div>

      {newRawKey && (
        <div className="p-4 bg-emerald-900/50 border border-emerald-500 rounded-lg space-y-2">
          <h3 className="font-bold text-emerald-400">API Key Generated Successfully!</h3>
          <p className="text-sm text-emerald-200">
            Please copy this key now. You will not be able to see it again.
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <code className="flex-1 bg-slate-900 p-2 rounded text-emerald-300 font-mono text-sm">{newRawKey}</code>
            <button onClick={() => copyToClipboard(newRawKey)} className="p-2 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setNewRawKey('')} className="mt-2 text-sm text-emerald-400 hover:underline">
            I have saved it securely
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-4">
          <h3 className="font-medium">New API Key</h3>
          <div>
            <label className="block text-sm mb-1">Key Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 bg-slate-900 border border-slate-700 rounded" placeholder="e.g., Production Core Services" />
          </div>
          <div className="flex space-x-2">
            <button type="submit" className="bg-indigo-600 px-4 py-2 rounded text-sm">Generate</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-700 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {keys.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400">
          No API keys found.
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="p-4 font-medium text-slate-300">Name</th>
                <th className="p-4 font-medium text-slate-300">Prefix</th>
                <th className="p-4 font-medium text-slate-300">Created At</th>
                <th className="p-4 font-medium text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-slate-750">
                  <td className="p-4 font-medium">{k.name}</td>
                  <td className="p-4 font-mono text-slate-400">{k.keyPrefix}...</td>
                  <td className="p-4 text-slate-400">{new Date(k.createdAt).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    {canManageKeys && (
                      <button onClick={() => handleRevoke(k.id)} className="text-slate-400 hover:text-red-400 p-1 title='Revoke Key'">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
