import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { LotCard } from '../components/LotCard';

const CatalogPage = ({ navigate, lots }) => {
  const [filterCategory, setFilterCategory] = useState('Все');
  const [filterNds, setFilterNds] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLots = lots.filter(l => {
      const now = Date.now();
      const end = new Date(l.endTime).getTime();
      const start = l.startTime ? new Date(l.startTime).getTime() : 0;
      
      const isActive = l.status !== 'completed' && end > now && start <= now;
      if (!isActive) return false;

      if (searchQuery && !l.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      if (filterCategory !== 'Все') {
          if (l.category && l.category !== filterCategory) {
             return false;
          }
          else if (!l.category) {
              if (filterCategory === 'Тягачи' && !l.title.toLowerCase().includes('тягач')) return false;
              if (filterCategory === 'Полуприцепы' && !l.title.toLowerCase().includes('прицеп')) return false;
              if (filterCategory === 'Спецтехника' && !l.title.toLowerCase().match(/(трактор|экскаватор|кран|погрузчик)/)) return false;
          }
      }

      if (filterNds && !l.hasNds) return false;

      return true;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
        <h2 className="text-2xl font-black text-slate-800 mb-6">Каталог</h2>
        <div className="relative">
          <input type="text" placeholder="Поиск по названию..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-sm" />
          <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Тип техники</h3>
          <div className="space-y-3">
            {['Все', 'Тягачи', 'Полуприцепы', 'Спецтехника', 'Коммерческие'].map(type => (
              <label key={type} className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="category" checked={filterCategory === type} onChange={() => setFilterCategory(type)} className="w-4 h-4 text-blue-600 focus:ring-blue-600 border-slate-300 cursor-pointer" />
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition">{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={filterNds}
              onChange={(e) => setFilterNds(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-600 border-slate-300 cursor-pointer" 
            />
            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition">Только с НДС</span>
          </label>
        </div>
      </aside>
      <div className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map(lot => <LotCard key={lot.id} lot={lot} onClick={(id) => navigate('lot', id)} />)}
        </div>
        {filteredLots.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Ничего не найдено</h3>
            <p className="text-slate-500 text-sm mt-1">Попробуйте изменить параметры фильтра.</p>
            <button onClick={() => {setSearchQuery(''); setFilterCategory('Все'); setFilterNds(false);}} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Сбросить фильтры</button>
          </div>
        )}
      </div>
    </main>
  );
};

export default CatalogPage;