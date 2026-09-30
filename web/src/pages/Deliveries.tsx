import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { useAuth } from '../AuthContext';
import { fetchApi } from '../api';

export function Deliveries() {
  const { activeOrgId } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeOrgId) return;
    const loadDeliveries = async () => {
      try {
        setLoading(true);
        const data = await fetchApi(`/orgs/${activeOrgId}/deliveries?limit=50`);
        setDeliveries(data.items);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDeliveries();
  }, [activeOrgId]);

  if (loading) return <div>Loading deliveries...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-500';
      case 'DELIVERING': return 'bg-blue-500/10 text-blue-500';
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-500';
      case 'FAILED': return 'bg-red-500/10 text-red-500';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Deliveries</h1>
      
      {deliveries.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400">
          No deliveries found.
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="p-4 font-medium text-slate-300">Event</th>
                <th className="p-4 font-medium text-slate-300">Endpoint</th>
                <th className="p-4 font-medium text-slate-300">Status</th>
                <th className="p-4 font-medium text-slate-300">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {deliveries.map(d => (
                <tr key={d.id} className="hover:bg-slate-750">
                  <td className="p-4 text-indigo-300">{d.event?.eventType}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{d.endpoint?.url}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{new Date(d.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
