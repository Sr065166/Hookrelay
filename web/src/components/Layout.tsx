import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Key, Webhook, Activity, Inbox, LogOut, Users, Settings as SettingsIcon } from 'lucide-react';

export function Layout() {
  const { user, activeOrgId, setActiveOrgId, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Activity },
    { name: 'Endpoints', href: '/endpoints', icon: Webhook },
    { name: 'Events', href: '/events', icon: Inbox },
    { name: 'Deliveries', href: '/deliveries', icon: Inbox },
    { name: 'API Keys', href: '/api-keys', icon: Key },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center font-bold mr-3">HR</div>
          <span className="font-semibold text-lg">HookRelay</span>
        </div>
        
        <div className="p-4 border-b border-slate-800">
          <select 
            value={activeOrgId || ''} 
            onChange={e => setActiveOrgId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
          >
            {user?.memberships.map(m => (
              <option key={m.organization.id} value={m.organization.id}>
                {m.organization.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="truncate text-sm text-slate-400">
              {user?.email}
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
