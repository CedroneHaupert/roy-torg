import React from 'react';

const Footer = ({ navigate }) => (
  <footer className="bg-slate-900 text-slate-300 py-12 border-t-4 border-[#F97316] mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="col-span-1 md:col-span-2">
        <div className="font-black text-2xl tracking-tight text-white mb-4">РОЙ<span className="text-[#F97316]">ТОРГ</span></div>
        <p className="text-sm text-slate-400 max-w-md leading-relaxed">
          Надежная ИТ-платформа для поиска коммерческой техники через систему открытых торгов. Входит в транспортную экосистему РОЙ. Мы предоставляем программное обеспечение, честную независимую инспекцию и юридическую безопасность.
        </p>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Документы</h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li><button onClick={() => navigate('offer')} className="hover:text-[#F97316] transition">Публичная оферта</button></li>
          <li><button onClick={() => navigate('rules')} className="hover:text-[#F97316] transition">Правила проведения торгов</button></li>
          <li><button onClick={() => navigate('privacy')} className="hover:text-[#F97316] transition">Политика конфиденциальности</button></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Продавцам и Партнерам</h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li><button onClick={() => navigate('sell')} className="hover:text-[#F97316] transition text-[#F97316]">Подать заявку на оценку</button></li>
          <li><button onClick={() => navigate('finance')} className="hover:text-[#F97316] transition">Софинансирование</button></li>
          <li><button onClick={() => navigate('inspection')} className="hover:text-[#F97316] transition">Как проходит инспекция</button></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
      <p>© 2026 Экосистема РОЙ. Все права защищены. Сайт не является публичной офертой, за исключением страницы "Публичная оферта".</p>
      <p>Сделки купли-продажи заключаются напрямую между Продавцом и Покупателем.</p>
    </div>
  </footer>
);

export default Footer;