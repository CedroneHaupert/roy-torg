import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
    {toasts.map(t => (
      <div key={t.id} className={`p-4 min-w-[300px] max-w-sm rounded-2xl shadow-2xl text-white flex items-start gap-4 animate-in slide-in-from-right-8 fade-in duration-300 ${
          t.type === 'error' ? 'bg-red-600' : 
          t.type === 'success' ? 'bg-green-600' : 
          'bg-blue-600'
        }`}>
        <div className="mt-0.5">
          {t.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
        </div>
        <div className="flex-1">
            <h4 className="font-bold text-sm">{t.title}</h4>
            {t.message && <p className="text-sm opacity-90 leading-snug mt-1">{t.message}</p>}
        </div>
        <button onClick={() => removeToast(t.id)} className="text-white/60 hover:text-white transition"><X size={16}/></button>
      </div>
    ))}
  </div>
);

export default ToastContainer;