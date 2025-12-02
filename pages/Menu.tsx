import React from 'react';
import { useAppStore } from '../store';
import { Card, Button, Badge } from '../components/UI';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

export const Menu: React.FC = () => {
  const { menu, toggleMenuAvailability, resetDailyStock } = useAppStore();

  const handleReset = () => {
    if (window.confirm("Are you sure? This will set all items stock back to 10 for tomorrow.")) {
        resetDailyStock();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-900">Menu Setup</h1>
            <Button variant="outline" size="sm" onClick={handleReset} className="text-sky-600 border-sky-200 bg-sky-50">
                <RefreshCw size={14} className="mr-1" /> Reset Stock
            </Button>
        </div>
        <p className="text-sm text-slate-500">Manage what you are selling in the building today.</p>
      </div>

      <div className="grid gap-3">
        {menu.map(item => (
            <Card key={item.id} className={`transition-opacity ${!item.isAvailable ? 'opacity-60 bg-slate-50' : ''}`}>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900">{item.name}</h3>
                            <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">{item.price} AED</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{item.description || 'No description'}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <Badge variant="neutral">Limit: {item.dailyLimit || 10}</Badge>
                            <span className="text-[10px] uppercase tracking-wide text-slate-400">{item.category}</span>
                        </div>
                    </div>

                    <div className="ml-3">
                        <button 
                            onClick={() => toggleMenuAvailability(item.id)}
                            className={`p-2 rounded-lg transition-colors ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                        >
                            {item.isAvailable ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                    </div>
                </div>
            </Card>
        ))}
      </div>
    </div>
  );
};