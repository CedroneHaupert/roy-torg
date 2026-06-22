import React, { useState, useEffect } from 'react';
import { Search, Gavel, Truck, Users, Package, Tractor, CarFront, ArrowRight } from 'lucide-react';
import { LotCard, UpcomingLotRow } from '../components/LotCard';
import { CheckCircle2, Bot } from 'lucide-react';

const HomePage = ({ navigate, lots }) => {
  const [stats, setStats] = useState({ users: 115, auctions: 27, sold: 15 });

  useEffect(() => {
      fetch('/api/admin/stats')
          .then(res => res.json())
          .then(data => {
              if (data) {
                  setStats({
                      users: 115 + (data.totalUsers || 0),
                      auctions: 27 + (data.completedLots || 0),
                      sold: 15 + (data.completedLots || 0)
                  });
              }
          })
          .catch(console.error);
  }, []);

  const activeLots = lots.filter(l => {
      const now = Date.now();
      const end = new Date(l.endTime).getTime();
      const start = l.startTime ? new Date(l.startTime).getTime() : 0;
      return l.status !== 'completed' && end > now && start <= now;
  });

  const scheduledLots = lots.filter(l => {
      const now = Date.now();
      const start = l.startTime ? new Date(l.startTime).getTime() : 0;
      return l.status !== 'completed' && start > now;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
  <main className="flex-1">
    <section className="bg-slate-900 text-white relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity" style={{ backgroundImage: "url('/foto2.jpg')" }}></div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">Прозрачные аукционы<br/><span className="text-blue-400">коммерческой техники</span></h1>
        <p className="text-lg text-slate-300 mb-10 max-w-2xl leading-relaxed">Покупайте проверенную технику по реальной рыночной цене. Гарантия состояния, безопасные расчеты и доставка по всей РФ напрямую от экосистемы РОЙ.</p>
        
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-2xl flex flex-col md:flex-row gap-3 w-full">
           <input type="text" placeholder="Укажите марку, модель или номер лота..." className="flex-1 px-5 py-4 text-white placeholder-slate-300 bg-slate-900/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
           <button onClick={() => navigate('catalog')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/30">
             <Search size={20} /> Найти технику
           </button>
        </div>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition transform">
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Gavel size={32}/></div>
                <div>
                    <div className="text-3xl font-black text-slate-800">{stats.auctions}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Аукционов</div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition transform">
                <div className="bg-green-50 p-4 rounded-2xl text-green-600"><Truck size={32}/></div>
                <div>
                    <div className="text-3xl font-black text-slate-800">{stats.sold}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Продано техники</div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition transform">
                <div className="bg-orange-50 p-4 rounded-2xl text-[#F97316]"><Users size={32}/></div>
                <div>
                    <div className="text-3xl font-black text-slate-800">{stats.users}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Участников</div>
                </div>
            </div>
        </div>
    </section>

    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <button onClick={() => navigate('catalog')} className="bg-white p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition border border-slate-100 group flex flex-col items-center justify-center gap-3">
              <div className="bg-orange-50 p-4 rounded-full text-[#F97316] group-hover:scale-110 transition-transform"><Truck size={32}/></div>
              <span className="font-bold text-slate-800">Тягачи</span>
            </button>
            <button onClick={() => navigate('catalog')} className="bg-white p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition border border-slate-100 group flex flex-col items-center justify-center gap-3">
              <div className="bg-blue-50 p-4 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><Package size={32}/></div>
              <span className="font-bold text-slate-800">Полуприцепы</span>
            </button>
            <button onClick={() => navigate('catalog')} className="bg-white p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition border border-slate-100 group flex flex-col items-center justify-center gap-3">
              <div className="bg-slate-50 p-4 rounded-full text-slate-600 group-hover:scale-110 transition-transform"><Tractor size={32}/></div>
              <span className="font-bold text-slate-800">Спецтехника</span>
            </button>
            <button onClick={() => navigate('catalog')} className="bg-white p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition border border-slate-100 group flex flex-col items-center justify-center gap-3">
              <div className="bg-green-50 p-4 rounded-full text-green-600 group-hover:scale-110 transition-transform"><CarFront size={32}/></div>
              <span className="font-bold text-slate-800">Коммерческие</span>
            </button>
        </div>
    </section>

    {scheduledLots.length > 0 && (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-3xl font-black text-slate-900">Ближайшие торги</h2>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                          <th className="py-4 px-6 font-bold">Лот / Модель</th>
                          <th className="py-4 px-6 font-bold">Начальная цена</th>
                          <th className="py-4 px-6 font-bold text-right">До начала</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {scheduledLots.slice(0, 5).map(lot => (
                          <UpcomingLotRow key={lot.id} lot={lot} navigate={navigate} />
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </section>
    )}

    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-3xl font-black text-slate-900">Горящие лоты</h2>
        <button onClick={() => navigate('catalog')} className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 transition">Все лоты <ArrowRight size={18}/></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeLots.slice(0,3).map(lot => <LotCard key={lot.id} lot={lot} onClick={(id) => navigate('lot', id)} />)}
        {activeLots.length === 0 && <p className="text-slate-500">Нет активных торгов в данный момент.</p>}
      </div>
    </section>

    <section className="bg-slate-50 border-t border-b border-slate-200 py-20 mb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-4">История успешных торгов</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Наши пользователи регулярно выкупают технику ниже рыночной стоимости благодаря прозрачной системе ставок и отсутствию перекупщиков.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                  { title: "KAMAZ 5490 NEO (2021)", eval: 2800000, final: 2150000, img: "/KAMAZ5490.jpg" },
                  { title: "Полуприцеп ТОНАР (2020)", eval: 1950000, final: 1220000, img: "/tonar.jpg" },
                  { title: "SITRAK C7H MAX (2023)", eval: 5200000, final: 4800000, img: "/sitrak.jpeg" }
              ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition">
                      <div className="h-40 bg-slate-200 rounded-xl mb-4 overflow-hidden"><img src={item.img} alt="" className="w-full h-full object-cover grayscale opacity-80" /></div>
                      <h4 className="font-bold text-slate-800 mb-3">{item.title}</h4>
                      <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm"><span className="text-slate-500">Оценка РОЙ:</span><span className="font-medium line-through text-slate-400">{item.eval.toLocaleString()} ₽</span></div>
                          <div className="flex justify-between text-sm"><span className="text-slate-500">Финальная цена:</span><span className="font-black text-slate-800">{item.final.toLocaleString()} ₽</span></div>
                      </div>
                      <div className="mt-auto bg-green-50 text-green-700 font-bold p-3 rounded-xl flex items-center justify-between border border-green-100">
                          <span>Выгода:</span> <span>{(item.eval - item.final).toLocaleString()} ₽</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 overflow-hidden">
        <div className="bg-blue-600 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between relative shadow-2xl">
            <div className="md:w-1/2 text-white z-10 mb-8 md:mb-0 pr-0 md:pr-8">
                <h2 className="text-3xl font-black mb-4">Управляйте ставками с любого устройства</h2>
                <p className="text-blue-100 mb-8 leading-relaxed">
                    Ваш персональный командный пункт. Настраивайте Автоброкера, скачивайте PDF-отчеты диагностики Автотеки и следите за ходом торгов в реальном времени. Никакой бюрократии — только цифры и факты.
                </p>
                <ul className="space-y-3 font-medium text-blue-50">
                    <li className="flex items-center gap-3"><CheckCircle2 className="text-blue-300"/> Умный робот-автоброкер</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="text-blue-300"/> Мгновенный возврат депозита</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="text-blue-300"/> Электронный документооборот</li>
                </ul>
            </div>
            <div className="md:w-1/2 relative z-10 flex justify-center">
                <div className="bg-slate-900 border-4 border-slate-800 rounded-2xl w-full max-w-sm aspect-[3/4] shadow-2xl overflow-hidden relative flex flex-col">
                    <div className="bg-slate-800 p-3 text-center text-xs font-bold text-slate-400 border-b border-slate-700">Кабинет РОЙ ТОРГ</div>
                    <div className="p-4 flex-1 bg-slate-50 flex flex-col gap-3">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                            <div className="text-xs text-slate-400">Ставка на Лот L-54321</div>
                            <div className="text-xl font-black text-slate-800 mt-1">4 250 000 ₽</div>
                            <div className="text-[10px] text-green-600 font-bold bg-green-50 w-max px-2 py-1 rounded mt-2 border border-green-200">Вы лидируете</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mt-auto">
                            <div className="flex items-center gap-2 text-sm font-bold mb-2"><Bot size={16} className="text-blue-600"/> Автоброкер активен</div>
                            <div className="text-xs text-slate-500">Лимит: 4 500 000 ₽</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
            <div className="absolute -bottom-24 left-1/4 w-72 h-72 bg-blue-700 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
        </div>
    </section>
  </main>
)};

export default HomePage;