import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { useAuth } from '../AuthContext';
import { fetchApi } from '../api';
import { Plus, Trash2 } from 'lucide-react';

export function Endpoints() {
  const { activeOrgId, activeRole } = useAuth();
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New endpoint form state
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  
  const canWrite = activeRole && ['OWNER', 'ADMIN', 'DEVELOPER'].includes(activeRole);
  const canDelete = activeRole && ['OWNER', 'ADMIN'].includes(activeRole);

  const loadEndpoints = async () => {
    if (!activeOrgId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await fetchApi(`/orgs/${activeOrgId}/endpoints?limit=50`);
      setEndpoints(data.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEndpoints();
  }, [activeOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/orgs/${activeOrgId}/endpoints`, {
        method: 'POST',
        body: JSON.stringify({ url, description, eventsSubscribed: ['*'] }),
      });
      setShowForm(false);
      setUrl('');
      setDescription('');
      loadEndpoints();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) return;
    try {
      await fetchApi(`/orgs/${activeOrgId}/endpoints/${id}`, { method: 'DELETE' });
      loadEndpoints();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading endpoints...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Endpoints</h1>
        {canWrite && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Endpoint</span>
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-4">
          <h3 className="font-medium">New Endpoint</h3>
          <div>
            <label className="block text-sm mb-1">URL (Must be HTTPS in production)</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} required className="w-full p-2 bg-slate-900 border border-slate-700 rounded" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm mb-1">Description (Optional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 bg-slate-900 border border-slate-700 rounded" />
          </div>
          <div className="flex space-x-2">
            <button type="submit" className="bg-indigo-600 px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-700 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {endpoints.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400">
          No endpoints configured.
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="p-4 font-medium text-slate-300">URL / Description</th>
                <th className="p-4 font-medium text-slate-300">Status</th>
                <th className="p-4 font-medium text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {endpoints.map(ep => (
                <tr key={ep.id} className="hover:bg-slate-750">
                  <td className="p-4">
                    <div className="font-mono text-indigo-300">{ep.url}</div>
                    {ep.description && <div className="text-slate-400 mt-1">{ep.description}</div>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${ep.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {ep.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {canDelete && (
                      <button onClick={() => handleDelete(ep.id)} className="text-slate-400 hover:text-red-400 p-1">
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
