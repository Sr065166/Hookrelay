import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { useAuth } from '../AuthContext';
import { fetchApi } from '../api';

export function Events() {
  const { activeOrgId } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeOrgId) return;
    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await fetchApi(`/orgs/${activeOrgId}/events?limit=50`);
        setEvents(data.items);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [activeOrgId]);

  if (loading) return <div>Loading events...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Events</h1>
      
      {events.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400">
          No events ingested yet. Send a POST request to /api/v1/events with an API key.
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="p-4 font-medium text-slate-300">Type</th>
                <th className="p-4 font-medium text-slate-300">Payload Preview</th>
                <th className="p-4 font-medium text-slate-300">Created At</th>
                <th className="p-4 font-medium text-slate-300">Deliveries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-750">
                  <td className="p-4 font-medium text-indigo-300">{ev.eventType}</td>
                  <td className="p-4 font-mono text-xs text-slate-400 truncate max-w-xs">
                    {JSON.stringify(ev.payload)}
                  </td>
                  <td className="p-4 text-slate-400">{new Date(ev.createdAt).toLocaleString()}</td>
                  <td className="p-4 text-slate-400">{ev._count?.deliveries || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
