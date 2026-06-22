import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { 
  ChevronRight, Archive, TrendingUp, Wallet, Image as ImageIcon, PlayCircle, Star, 
  History, Lock, UserCircle, Trophy, AlertTriangle, CheckCircle2, CreditCard, Gavel, 
  Info, Bot, MessageCircle, DownloadCloud 
} from 'lucide-react';
import { io } from 'socket.io-client';

// Подключаемся к бэкенду. Оставляем глобально для этого компонента, как было в App.js
const socket = io('');

const maskInn = (inn) => {
    if (!inn) return 'Не указан';
    if (inn.length < 6) return 'Скрыт';
    return inn.substring(0, 3) + '*****' + inn.substring(inn.length - 2);
};

const LotDetailPage = ({ navigate, lotId, lots, currentUser, openAuth, addToast }) => {
  const lot = lots.find(l => l.id === lotId);
  const [bidAmount, setBidAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('info'); 
  const [autoBrokerLimit, setAutoBrokerLimit] = useState('');
  const [autoBrokerActive, setAutoBrokerActive] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
      if (lot) setBidAmount(lot.currentPrice + lot.minStep);
  }, [lot]);

  if (!lot) return <div className="p-8 text-center">Лот не найден</div>;

  const isArchived = lot.status === 'completed' || lot.status === 'cancelled' || new Date(lot.endTime).getTime() <= Date.now();
  const reserveMet = lot.reservePrice && lot.currentPrice >= lot.reservePrice;

  const safeBids = lot.Bids && lot.Bids.length > 0 ? lot.Bids.map(b => ({
      id: b.id, amount: b.amount, time: new Date(b.createdAt).toLocaleString('ru-RU', {timeStyle: "medium"}), 
      userPhone: b.userPhone ? b.userPhone.replace(/(\d{3})\d{4}(\d{2})/, "$1***-**$2") : 'Аноним'
  })).sort((a,b) => b.amount - a.amount) : [];

  const displayImages = lot.images && lot.images.length > 0 
    ? lot.images.map(img => `${img}`)
    : [lot.imageUrl || `https://placehold.co/800x500/0F172A/FFFFFF?text=Лот+${lot.lotNumber || lot.id}`];

  const winner = isArchived && safeBids.length > 0 ? safeBids[0] : null;

  const handleBid = () => {
    if (isArchived) return;
    if (!currentUser) { openAuth(); return; }
    if (currentUser.isBlocked) { addToast("Доступ запрещен", "Ваш аккаунт заблокирован администратором.", "error"); return; }
    
    const requiredDeposit = currentUser.userType === 'legal' ? 5000 : 3000;
    if (!currentUser.isVerified && currentUser.depositBalance < requiredDeposit) {
      addToast("Доступ запрещен", `Для участия в торгах необходимо пополнить депозит на ${requiredDeposit.toLocaleString('ru-RU')} ₽ в Личном кабинете.`, "error");
      navigate('profile');
      return;
    }

    socket.emit('placeBid', { lotId: lot.id, bidAmount: bidAmount, userId: currentUser.id });
  };

  const toggleAutoBroker = () => {
      if (!currentUser) { openAuth(); return; }
      if (currentUser.isBlocked) { addToast("Доступ запрещен", "Ваш аккаунт заблокирован.", "error"); return; }
      
      const requiredDeposit = currentUser.userType === 'legal' ? 5000 : 3000;
      if (!currentUser.isVerified && currentUser.depositBalance < requiredDeposit) {
        addToast("Доступ запрещен", `Для работы автоброкера необходимо пополнить депозит на ${requiredDeposit.toLocaleString('ru-RU')} ₽.`, "error");
        navigate('profile'); return;
      }

      if (!autoBrokerLimit || autoBrokerLimit <= lot.currentPrice) { addToast('Ошибка', 'Лимит должен быть больше текущей цены!', 'error'); return; }
      setAutoBrokerActive(!autoBrokerActive);
      if (!autoBrokerActive) {
          socket.emit('setupAutoBroker', { lotId: lot.id, maxAmount: Number(autoBrokerLimit), userId: currentUser.id });
          addToast('Успех', `Автоброкер включен! Мы будем делать ставки за вас до лимита в ${Number(autoBrokerLimit).toLocaleString()} ₽`, 'success');
      } else {
          socket.emit('cancelAutoBroker', { lotId: lot.id, userId: currentUser.id });
      }
  };

  const handleDownloadPDF = (type) => {
      const fileUrl = type === 'Инспекция' ? lot.inspectionPdf : lot.avtotekaPdf;
      if (!fileUrl) { addToast('Ошибка', 'Файл еще не загружен продавцом', 'error'); return; }
      window.open(`${fileUrl}`, '_blank');
  };

  const handleInspectionPayment = async () => {
      try {
          const res = await fetch('/api/payment/create', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.id, amount: 12800, paymentType: 'inspection', lotId: lot.id, returnUrl: window.location.href })
          });
          const data = await res.json();
          if (data.success && data.url) window.location.href = data.url;
          else addToast("Ошибка", "Не удалось создать платеж", "error");
      } catch (e) { addToast("Ошибка", "Сбой сети", "error"); }
  };

  const handleCommissionPayment = async () => {
      try {
          const amount = Math.round(lot.currentPrice * 0.03);
          const res = await fetch('/api/payment/create', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.id, amount: amount, paymentType: 'commission', lotId: lot.id, returnUrl: window.location.href })
          });
          const data = await res.json();
          if (data.success && data.url) window.location.href = data.url;
          else addToast("Ошибка", "Не удалось создать платеж", "error");
      } catch (e) { addToast("Ошибка", "Сбой сети", "error"); }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
      <button onClick={() => navigate('catalog')} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-6 text-sm font-medium">
        <ChevronRight className="rotate-180" size={16}/> Назад к торгам
      </button>

      {isArchived && (
          <div className={`border px-4 py-3 rounded-xl mb-6 flex items-center gap-3 ${lot.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <Archive size={24} className="shrink-0"/> 
              <div>
                  <b className="block md:inline">
                      {lot.status === 'cancelled' ? 'Торги по данному лоту ОТМЕНЕНЫ администратором.' : 'Торги по данному лоту завершены.'}
                  </b> 
                  {lot.status !== 'cancelled' && (winner ? ` Победитель: ${winner.userPhone} (Сумма: ${winner.amount.toLocaleString('ru-RU')} ₽)` : ' Ставок не было.')}
              </div>
          </div>
      )}

      {/* Яркий блок рыночной оценки */}
      {!isArchived && lot.estimatedValue && (
        <div className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white p-5 rounded-2xl shadow-lg mb-6 flex items-center justify-between">
            <div>
                <div className="text-green-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={14}/> Рыночная оценка</div>
                <div className="text-3xl font-black">~ {Number(lot.estimatedValue).toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="hidden sm:block bg-white/20 p-4 rounded-full backdrop-blur-sm">
                <Wallet size={32} className="text-white"/>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200 shadow-sm">
            <div className="h-[400px] relative">
                {/* ИЗМЕНЕНО: object-contain для детальной карточки, чтобы фото не обрезалось */}
                <img src={displayImages[currentImageIndex]} alt={lot.title} className={`w-full h-full object-contain transition-opacity duration-300 ${isArchived ? 'grayscale opacity-90' : ''}`} />
                {!isArchived && displayImages.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg backdrop-blur-sm text-sm shadow-lg flex items-center gap-2">
                    <ImageIcon size={16} /> Фото {currentImageIndex + 1} из {displayImages.length}
                    </div>
                )}
                {!isArchived && lot.videoUrl && (
                    <a href={lot.videoUrl} target="_blank" rel="noreferrer" className="absolute bottom-4 left-4 bg-red-600/90 text-white px-3 py-1.5 rounded-lg backdrop-blur-sm text-sm shadow-lg flex items-center gap-2 hover:bg-red-700 transition">
                        <PlayCircle size={16} /> Смотреть видео
                    </a>
                )}
            </div>
            
            {displayImages.length > 1 && (
                <div className="bg-white p-3 flex gap-2 overflow-x-auto hide-scrollbar border-t border-slate-200">
                    {displayImages.map((imgUrl, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 bg-slate-50 transition-all ${currentImageIndex === idx ? 'border-blue-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        >
                            <img src={imgUrl} className={`w-full h-full object-contain ${isArchived ? 'grayscale' : ''}`} alt="thumbnail" />
                        </button>
                    ))}
                </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto hide-scrollbar">
                 <button onClick={() => setActiveTab('info')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'info' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Описание</button>
                 <button onClick={() => setActiveTab('docs')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'docs' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Документы</button>
                 <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-4 font-bold text-sm whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                     <History size={16}/> История торгов
                 </button>
             </div>

             <div className="p-6 md:p-8">
                 {activeTab === 'info' && (
                     <>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-sm font-bold text-blue-600 mb-1">Аукцион #{lot.auctionId || 'A-1000'} • Лот #{lot.lotNumber || lot.id}</div>
                                <h1 className="text-3xl font-black text-slate-900 leading-tight">{lot.title}</h1>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 mb-1">Год выпуска</div>
                                <div className="font-bold text-slate-800 text-lg">{lot.year || '2022'}</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 mb-1">Пробег / МЧ</div>
                                <div className="font-bold text-slate-800 text-lg">{lot.mileage || '142 000 км'}</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 mb-1">Налог</div>
                                <div className="font-bold text-slate-800 text-lg">{lot.hasNds ? 'С НДС' : 'Без НДС'}</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 mb-1">Всего ставок</div>
                                <div className="font-bold text-blue-600 text-lg">{lot.bidsCount}</div>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <div className="text-xs text-amber-700 mb-1">Оценка РОЙ</div>
                                <div className="font-bold text-amber-600 text-lg flex items-center gap-1">
                                    <Star size={16} fill="currentColor" /> {lot.mechanicRating || '8'} / 10
                                </div>
                            </div>
                        </div>

                        {/* БЛОК БЕЗОПАСНОСТИ ПРОДАВЦА */}
                        {lot.sellerInn && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-600 text-white p-2 rounded-lg"><ShieldCheck size={20}/></div>
                                    <div>
                                        <h4 className="font-bold text-green-900 text-sm">Продавец проверен СБ</h4>
                                        <div className="text-xs text-green-700">ИНН: <span className="font-mono bg-green-100 px-1 rounded">{maskInn(lot.sellerInn)}</span></div>
                                    </div>
                                </div>
                                {lot.isSecurityChecked && <span className="text-xs font-bold text-green-600 hidden sm:block">Риск банкротства отсутствует</span>}
                            </div>
                        )}

                        <h3 className="font-bold text-lg mb-3">Описание от продавца</h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {lot.description || "Техника в отличном состоянии, полностью обслужена. Готова к работе сразу после покупки. Проведено полное ТО. Причина продажи: обновление автопарка. Торг возможен только в рамках аукциона."}
                        </p>
                     </>
                 )}

                 {activeTab === 'docs' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col justify-between group transition hover:shadow-md">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0">
                                <ShieldCheck size={24} />
                                </div>
                                <div>
                                <h4 className="font-bold text-blue-900">Инспекция РОЙ</h4>
                                <p className="text-sm text-blue-700 mt-1">Официальный PDF-отчет о техническом состоянии.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDownloadPDF('Инспекция')}
                                className="bg-white border border-blue-300 text-blue-700 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white transition"
                            >
                                <DownloadCloud size={16}/> Скачать отчет
                            </button>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between group transition hover:shadow-md">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center shrink-0">
                                <Search size={24} />
                                </div>
                                <div>
                                <h4 className="font-bold text-slate-800">Отчет Автотеки</h4>
                                <p className="text-sm text-slate-500 mt-1">История регистраций и ДТП.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDownloadPDF('Автотека')}
                                className="bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 group-hover:bg-slate-800 group-hover:text-white transition"
                            >
                                <DownloadCloud size={16}/> Скачать автотеку
                            </button>
                        </div>
                     </div>
                 )}

                 {activeTab === 'history' && (
                     <div>
                         {!currentUser ? (
                             <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                 <Lock size={48} className="mx-auto text-slate-300 mb-4" />
                                 <h3 className="font-bold text-slate-700 mb-2">История скрыта</h3>
                                 <p className="text-slate-500 text-sm mb-4">Пожалуйста, войдите в систему, чтобы просматривать детали ставок.</p>
                                 <button onClick={openAuth} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg text-sm">Вход / Регистрация</button>
                             </div>
                         ) : safeBids.length === 0 ? (
                             <div className="text-center text-slate-500 py-8">Ставок пока нет. Будьте первым!</div>
                         ) : (
                             <div className="overflow-x-auto">
                                 <table className="w-full text-left border-collapse">
                                     <thead>
                                         <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                                             <th className="py-3 px-4">Время ставки</th>
                                             <th className="py-3 px-4">Участник</th>
                                             <th className="py-3 px-4 text-right">Сумма (₽)</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {safeBids.map((bid, idx) => (
                                             <tr key={bid.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                                 <td className="py-4 px-4 text-sm text-slate-600">{bid.time}</td>
                                                 <td className="py-4 px-4 text-sm font-medium text-slate-800">{bid.userPhone} {idx === 0 && <span className="ml-2 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Лидер</span>}</td>
                                                 <td className="py-4 px-4 text-right font-bold text-slate-900">{bid.amount.toLocaleString('ru-RU')}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         )}
                     </div>
                 )}
             </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="space-y-4 lg:sticky lg:top-24 h-max pb-8">
          
          <div className="bg-white p-6 rounded-2xl border-2 border-blue-600 shadow-xl">
            <div className="flex justify-between items-start mb-2">
              <div className="text-slate-500 font-medium">{isArchived ? 'Финальная цена:' : 'Текущая цена:'}</div>
              {!reserveMet && !isArchived && lot.reservePrice ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  <AlertTriangle size={12}/> Резерв не достигнут
                </div>
              ) : reserveMet ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                  <CheckCircle2 size={12}/> Резерв пройден
                </div>
              ) : null}
            </div>
            
            <div className="text-4xl font-black text-slate-900 mb-1 transition-all">
              {lot.currentPrice.toLocaleString('ru-RU')} ₽
            </div>
            
            {!isArchived && lot.reservePrice && (
              <div className="text-xs text-slate-400 mb-6 font-medium">
                Скрытый резерв: {Number(lot.reservePrice).toLocaleString('ru-RU')} ₽
              </div>
            )}
            {!lot.reservePrice && <div className="mb-6"></div>}

            {/* БЛОК ОПЛАТЫ ДЛЯ ПОБЕДИТЕЛЯ (С НОВЫМИ КНОПКАМИ И ЛОГИКОЙ) */}
            {isArchived && currentUser && winner && winner.userPhone === currentUser.phone && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl mb-4 text-center">
                    <Trophy className="mx-auto text-yellow-500 mb-2" size={48} />
                    <h3 className="font-black text-blue-900 text-xl mb-1">Вы победили в торгах!</h3>
                    
                    {!lot.inspectionPaid ? (
                        <>
                            <p className="text-sm text-blue-800 mb-4">Шаг 1: Оплатите выездную инспекцию для бронирования лота.</p>
                            <button onClick={handleInspectionPayment} className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30">
                                <CreditCard size={18}/> Оплатить осмотр (12 800 ₽)
                            </button>
                            <p className="text-xs text-slate-500 mt-3 leading-tight">Согласно оферте, оплату необходимо произвести в течение 3 дней.</p>
                        </>
                    ) : !lot.commissionPaid ? (
                        <>
                            <p className="text-sm text-green-700 font-bold mb-2 flex items-center justify-center gap-1"><CheckCircle2 size={16}/> Осмотр оплачен</p>
                            <p className="text-sm text-blue-800 mb-4">Шаг 2: Оплатите комиссию платформы или запросите финансирование от ДВИЖ-ИНВЕСТ.РФ.</p>
                            <div className="space-y-3">
                                <button onClick={handleCommissionPayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-sm shadow-md">
                                    Оплатить комиссию 3% ({Math.round(lot.currentPrice * 0.03).toLocaleString('ru-RU')} ₽)
                                </button>
                                <button onClick={() => navigate('finance')} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition text-sm shadow-md">
                                    Запросить финансирование (ДВИЖ)
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                             <p className="text-sm text-green-700 font-bold mb-2 mt-4 flex items-center justify-center gap-1"><CheckCircle2 size={16}/> Все обязательства выполнены</p>
                             <p className="text-sm text-blue-800">Ожидайте звонка менеджера для подписания ДКП.</p>
                        </>
                    )}
                </div>
            )}

            {!isArchived && (
              <div className="space-y-4">
                <div className="flex border border-slate-300 rounded-xl overflow-hidden focus-within:border-blue-600">
                  <button onClick={() => setBidAmount(prev => Math.max(lot.currentPrice + lot.minStep, prev - lot.minStep))} className="px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border-r border-slate-300 transition">-</button>
                  <input 
                    type="text" 
                    value={bidAmount.toLocaleString('ru-RU')} 
                    readOnly
                    className="flex-1 text-center font-bold text-lg focus:outline-none"
                  />
                  <button onClick={() => setBidAmount(prev => prev + lot.minStep)} className="px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border-l border-slate-300 transition">+</button>
                </div>
                
                <button 
                  onClick={handleBid} 
                  className={`w-full font-bold py-4 rounded-xl shadow-lg transition flex justify-center items-center gap-2
                    ${currentUser ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-[#F97316] hover:bg-orange-600 text-white'}
                  `}
                >
                  {currentUser ? <><Gavel size={20} /> Сделать ставку</> : <><UserCircle size={20} /> Войти для ставки</>}
                </button>
                
                <div className="bg-slate-50 p-4 rounded-xl mt-4 border border-slate-200 text-xs text-slate-600 space-y-3">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5"/> 
                        <span>Стоимость каждой ставки <b>49 ₽</b>. В случае победы взимается невозвратная <b>комиссия 3%</b> от итоговой суммы для перехода к оформлению сделки.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Info size={16} className="text-blue-500 shrink-0 mt-0.5"/> 
                        <span>Если итоговая ставка ниже резервной цены, торги перейдут в стадию прямых переговоров. Продавец имеет право отказаться от сделки.</span>
                    </div>
                </div>

              </div>
            )}
          </div>

          {!isArchived && (
              <div className={`border rounded-2xl p-6 shadow-sm transition-colors ${autoBrokerActive ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${autoBrokerActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Bot size={20}/>
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800">Автоброкер</h4>
                          <p className="text-xs text-slate-500">{autoBrokerActive ? 'Робот делает ставки за вас' : 'Автоматические ставки'}</p>
                      </div>
                  </div>
                  
                  {!autoBrokerActive ? (
                      <div className="space-y-3 mt-4">
                          <input 
                              type="number" 
                              placeholder="Ваш лимит цены (₽)" 
                              value={autoBrokerLimit}
                              onChange={(e) => setAutoBrokerLimit(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-blue-600"
                          />
                          <button onClick={toggleAutoBroker} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-sm transition">
                              Включить автоторг
                          </button>
                      </div>
                  ) : (
                      <div className="mt-4">
                          <div className="text-sm text-slate-600 mb-3">
                              Лимит: <span className="font-bold text-slate-900">{Number(autoBrokerLimit).toLocaleString('ru-RU')} ₽</span>
                          </div>
                          <button onClick={() => setAutoBrokerActive(false)} className="w-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-xl text-sm transition">
                              Отключить робота
                          </button>
                      </div>
                  )}
              </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-2">Связь с продавцом</h4>
            <p className="text-xs text-slate-500 mb-4">Безопасный анонимный чат. ИИ-бот ответит на вопросы по акту осмотра или передаст запрос владельцу.</p>
            <a href="https://t.me/ROYMTK" target="_blank" rel="noreferrer" className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
              <MessageCircle size={18}/> Задать вопрос в Telegram
            </a>
          </div>

        </div>
      </div>
    </main>
  );
};

export default LotDetailPage;