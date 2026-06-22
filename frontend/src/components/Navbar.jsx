import React, { useState, useEffect } from 'react';
import { UserCircle, X } from 'lucide-react';

const Navbar = ({ navigate, currentPage, currentUser, openAuth }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
      if (!currentUser) {
          const timer = setTimeout(() => setShowTooltip(true), 3000);
          return () => clearTimeout(timer);
      } else {
          setShowTooltip(false);
      }
  }, [currentUser]);

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('home')} className="font-black text-2xl tracking-tight flex items-center hover:scale-105 transition transform">
            РОЙ<span className="text-[#F97316]">ТОРГ</span>
          </button>
          <div className="hidden lg:flex gap-5 ml-6 text-sm font-medium text-slate-300">
            <button onClick={() => navigate('catalog')} className={`hover:text-white transition ${currentPage === 'catalog' ? 'text-white border-b-2 border-[#F97316]' : ''}`}>Каталог</button>
            <button onClick={() => navigate('finance')} className={`hover:text-white transition ${currentPage === 'finance' ? 'text-white border-b-2 border-[#F97316]' : ''}`}>Финансирование</button>
            <button onClick={() => navigate('about')} className={`hover:text-white transition ${currentPage === 'about' ? 'text-white border-b-2 border-[#F97316]' : ''}`}>О нас</button>
            <button onClick={() => navigate('sell')} className={`hover:text-white transition text-[#F97316] ${currentPage === 'sell' ? 'border-b-2 border-[#F97316]' : ''}`}>Продать технику</button>
          </div>
        </div>
        <div className="flex items-center gap-4 relative">
          {currentUser ? (
            <div className="hidden sm:flex items-center gap-4 bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700">
              <span className="text-sm font-medium">{currentUser.phone}</span>
              <div className="h-4 w-px bg-slate-600"></div>
              <span className={`text-xs font-bold ${currentUser.depositBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>Депозит: {currentUser.depositBalance.toLocaleString('ru-RU')} ₽</span>
            </div>
          ) : (
            <div className="relative">
                <button onClick={openAuth} className="hidden sm:block border border-slate-600 hover:bg-slate-800 px-4 py-1.5 rounded-lg text-sm transition font-medium">
                  Вход / Регистрация
                </button>
                {showTooltip && (
                    <div className="absolute right-0 top-full mt-3 w-64 bg-blue-600 text-white text-xs p-3 rounded-xl shadow-2xl animate-bounce z-50">
                        <div className="absolute -top-2 right-6 w-4 h-4 bg-blue-600 rotate-45"></div>
                        <button onClick={() => setShowTooltip(false)} className="absolute top-1 right-1 text-white/70 hover:text-white"><X size={14}/></button>
                        <b>Авторизуйтесь!</b><br/>Это откроет доступ к ставкам, истории торгов и скрытым лотам.
                    </div>
                )}
            </div>
          )}
          <button onClick={currentUser ? () => navigate('profile') : openAuth} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition relative">
            <UserCircle size={20} />
            {currentUser && !currentUser.isVerified && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;