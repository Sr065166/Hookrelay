import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { Settings as SettingsIcon } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organization Settings</h1>
      
      <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400">
        <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-slate-600" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">Settings</h3>
        <p>Organization settings (name, billing, etc.) will be available in a future phase.</p>
      </div>
    </div>
  );
}
