import React, { useState, useEffect } from 'react';
import { Clock, Archive, Star, CalendarClock, TrendingUp } from 'lucide-react';

const LotCard = ({ lot, onClick }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const isArchived = lot.status === 'completed' || new Date(lot.endTime).getTime() <= Date.now();

  useEffect(() => {
    if (isArchived) return;
    const updateTimer = () => {
      const distance = new Date(lot.endTime).getTime() - Date.now();
      if (distance <= 0) {
        setTimeLeft('Торги завершены');
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(days > 0 ? `${days}д ${hours}ч ${mins}м` : `${hours}ч ${mins}м ${secs}с`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lot.endTime, isArchived]);

  const displayImage = (lot.images && lot.images.length > 0) ? `${lot.images[0]}` : (lot.imageUrl || `https://placehold.co/800x500/0F172A/FFFFFF?text=Лот+${lot.lotNumber || lot.id}`);

  return (
    <div onClick={() => onClick(lot.id)} className={`bg-white rounded-2xl border overflow-hidden transition-shadow group flex flex-col cursor-pointer h-full ${isArchived ? 'border-slate-200 opacity-80' : 'border-slate-200 hover:shadow-xl hover:border-blue-300'}`}>
      <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
        <img src={displayImage} className={`w-full h-full object-contain transition duration-500 ${isArchived ? 'grayscale' : 'group-hover:scale-105'}`} alt={lot.title} />
        {isArchived ? (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
                <div className="border-4 border-slate-800 text-slate-800 font-black text-xl uppercase tracking-widest px-4 py-2 rounded -rotate-12 bg-white/90">
                    Завершен
                </div>
            </div>
        ) : (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">Осмотрено РОЙ</div>
        )}
        <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow flex items-center gap-1">
            <Star size={10} fill="currentColor"/> {lot.mechanicRating || '8'} / 10
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <div className="text-xs text-slate-400 mb-1">Аукцион #{lot.auctionId || 'A-1000'} • Лот #{lot.lotNumber || lot.id}</div>
        <h3 className="font-bold text-slate-800 leading-tight mb-2 line-clamp-2">{lot.title}</h3>
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1"><CalendarClock size={14} className="text-slate-400"/> <span className="font-bold">Год:</span> {lot.year || 'Не указан'}</div>
          <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
          <div className="flex items-center gap-1"><TrendingUp size={14} className="text-slate-400"/> <span className="font-bold">Пробег:</span> {lot.mileage || 'Не указан'}</div>
        </div>

        <div className="mt-auto bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500">{isArchived ? 'Финальная цена:' : 'Текущая ставка:'}</span>
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
              {lot.hasNds ? 'с НДС' : 'Без НДС'}
            </span>
          </div>
          <div className="text-xl font-black text-blue-900 mb-3">{lot.currentPrice.toLocaleString('ru-RU')} ₽</div>
          <div className={`flex items-center justify-between text-xs font-bold p-2 rounded-lg ${isArchived ? 'bg-slate-200 text-slate-600' : 'text-orange-600 bg-orange-50'}`}>
            <span className="flex items-center gap-1">
                {isArchived ? <Archive size={12}/> : <Clock size={12} className="animate-pulse" />} 
                {isArchived ? 'Статус:' : 'Осталось:'}
            </span>
            <span>{isArchived ? 'Завершен' : timeLeft}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const UpcomingLotRow = ({ lot, navigate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
      const updateTimer = () => {
          const distance = new Date(lot.startTime).getTime() - Date.now();
          if (distance <= 0) {
              setTimeLeft('Начинается...');
              return;
          }
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(days > 0 ? `${days}д ${hours}ч ${mins}м` : `${hours}ч ${mins}м ${secs}с`);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
  }, [lot.startTime]);

  return (
      <tr className="hover:bg-slate-50 transition cursor-pointer group" onClick={() => navigate('lot', lot.id)}>
          <td className="py-4 px-6">
              <div className="font-bold text-slate-800 group-hover:text-blue-600 transition">{lot.title}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>Лот #{lot.lotNumber || lot.id}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="font-medium text-slate-700">Год: {lot.year || 'Не указан'}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="font-medium text-slate-700">Пробег: {lot.mileage || 'Не указан'}</span>
              </div>
          </td>
          <td className="py-4 px-6 font-black text-slate-900">{lot.currentPrice.toLocaleString('ru-RU')} ₽</td>
          <td className="py-4 px-6 text-right">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-sm border border-blue-100">
                  <CalendarClock size={16} className="animate-pulse" /> {timeLeft}
              </div>
          </td>
      </tr>
  );
};

export { LotCard, UpcomingLotRow };