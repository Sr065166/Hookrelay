import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { useAuth } from '../AuthContext';
import { Activity, Webhook, Key } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user, activeOrgId } = useAuth();
  
  const orgName = user?.memberships.find(m => m.organization.id === activeOrgId)?.organization.name;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome to {orgName}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/endpoints" className="p-6 bg-slate-800 rounded-lg border border-slate-700 hover:border-indigo-500 transition-colors">
          <Webhook className="w-8 h-8 text-indigo-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Endpoints</h3>
          <p className="text-sm text-slate-400">Manage destination webhooks to receive events.</p>
        </Link>
        
        <Link to="/events" className="p-6 bg-slate-800 rounded-lg border border-slate-700 hover:border-indigo-500 transition-colors">
          <Activity className="w-8 h-8 text-indigo-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Events</h3>
          <p className="text-sm text-slate-400">View ingested events and track delivery status.</p>
        </Link>

        <Link to="/api-keys" className="p-6 bg-slate-800 rounded-lg border border-slate-700 hover:border-indigo-500 transition-colors">
          <Key className="w-8 h-8 text-indigo-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">API Keys</h3>
          <p className="text-sm text-slate-400">Manage keys used to authenticate event ingestion.</p>
        </Link>
      </div>
    </div>
  );
}
