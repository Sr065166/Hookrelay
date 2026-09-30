import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';

import { useAuth } from '../AuthContext';
import { Users } from 'lucide-react';

export function Members() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Members</h1>
      
      <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400">
        <Users className="w-12 h-12 mx-auto mb-4 text-slate-600" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">Member Management</h3>
        <p>This feature will be available in a future phase.</p>
        <div className="mt-6 text-sm text-left max-w-md mx-auto bg-slate-900 p-4 rounded border border-slate-700">
          <p className="font-medium text-slate-300 mb-2">Current User (You)</p>
          <p><span className="text-slate-500">Name:</span> {user?.name || 'N/A'}</p>
          <p><span className="text-slate-500">Email:</span> {user?.email}</p>
        </div>
      </div>
    </div>
  );
}
