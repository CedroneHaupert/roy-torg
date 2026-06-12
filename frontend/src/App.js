import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Search, Clock, ShieldCheck, Truck, CheckCircle2, 
  ChevronRight, UserCircle, X, PlusCircle, LayoutDashboard, 
  Settings, Gavel, FileText, AlertTriangle, ArrowRight, Wallet,
  MessageCircle, Info, CalendarClock, Archive, Package, CarFront, Tractor,
  ListOrdered, CreditCard, FileUp, User, Bot, History, Lock, UploadCloud, Image as ImageIcon,
  PlayCircle, Star, DownloadCloud, Loader2, Trophy, Users, Car, Repeat,
  TrendingUp, Calculator, MapPin, MonitorSmartphone, MessageSquareQuote, ShieldBan, UserCheck, CheckSquare, FileSignature, LogOut, Edit3, Activity, FileSpreadsheet
} from 'lucide-react';

// Подключаемся к бэкенду
const socket = io('');

// === Вспомогательная функция маскировки ИНН ===
const maskInn = (inn) => {
    if (!inn) return 'Не указан';
    if (inn.length < 6) return 'Скрыт';
    return inn.substring(0, 3) + '*****' + inn.substring(inn.length - 2);
};

// === КОМПОНЕНТ УВЕДОМЛЕНИЙ (TOASTS) ===
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

// === МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ (С ОФЕРТОЙ И МАСКОЙ) ===
const AuthModal = ({ isOpen, onClose, onLogin, addToast, navigate }) => {
  const [step, setStep] = useState(1); 
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isOpen) return null;

  // Форматирование телефона на лету
  const handlePhoneChange = (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (!val) {
          setPhone('');
          return;
      }
      if (['7', '8'].includes(val[0])) {
          val = val.substring(1);
      }
      
      let res = '+7';
      if (val.length > 0) res += ' (' + val.substring(0, 3);
      if (val.length >= 4) res += ') ' + val.substring(3, 6);
      if (val.length >= 7) res += '-' + val.substring(6, 8);
      if (val.length >= 9) res += '-' + val.substring(8, 10);
      
      setPhone(res);
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) return;
    
    setIsLoading(true);
    try {
        const response = await fetch('/api/auth/send-code', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone })
        });
        const data = await response.json();
        if (data.success) {
            setStep(2);
            addToast('СМС отправлено', 'Проверьте ваш телефон', 'success');
        } else {
            addToast('Ошибка', data.error, 'error');
        }
    } catch (error) {
        addToast('Сбой', 'Не удалось связаться с сервером', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code })
        });
        const data = await response.json();
        if (data.success) {
            onLogin(data.user);
            addToast('Успех', 'Вы вошли в систему', 'success');
            setTimeout(() => { setStep(1); setPhone(''); setCode(''); setAgreedToTerms(false); onClose(); }, 500);
        } else {
            addToast('Ошибка', data.error || 'Неверный код', 'error');
        }
    } catch (error) {
        addToast('Сбой', 'Не удалось связаться с сервером', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">
            {step === 1 ? 'Вход в систему' : 'Подтверждение'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X size={24} />
          </button>
        </div>
        
        {step === 1 ? (
          <form onSubmit={handlePhoneSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-500">
              Для участия в торгах необходимо авторизоваться по номеру телефона.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Номер телефона</label>
              <input 
                type="tel" 
                required
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={18}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition text-lg font-medium tracking-wide"
              />
            </div>

            <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input 
                    type="checkbox" 
                    id="terms" 
                    checked={agreedToTerms} 
                    onChange={(e) => setAgreedToTerms(e.target.checked)} 
                    className="mt-1 w-5 h-5 text-[#F97316] rounded border-slate-300 focus:ring-[#F97316] cursor-pointer shrink-0" 
                />
                <label htmlFor="terms" className="text-xs text-slate-600 leading-tight cursor-pointer">
                    Я принимаю условия <button type="button" onClick={() => {onClose(); navigate('offer');}} className="text-blue-600 font-bold hover:underline">Публичной оферты</button>, и подтверждаю ознакомление с правилом невозвратной комиссии 3% в случае победы на торгах.
                </label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || phone.length < 18 || !agreedToTerms}
              className="w-full bg-[#F97316] disabled:bg-orange-300 hover:bg-orange-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-orange-500/30 transition transform hover:-translate-y-0.5"
            >
              {isLoading ? 'Отправка СМС...' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="p-6 space-y-6 animate-in slide-in-from-right-4">
            <p className="text-sm text-slate-500">
              Мы отправили код подтверждения на номер <span className="font-bold text-slate-800">{phone}</span>.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Код из СМС</label>
              <input 
                type="text" 
                required
                maxLength="4"
                placeholder="0000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition text-3xl font-black tracking-[1em] text-center"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading || code.length < 4}
              className="w-full bg-blue-600 disabled:bg-blue-300 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5"
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setStep(1)} className="text-xs text-blue-600 font-bold hover:underline">
                Изменить номер
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

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
              <span className="text-xs font-bold text-green-400">Депозит: {currentUser.depositBalance.toLocaleString('ru-RU')} ₽</span>
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
      <div className="relative h-48 bg-slate-200 overflow-hidden shrink-0">
        <img src={displayImage} className={`w-full h-full object-cover transition duration-500 ${isArchived ? 'grayscale' : 'group-hover:scale-105'}`} alt={lot.title} />
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
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <span>{lot.year || '2022'} г.</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span>{lot.mileage || 'Без пробега'}</span>
          {lot.city && (
            <>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>{lot.city}</span>
            </>
          )}
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

// === КОМПОНЕНТ ДЛЯ СТРОКИ БЛИЖАЙШЕГО ЛОТА ===
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
              <div className="text-xs text-slate-500 mt-1">Аукцион #{lot.auctionId || 'A-1000'} • Лот #{lot.lotNumber || lot.id}</div>
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

// === СТРАНИЦЫ ===

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

    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl font-black text-slate-900 mb-10 text-center">Говорят перевозчики</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative">
                <MessageSquareQuote size={48} className="text-slate-100 absolute top-6 right-6" />
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">М</div>
                    <div><h4 className="font-bold text-slate-800">Михаил В.</h4><p className="text-xs text-slate-500">Владелец транспортной компании</p></div>
                </div>
                <p className="text-slate-600 leading-relaxed italic relative z-10">«Искали два шторных полуприцепа Schmitz для усиления парка. На вторичке цены космос. Зашел на РОЙ ТОРГ, закинул депозит. В итоге забрал сцепку на 15% ниже рынка. Осмотр был честный, все косяки по тенту сразу указали в акте. Оформили ДКП день в день.»</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative">
                <MessageSquareQuote size={48} className="text-slate-100 absolute top-6 right-6" />
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">С</div>
                    <div><h4 className="font-bold text-slate-800">Сергей П.</h4><p className="text-xs text-slate-500">Руководитель отдела логистики</p></div>
                </div>
                <p className="text-slate-600 leading-relaxed italic relative z-10">«Обновляли тягачи, нужно было срочно скинуть три старых КАМАЗа. Оценщик приехал на нашу базу, отснял материал. Через 3 дня машины ушли с молотка. Невозвратная комиссия площадки полностью окупается скоростью продажи и отсутствием торгов с перекупами у капота.»</p>
            </div>
        </div>
    </section>
  </main>
)};

// === ИНФОРМАЦИОННЫЕ И ЮРИДИЧЕСКИЕ СТРАНИЦЫ ===
const PrivacyPage = () => (
    <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Политика обработки персональных данных</h1>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6 leading-relaxed">
            <p>Настоящая политика составлена в соответствии с требованиями Федерального закона от 27.07.2006. №152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных ИТ-платформой «РОЙ ТОРГ».</p>
            <h3 className="text-xl font-bold text-slate-800 mt-6">1. Собираемые данные</h3>
            <p>Платформа собирает и обрабатывает следующие данные: номер мобильного телефона (для авторизации), ФИО, ИНН и сканы документов (при прохождении добровольной верификации в Личном кабинете для получения статуса "Верифицированный участник").</p>
            <h3 className="text-xl font-bold text-slate-800 mt-6">2. Цели обработки</h3>
            <p>Данные обрабатываются исключительно для: обеспечения доступа к функционалу Платформы, связи с пользователем для заключения договоров купли-продажи с третьими лицами, возврата гарантийного депозита и информирования о новых лотах.</p>
            <h3 className="text-xl font-bold text-slate-800 mt-6">3. Безопасность и передача третьим лицам</h3>
            <p>Мы применяем современные технические средства шифрования. Данные не передаются третьим лицам (за исключением требований правоохранительных органов РФ). Платформа выступает только в роли информационного посредника.</p>
        </div>
    </main>
);

const OfferPage = () => (
    <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Публичная оферта (Лицензионный договор)</h1>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6 leading-relaxed bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <p>Настоящий документ является официальным предложением (публичной офертой) заключить Лицензионный договор о предоставлении права использования программы для ЭВМ «РОЙ ТОРГ» (далее — Платформа).</p>
            
            <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">1. Предмет договора</h3>
            <p>Лицензиар предоставляет Лицензиату право использования Платформы на условиях простой (неисключительной) лицензии. Платформа представляет собой ИТ-сервис для публикации объявлений и проведения электронных торгов в формате аукциона.</p>
            
            <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">2. Гарантийный депозит</h3>
            <p>Для активации функции совершения ставок (Автоброкера), Пользователь обязан внести обеспечительный платеж (Депозит) в размере 5 000 (Пять тысяч) рублей. Для физических лиц платеж холдируется (замораживается) на банковской карте без фактического списания. Для юридических лиц оплата производится на основании выставленного Счета.</p>
            
            <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">3. Лицензионное вознаграждение (Комиссия)</h3>
            <p>В случае победы на торгах, Победитель обязуется выплатить Лицензиару вознаграждение в размере 3% (Три процента) от итоговой стоимости Лота за предоставление права использования Платформы и функции Автоброкера. До момента оплаты Лицензионного вознаграждения контакты Продавца не передаются.</p>

            <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">4. Ответственность сторон</h3>
            <p>Платформа не является стороной сделки купли-продажи техники. Договор купли-продажи заключается напрямую между Продавцом и Покупателем. Лицензиар не несет ответственности за скрытые дефекты техники, однако гарантирует достоверность Акта инспекции на момент его составления.</p>
        </div>
    </main>
);

const RulesPage = () => (
    <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Правила проведения электронных торгов</h1>
        <div className="space-y-8">
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center shrink-0">1</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Статус участников</h3>
                    <p className="text-slate-600 leading-relaxed">К участию допускаются только верифицированные пользователи (внесшие депозит 5000 ₽ или загрузившие корпоративные документы). Администрация оставляет за собой право заблокировать любого участника без объяснения причин.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center shrink-0">2</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Автоброкер и ставки</h3>
                    <p className="text-slate-600 leading-relaxed">Шаг аукциона фиксирован. При установке "Автоброкера" система автоматически перебивает ставки других участников на один минимальный шаг, пока не будет достигнут установленный вами лимит.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center shrink-0">3</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Скрытый резерв</h3>
                    <p className="text-slate-600 leading-relaxed">Продавец имеет право установить минимальную цену продажи (Скрытый резерв). Если по окончании времени торгов итоговая ставка не достигла резерва, продавец имеет право отказаться от сделки.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center shrink-0">4</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Продление времени (Анти-снайпер)</h3>
                    <p className="text-slate-600 leading-relaxed">Любая ставка, сделанная за 3 минуты до окончания торгов, автоматически продлевает аукцион на 3 минуты для обеспечения честной конкуренции.</p>
                </div>
            </div>
        </div>
    </main>
);

const InspectionPage = () => (
    <main className="max-w-5xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-900 mb-4">Алгоритм инспекции РОЙ</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Мы исключили человеческий фактор. Каждая единица техники проверяется по строгим стандартам с применением нейросетевого анализа.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><MapPin size={28}/></div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">1. Выездной скаут</h3>
                <p className="text-slate-600 leading-relaxed">Наш механик приезжает на базу продавца со специализированным чек-листом из 120 пунктов. Проводится диагностика узлов, замер ЛКП и фото/видеофиксация всех дефектов.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6"><MonitorSmartphone size={28}/></div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">2. ИИ-анализ кабинета</h3>
                <p className="text-slate-600 leading-relaxed">Собранные медиафайлы загружаются во внутренний кабинет РОЙ. Наша нейросеть анализирует снимки на предмет скрытых следов кузовного ремонта и износа деталей.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6"><FileSignature size={28}/></div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">3. Акт и Карточка</h3>
                <p className="text-slate-600 leading-relaxed">Формируется итоговая оценка (от 1 до 10). Система автоматически генерирует PDF-акт инспекции, который прикрепляется к лоту для абсолютной прозрачности.</p>
            </div>
        </div>
    </main>
);

const AboutPage = () => (
    <main className="max-w-5xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-900 mb-4">Об экосистеме РОЙ</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Мы строим самую прозрачную логистическую и торговую инфраструктуру в России.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Не просто доска объявлений</h3>
                <p className="text-slate-600 leading-relaxed mb-4">РОЙ ТОРГ — это технологичное крыло масштабной транспортной экосистемы (АО РОЙ). Мы объединяем реальный логистический бизнес, инвестиционные платформы (движ-инвест.рф) и передовые IT-решения (РОЙ ERP).</p>
                <p className="text-slate-600 leading-relaxed">Вся техника, представленная на аукционах, проходит строгую выездную инспекцию нашими региональными скаутами или базируется на собственных охраняемых стоянках в Санкт-Петербурге.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-6 rounded-2xl"><ShieldCheck size={32} className="text-blue-600 mb-3"/><h4 className="font-bold text-slate-800">Юр. чистота</h4><p className="text-xs text-slate-500 mt-1">Отчеты Автотеки ко всем лотам</p></div>
                <div className="bg-green-50 p-6 rounded-2xl"><MapPin size={32} className="text-green-600 mb-3"/><h4 className="font-bold text-slate-800">Базы в СПб</h4><p className="text-xs text-slate-500 mt-1">Осмотр техники вживую</p></div>
                <div className="bg-orange-50 p-6 rounded-2xl"><Wallet size={32} className="text-orange-600 mb-3"/><h4 className="font-bold text-slate-800">Безопасный депозит</h4><p className="text-xs text-slate-500 mt-1">Холдирование средств</p></div>
                <div className="bg-slate-100 p-6 rounded-2xl"><MonitorSmartphone size={32} className="text-slate-600 mb-3"/><h4 className="font-bold text-slate-800">ИИ-чат</h4><p className="text-xs text-slate-500 mt-1">Анонимная связь с продавцом</p></div>
            </div>
        </div>
    </main>
);

const SellPage = ({ addToast }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        addToast('Заявка отправлена', 'Наш менеджер свяжется с вами для согласования выездного осмотра.', 'success');
        e.target.reset();
    };
    return (
    <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
            <div className="md:w-2/5 bg-slate-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-4">Реализуйте технику быстро</h2>
                    <p className="text-slate-300 text-sm mb-8">Наши скауты проведут инспекцию (СПб и регионы), мы составим карточку и выставим лот на аукцион. Защита сделки гарантирована.</p>
                    <ul className="space-y-4 text-sm font-medium">
                        <li className="flex items-center gap-3"><CheckCircle2 className="text-[#F97316]"/> Скрытый резерв цены</li>
                        <li className="flex items-center gap-3"><CheckCircle2 className="text-[#F97316]"/> Анонимные переговоры</li>
                        <li className="flex items-center gap-3"><CheckCircle2 className="text-[#F97316]"/> Выкуп за 3-5 дней</li>
                    </ul>
                </div>
                <div className="absolute -bottom-24 -right-24 text-slate-800 opacity-50"><Truck size={250}/></div>
            </div>
            <div className="md:w-3/5 p-8 md:p-12">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Заявка на оценку</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Тип техники</label>
                            <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm"><option>Тягач</option><option>Полуприцеп</option><option>Спецтехника</option><option>LCV</option></select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Год выпуска</label>
                            <input required type="number" placeholder="2020" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Марка и модель</label>
                        <input required type="text" placeholder="KAMAZ 5490 NEO" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Где находится техника?</label>
                        <input required type="text" placeholder="Санкт-Петербург" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Контактный телефон</label>
                        <input required type="tel" placeholder="+7 (___) ___-__-__" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm font-medium" />
                    </div>
                    <button type="submit" className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg transition mt-4">Отправить заявку</button>
                </form>
            </div>
        </div>
    </main>
    );
};

const FinancePage = ({ addToast }) => {
    const [price, setPrice] = useState(5000000);
    const [downpaymentPercent, setDownpaymentPercent] = useState(20);
    const [months, setMonths] = useState(24);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const downpaymentSum = price * (downpaymentPercent / 100);
    const creditSum = price - downpaymentSum;
    const monthlyRate = 0.30 / 12; // 30% / 12 мес
    
    let monthlyPayment = 0;
    if (creditSum > 0) {
        monthlyPayment = creditSum * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    }
    
    const totalPayout = monthlyPayment * months;
    const overpayment = totalPayout - creditSum;

    const handleApply = async () => {
        setIsSubmitting(true);
        setTimeout(() => {
            addToast('Заявка принята', 'Финансовый менеджер ДВИЖ-ИНВЕСТ.РФ скоро с вами свяжется.', 'success');
            setIsSubmitting(false);
        }, 1000);
    };

    return (
        <main className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center bg-blue-100 text-blue-800 font-bold px-4 py-1.5 rounded-full text-sm mb-4 border border-blue-200">От инвестиционной платформы DVIZH-proekt</div>
                <h1 className="text-4xl font-black text-slate-900 mb-4">Калькулятор софинансирования</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">Выиграли торги, но не хватает оборотных средств? Мы профинансируем сделку. Простая и прозрачная математика: фиксированная ставка 30% годовых, аванс от 20%.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
                <div className="lg:w-3/5 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="space-y-10">
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <label className="font-bold text-slate-800">Стоимость техники (Цена лота)</label>
                                <div className="text-2xl font-black text-blue-900">{price.toLocaleString('ru-RU')} ₽</div>
                            </div>
                            <input type="range" min="500000" max="15000000" step="50000" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span>500 тыс.</span><span>15 млн.</span></div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <label className="font-bold text-slate-800">Первоначальный взнос ({downpaymentPercent}%)</label>
                                <div className="text-2xl font-black text-blue-900">{downpaymentSum.toLocaleString('ru-RU')} ₽</div>
                            </div>
                            <input type="range" min="20" max="80" step="5" value={downpaymentPercent} onChange={(e) => setDownpaymentPercent(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span className="text-amber-600 font-bold">Мин. 20%</span><span>80%</span></div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <label className="font-bold text-slate-800">Срок софинансирования</label>
                                <div className="text-2xl font-black text-blue-900">{months} мес.</div>
                            </div>
                            <input type="range" min="6" max="60" step="6" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium"><span>6 мес.</span><span>60 мес.</span></div>
                        </div>
                    </div>
                </div>

                <div className="lg:w-2/5 bg-slate-50 p-8 lg:p-12 flex flex-col justify-center">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                        <div className="text-sm text-slate-500 mb-1 font-medium">Ежемесячный платеж</div>
                        <div className="text-4xl font-black text-[#F97316] mb-4">{Math.round(monthlyPayment).toLocaleString('ru-RU')} ₽</div>
                        
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Сумма финансирования:</span>
                                <span className="font-bold text-slate-800">{creditSum.toLocaleString('ru-RU')} ₽</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Процентная ставка:</span>
                                <span className="font-bold text-slate-800">30% годовых</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Переплата за весь срок:</span>
                                <span className="font-bold text-slate-800">{Math.round(overpayment).toLocaleString('ru-RU')} ₽</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleApply} disabled={isSubmitting} className="w-full bg-blue-600 disabled:bg-blue-400 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition flex justify-center items-center gap-2">
                        <Calculator size={20}/> {isSubmitting ? 'Отправка...' : 'Оставить заявку'}
                    </button>
                    <p className="text-xs text-slate-400 text-center mt-4">Расчет является предварительным. Финансирование предоставляется партнером платформы — DVIZH-proekt.</p>
                </div>
            </div>
        </main>
    );
};

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
      
      if (filterCategory === 'Тягачи' && !l.title.toLowerCase().includes('тягач')) return false;
      if (filterCategory === 'Полуприцепы' && !l.title.toLowerCase().includes('прицеп')) return false;
      if (filterCategory === 'Спецтехника' && !l.title.toLowerCase().match(/(трактор|экскаватор|кран|погрузчик)/)) return false;

      if (filterNds && !l.hasNds) return false;

      return true;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full flex flex-col md:flex-row gap-8">
      
      <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
        <h2 className="text-2xl font-black text-slate-800 mb-6">Каталог</h2>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Поиск по названию..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
          />
          <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Тип техники</h3>
          <div className="space-y-3">
            {['Все', 'Тягачи', 'Полуприцепы', 'Спецтехника'].map(type => (
              <label key={type} className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="radio" 
                  name="category" 
                  checked={filterCategory === type}
                  onChange={() => setFilterCategory(type)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-600 border-slate-300 cursor-pointer" 
                />
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

  const isArchived = lot.status === 'completed' || new Date(lot.endTime).getTime() <= Date.now();
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
    if (!currentUser) {
      openAuth();
      return;
    }
    // Защита от заблокированных
    if (currentUser.isBlocked) {
        addToast("Доступ запрещен", "Ваш аккаунт заблокирован администратором.", "error");
        return;
    }
    if (!currentUser.isVerified && currentUser.depositBalance < 5000) {
      addToast("Доступ запрещен", "Для участия в торгах необходимо пополнить депозит на 5 000 ₽ в Личном кабинете.", "error");
      navigate('profile');
      return;
    }

    socket.emit('placeBid', {
        lotId: lot.id,
        bidAmount: bidAmount,
        userId: currentUser.id
    });
  };

  const toggleAutoBroker = () => {
      if (!currentUser) {
          openAuth();
          return;
      }
      // Защита от заблокированных
      if (currentUser.isBlocked) {
          addToast("Доступ запрещен", "Ваш аккаунт заблокирован.", "error");
          return;
      }
      if (!autoBrokerLimit || autoBrokerLimit <= lot.currentPrice) {
          addToast('Ошибка', 'Лимит должен быть больше текущей цены!', 'error');
          return;
      }
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
      if (!fileUrl) {
          addToast('Ошибка', 'Файл еще не загружен продавцом', 'error');
          return;
      }
      window.open(`${fileUrl}`, '_blank');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
      <button onClick={() => navigate('catalog')} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-6 text-sm font-medium">
        <ChevronRight className="rotate-180" size={16}/> Назад к торгам
      </button>

      {isArchived && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
              <Archive size={24} className="shrink-0"/> 
              <div>
                  <b className="block md:inline">Торги по данному лоту завершены.</b> 
                  {winner ? ` Победитель: ${winner.userPhone} (Сумма: ${winner.amount.toLocaleString('ru-RU')} ₽)` : ' Ставок не было.'}
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
        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-200 rounded-2xl overflow-hidden relative border border-slate-200 shadow-sm">
            <div className="h-[400px] relative">
                <img src={displayImages[currentImageIndex]} alt={lot.title} className={`w-full h-full object-cover transition-opacity duration-300 ${isArchived ? 'grayscale opacity-90' : ''}`} />
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
                            className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-blue-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        >
                            <img src={imgUrl} className={`w-full h-full object-cover ${isArchived ? 'grayscale' : ''}`} alt="thumbnail" />
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

            {/* БЛОК ОПЛАТЫ КОМИССИИ ДЛЯ ПОБЕДИТЕЛЯ */}
            {isArchived && currentUser && winner && winner.userPhone === currentUser.phone && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4 text-center">
                    <CheckSquare className="mx-auto text-blue-600 mb-2" size={32} />
                    <h3 className="font-bold text-blue-900 mb-1">Поздравляем с победой!</h3>
                    <p className="text-xs text-blue-700 mb-4">Для получения контактов продавца и заключения ДКП необходимо оплатить лицензионное вознаграждение платформы (3%): <br/><b className="text-lg">{Math.round(lot.currentPrice * 0.03).toLocaleString('ru-RU')} ₽</b></p>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition text-sm">
                        Оплатить комиссию 3%
                    </button>
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
                        <span>В случае победы взимается <b>невозвратная комиссия 3%</b> от итоговой суммы для перехода к оформлению сделки.</span>
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

// ПОЛНЫЙ ЛИЧНЫЙ КАБИНЕТ (С загрузкой документов и счетами для ЮЛ)
const ProfilePage = ({ currentUser, setCurrentUser, navigate, addToast, lots }) => {
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [showRefundInfo, setShowRefundInfo] = useState(false);
  const [depositMethod, setDepositMethod] = useState('card');

  const isAppAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.isAdmin === true);

  if (!currentUser) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
              <UserCircle size={64} className="text-slate-300 mb-4" />
              <h2 className="text-2xl font-black text-slate-800 mb-2">Доступ ограничен</h2>
              <p className="text-slate-500 mb-6">Пожалуйста, авторизуйтесь для просмотра личного кабинета.</p>
              <button onClick={() => navigate('home')} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl">Вернуться на главную</button>
          </div>
      );
  }

  // Экран блокировки
  if (currentUser.isBlocked) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-red-50">
              <ShieldBan size={64} className="text-red-500 mb-4" />
              <h2 className="text-2xl font-black text-red-800 mb-2">Аккаунт заблокирован</h2>
              <p className="text-red-600 mb-6 max-w-md text-center">Ваш доступ к торгам ограничен администратором платформы РОЙ ТОРГ. Пожалуйста, обратитесь в поддержку.</p>
              <a href="https://t.me/ROYMTK" target="_blank" rel="noreferrer" className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl">Написать в поддержку</a>
          </div>
      );
  }

  const userLots = lots.filter(lot => lot.Bids && lot.Bids.some(b => b.UserId === currentUser.id));

  const handleTopUp = async () => {
    setIsProcessingTopUp(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const response = await fetch('/api/topup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, amount: 5000 })
        });
        const data = await response.json();
        if (data.success) {
            setCurrentUser(data.user);
            addToast("Оплата прошла успешно", "Депозит зачислен. Теперь вы можете участвовать в торгах.", "success");
        }
    } catch (error) {
        addToast("Ошибка", "Проблема при проведении платежа.", "error");
    } finally {
        setIsProcessingTopUp(false);
    }
  };

  const handleUserDocUpload = async (e, type) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append(type, file);

      try {
          addToast('Отправка', 'Загружаем документ...', 'info');
          const response = await fetch(`/api/user/${currentUser.id}/documents`, {
              method: 'POST', body: formData
          });
          const data = await response.json();
          if (data.success) {
              setCurrentUser(data.user);
              addToast('Успех', 'Документ успешно загружен. Ожидайте модерации.', 'success');
          } else {
              addToast('Ошибка', 'Не удалось загрузить документ', 'error');
          }
      } catch (error) {
          addToast('Сбой', 'Ошибка соединения с сервером', 'error');
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('roy_currentUser');
      navigate('home');
      addToast('Выход', 'Вы успешно вышли из системы', 'success');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
      <main className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full flex flex-col md:flex-row gap-8 items-start">
          
          <div className="w-full md:w-64 flex-shrink-0 lg:sticky lg:top-24 space-y-2">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-6 flex flex-col items-center text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-3 border-2 border-slate-200 shadow-inner">
                      <User size={32} />
                  </div>
                  <h3 className="font-bold text-slate-800">{currentUser.phone}</h3>
                  <div className={`mt-2 text-xs font-bold px-2 py-1 rounded ${currentUser.isVerified ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                      {currentUser.isVerified ? '✓ Аккаунт подтвержден' : 'Требуется проверка'}
                  </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex flex-col gap-1 hidden md:flex">
                  <button onClick={() => scrollToSection('sec-balance')} className="w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition text-slate-600 hover:bg-slate-100 hover:text-blue-600">
                      <Wallet size={18} /> Баланс и депозит
                  </button>
                  <button onClick={() => scrollToSection('sec-bids')} className="w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition text-slate-600 hover:bg-slate-100 hover:text-blue-600">
                      <ListOrdered size={18} /> Мои торги
                  </button>
                  <button onClick={() => scrollToSection('sec-documents')} className="w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition text-slate-600 hover:bg-slate-100 hover:text-blue-600">
                      <FileUp size={18} /> Документы
                  </button>
                  <button onClick={() => scrollToSection('sec-settings')} className="w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition text-slate-600 hover:bg-slate-100 hover:text-blue-600">
                      <Bot size={18} /> Автоторг (Робот)
                  </button>
                  
                  {/* КНОПКА АДМИНКИ ТЕПЕРЬ ТУТ! */}
                  {isAppAdmin && (
                      <>
                          <hr className="my-2 border-slate-100" />
                          <button onClick={() => navigate('admin')} className="w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition bg-blue-600 text-white hover:bg-blue-700 shadow-md">
                              <LayoutDashboard size={18} /> Админ-панель
                          </button>
                      </>
                  )}

                  <hr className="my-2 border-slate-100" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition text-red-600 hover:bg-red-50">
                      <LogOut size={18} /> Выйти
                  </button>
              </div>
          </div>

          <div className="flex-1 space-y-8 w-full">
              
              <div id="sec-balance" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-24">
                  <h2 className="text-2xl font-black text-slate-800 mb-6">Финансы</h2>
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg flex justify-between items-center mb-8 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-8 opacity-20">
                          <Wallet size={160} />
                      </div>
                      <div className="relative z-10">
                          <p className="text-slate-400 text-sm font-medium mb-1">Обеспечительный платеж (Депозит)</p>
                          <div className="text-4xl md:text-5xl font-black">{currentUser.depositBalance.toLocaleString('ru-RU')} ₽</div>
                      </div>
                  </div>
                  
                  {!currentUser.isVerified && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                      <h3 className="font-bold text-slate-800 text-lg mb-4">Пополнение баланса (Депозит 5000 ₽)</h3>
                      
                      <div className="flex border-b border-orange-200 mb-6">
                          <button onClick={() => setDepositMethod('card')} className={`px-4 py-2 font-bold text-sm border-b-2 ${depositMethod === 'card' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Для Физлиц (Картой)</button>
                          <button onClick={() => setDepositMethod('invoice')} className={`px-4 py-2 font-bold text-sm border-b-2 ${depositMethod === 'invoice' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Для Юрлиц (Счет)</button>
                      </div>

                      {depositMethod === 'card' ? (
                          <>
                              <p className="text-slate-600 text-sm mb-6 max-w-lg leading-relaxed">
                                  Для полноценного участия в торгах необходимо внести гарантийный депозит. Сумма холдируется (замораживается) на вашей карте и автоматически возвращается при проигрыше.
                              </p>
                              <button onClick={handleTopUp} disabled={isProcessingTopUp} className="bg-[#F97316] disabled:bg-orange-400 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2">
                                  {isProcessingTopUp ? 'Связь с банком (ЮKassa)...' : <><CreditCard size={18}/> Заморозить 5 000 ₽</>}
                              </button>
                              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><ShieldCheck size={14}/> Платеж защищен шифрованием эквайринга</p>
                          </>
                      ) : (
                          <>
                              <p className="text-slate-600 text-sm mb-6 max-w-lg leading-relaxed">
                                  Сгенерируйте счет на оплату для вашей бухгалтерии. После поступления средств на наш расчетный счет, депозит будет зачислен в Личный кабинет.
                              </p>
                              <button onClick={() => addToast('Счет сгенерирован', 'Началось скачивание PDF-файла.', 'success')} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2">
                                  <FileText size={18}/> Скачать счет (PDF)
                              </button>
                              <p className="text-xs text-slate-400 mt-3">Срок зачисления зависит от банка (обычно 1-2 рабочих дня).</p>
                          </>
                      )}
                    </div>
                  )}
                  
                  {currentUser.isVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <CheckCircle2 className="text-green-600 mt-1" size={24} />
                            <div>
                                <h3 className="font-bold text-green-800 text-lg mb-1">Аккаунт полностью верифицирован</h3>
                                <p className="text-green-700 text-sm leading-relaxed max-w-md">
                                    Вы можете делать ставки на любые лоты в пределах вашего депозита.
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowRefundInfo(!showRefundInfo)} className="border border-green-600 text-green-700 hover:bg-green-100 font-bold py-2 px-6 rounded-lg transition text-sm whitespace-nowrap">
                            Оформить возврат средств
                        </button>
                    </div>
                  )}

                  {showRefundInfo && (
                      <div className="mt-4 p-5 bg-white border-2 border-slate-200 border-dashed rounded-xl animate-in fade-in slide-in-from-top-2">
                          <h4 className="font-bold text-slate-800 mb-2">Процедура возврата депозита</h4>
                          <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                              Для возврата средств напишите ваш номер телефона и заявление на бланке организации (или в свободной форме для физлиц) с указанием полных реквизитов счета.
                          </p>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm text-slate-800 font-mono text-center">
                              Отправьте скан на почту: <b>pls@roy-torg.ru</b>
                          </div>
                      </div>
                  )}
              </div>

              <div id="sec-bids" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-24">
                  <h2 className="text-2xl font-black text-slate-800 mb-6">История участия в торгах</h2>
                  
                  {userLots.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                          <Gavel size={48} className="mx-auto text-slate-300 mb-4" />
                          <h3 className="font-bold text-slate-700 mb-1">Вы еще не делали ставок</h3>
                          <p className="text-slate-500 text-sm mb-4">Перейдите в каталог, чтобы найти подходящую технику.</p>
                          <button onClick={() => navigate('catalog')} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg text-sm">Перейти в каталог</button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {userLots.map(lot => {
                              const isArchived = lot.status === 'completed' || new Date(lot.endTime).getTime() <= Date.now();
                              const sortedBids = lot.Bids ? [...lot.Bids].sort((a,b) => b.amount - a.amount) : [];
                              const highestBid = sortedBids[0];
                              const isLeader = highestBid && highestBid.UserId === currentUser.id;
                              
                              let statusBadge = null;
                              if (isArchived && isLeader) {
                                  statusBadge = <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><Trophy size={12}/> Победитель</span>;
                              } else if (isArchived && !isLeader) {
                                  statusBadge = <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">Торги завершены</span>;
                              } else if (!isArchived && isLeader) {
                                  statusBadge = <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Вы лидируете</span>;
                              } else if (!isArchived && !isLeader) {
                                  statusBadge = <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><AlertTriangle size={12}/> Ставка перебита</span>;
                              }

                              return (
                                  <div key={lot.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4 hover:shadow-md transition">
                                      <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-1">
                                              <div className="text-xs text-slate-500 font-mono">Лот #{lot.lotNumber || lot.id}</div>
                                              {statusBadge}
                                          </div>
                                          <h4 className="font-bold text-slate-800">{lot.title}</h4>
                                          <div className="text-xs text-slate-500 mt-1">Текущая цена: <span className="font-bold text-slate-900">{lot.currentPrice.toLocaleString('ru-RU')} ₽</span></div>
                                      </div>
                                      <div className="flex gap-2 items-center">
                                          <button onClick={() => navigate('lot', lot.id)} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition">
                                              К лоту
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>

              <div id="sec-documents" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-24">
                  <h2 className="text-2xl font-black text-slate-800 mb-6">Мои документы</h2>
                  <p className="text-slate-600 text-sm mb-6">Загрузите документы для ручной модерации администратором. Это позволит получить полный доступ к торгам без внесения депозита.</p>
                  
                  <div className="space-y-4">
                      {/* Карточка ЮЛ */}
                      <div className="border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50 gap-4">
                          <div className="flex items-center gap-4">
                              <div className="bg-white p-3 rounded-lg shadow-sm text-blue-600"><FileText size={20}/></div>
                              <div>
                                  <h4 className="font-bold text-slate-700">Реквизиты компании (Карточка ЮЛ)</h4>
                                  <p className="text-xs text-slate-500">Для юридических лиц (PDF)</p>
                              </div>
                          </div>
                          <div className="w-full md:w-auto">
                              {currentUser.companyPdf ? (
                                  <span className="text-green-600 font-bold text-sm flex items-center gap-1 bg-green-100 px-3 py-1.5 rounded-lg"><CheckCircle2 size={16}/> Загружено</span>
                              ) : (
                                  <label className="cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-bold text-sm block text-center transition">
                                      Выбрать файл
                                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUserDocUpload(e, 'companyPdf')} />
                                  </label>
                              )}
                          </div>
                      </div>
                      
                      {/* Паспорт ФЛ */}
                      <div className="border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50 gap-4">
                          <div className="flex items-center gap-4">
                              <div className="bg-white p-3 rounded-lg shadow-sm text-blue-600"><User size={20}/></div>
                              <div>
                                  <h4 className="font-bold text-slate-700">Паспорт (Разворот + Прописка)</h4>
                                  <p className="text-xs text-slate-500">Для физических лиц (PDF)</p>
                              </div>
                          </div>
                          <div className="w-full md:w-auto">
                              {currentUser.passportPdf ? (
                                  <span className="text-green-600 font-bold text-sm flex items-center gap-1 bg-green-100 px-3 py-1.5 rounded-lg"><CheckCircle2 size={16}/> Загружено</span>
                              ) : (
                                  <label className="cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-bold text-sm block text-center transition">
                                      Выбрать файл
                                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUserDocUpload(e, 'passportPdf')} />
                                  </label>
                              )}
                          </div>
                      </div>
                  </div>
              </div>

              <div id="sec-settings" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-black text-slate-800">Настройки Автоторга</h2>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Бета</span>
                  </div>
                  <p className="text-slate-600 text-sm mb-8 max-w-lg">
                      Автоброкер автоматически делает ставки за вас, перебивая конкурентов на минимальный шаг, пока не будет достигнут установленный вами лимит цены.
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                      <h3 className="font-bold text-slate-700 mb-4">Активные автоброкеры</h3>
                      <div className="text-center py-6 text-slate-500 text-sm">
                          Нет активных задач для робота. Настроить автоброкер можно прямо в карточке интересующего вас лота.
                      </div>
                  </div>
              </div>

          </div>
      </main>
  );
};

// ПОЛНАЯ АДМИН-ПАНЕЛЬ (С RBAC, PDF-отчетами, Excel и Транзакциями)
const AdminPage = ({ navigate, lots, addToast, currentUser }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState({ totalUsers: 0, activeLots: 0, completedLots: 0, frequentBidders: 0 });
    const [adminUsers, setAdminUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [adminLogs, setAdminLogs] = useState([]);
    
    // Стейты для редактирования
    const [editLotId, setEditLotId] = useState(null);

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [inspectionFile, setInspectionFile] = useState(null);
    const [avtotekaFile, setAvtotekaFile] = useState(null);
    
    const generateLotNumber = () => 'L-' + Math.floor(10000 + Math.random() * 90000);

    const initialFormState = {
        auctionId: 'A-2026-05', 
        lotNumber: generateLotNumber(),
        title: '', description: '', year: '', mileage: '', currentPrice: '',
        minStep: '50000', reservePrice: '', estimatedValue: '', hasNds: true, startTime: '', 
        duration: 3, durationType: 'days', mechanicRating: '8', videoUrl: '',
        sellerInn: '', isSecurityChecked: false
    };

    const [formData, setFormData] = useState(initialFormState);

    const now = Date.now();
    const scheduledLots = lots.filter(l => l.startTime && new Date(l.startTime).getTime() > now);
    const archivedLots = lots.filter(l => l.status === 'completed' || new Date(l.endTime).getTime() <= now);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetch('/api/admin/stats')
                .then(res => res.json())
                .then(data => setStats(data))
                .catch(console.error);
        } else if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'transactions') {
            fetchTransactions();
        } else if (activeTab === 'logs' && currentUser?.role === 'superadmin') {
            fetchLogs();
        }
    }, [activeTab, currentUser]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) setAdminUsers(data.users);
        } catch (error) { console.error(error); }
    };

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/admin/transactions');
            const data = await res.json();
            if (data.success) setTransactions(data.transactions);
        } catch (error) { console.error(error); }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`/api/admin/logs?adminId=${currentUser.id}`);
            const data = await res.json();
            if (data.success) setAdminLogs(data.logs);
        } catch (error) { console.error(error); }
    };

    const handleUserAction = async (userId, action) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/action`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, adminId: currentUser.id })
            });
            const data = await res.json();
            if (data.success) {
                setAdminUsers(data.users);
                addToast('Успех', 'Статус пользователя обновлен', 'success');
            } else {
                addToast('Ошибка', data.error, 'error');
            }
        } catch (error) { addToast('Ошибка', 'Не удалось изменить статус', 'error'); }
    };

    const handleAssignRole = async (userId, newRole) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole, adminId: currentUser.id })
            });
            const data = await res.json();
            if (data.success) {
                setAdminUsers(data.users);
                addToast('Успех', `Пользователю назначена роль: ${newRole}`, 'success');
            } else {
                addToast('Ошибка', data.error, 'error');
            }
        } catch (error) { addToast('Ошибка', 'Не удалось изменить роль', 'error'); }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files).slice(0, 30));
        }
    };

    const handleEditLotClick = (lot) => {
        setEditLotId(lot.id);
        setFormData({
            auctionId: lot.auctionId, lotNumber: lot.lotNumber, title: lot.title, 
            description: lot.description, year: lot.year || '', mileage: lot.mileage || '', 
            currentPrice: lot.currentPrice, minStep: lot.minStep, reservePrice: lot.reservePrice || '', 
            estimatedValue: lot.estimatedValue || '', hasNds: lot.hasNds, 
            startTime: lot.startTime ? new Date(lot.startTime).toISOString().slice(0, 16) : '', 
            duration: 3, durationType: 'days', mechanicRating: lot.mechanicRating || '8', 
            videoUrl: lot.videoUrl || '', sellerInn: lot.sellerInn || '', isSecurityChecked: lot.isSecurityChecked
        });
        setActiveTab('create');
        window.scrollTo(0, 0);
    };

    const handleCopyLot = async (id) => {
        try {
            const res = await fetch(`/api/lots/${id}/copy`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: currentUser.id })
            });
            if (res.ok) addToast('Успех', 'Лот успешно скопирован и перенесен в запланированные', 'success');
        } catch (e) { addToast('Ошибка', 'Не удалось скопировать лот', 'error'); }
    }

    // ГЕНЕРАЦИЯ ОФИЦИАЛЬНОГО PDF ОТЧЕТА ТОРГОВ (Без тяжелых библиотек)
    const handleGenerateReport = async (lotId) => {
        try {
            addToast('Генерация', 'Собираем данные для PDF...', 'info');
            const res = await fetch(`/api/admin/lot-report/${lotId}`);
            const data = await res.json();
            
            if (data.success) {
                const r = data.report;
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Отчет по торгам: Лот ${r.lotNumber}</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
                            h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 30px;}
                            .info-block { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0;}
                            .info-row { margin-bottom: 12px; font-size: 15px; }
                            .info-row strong { display: inline-block; width: 250px; color: #475569; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; font-size: 14px; }
                            th { background-color: #f1f5f9; color: #1e293b; }
                            .status { font-weight: bold; color: #059669; }
                            .highlight { font-size: 20px; font-weight: 900; color: #0f172a; }
                        </style>
                    </head>
                    <body>
                        <h1>Официальный протокол торгов РОЙ ТОРГ</h1>
                        <div class="info-block">
                            <div class="info-row"><strong>Номер аукциона:</strong> ${r.auctionId}</div>
                            <div class="info-row"><strong>Номер лота:</strong> ${r.lotNumber}</div>
                            <div class="info-row"><strong>Наименование техники:</strong> ${r.title}</div>
                            <div class="info-row"><strong>Год выпуска:</strong> ${r.year || 'Не указан'}</div>
                            <div class="info-row"><strong>Пробег/МЧ:</strong> ${r.mileage || 'Не указан'}</div>
                            <div class="info-row"><strong>ИНН Продавца:</strong> ${r.sellerInn}</div>
                            <div class="info-row"><strong>Рыночная оценка:</strong> ${r.estimatedValue} ₽</div>
                            <div class="info-row"><strong>Скрытый резерв:</strong> ${r.minReserve} ₽</div>
                            <div class="info-row" style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
                                <strong>Финальная цена продажи:</strong> <span class="highlight">${r.finalPrice} ₽</span>
                            </div>
                            <div class="info-row"><strong>Дата завершения:</strong> ${r.endDate}</div>
                            <div class="info-row"><strong>Статус:</strong> <span class="status">Торги завершены</span></div>
                        </div>
                        
                        <h2>Журнал ставок (История торгов)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Время ставки</th>
                                    <th>Участник (Телефон)</th>
                                    <th>Сумма (₽)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${r.bidsHistory.length === 0 ? '<tr><td colspan="3" style="text-align: center;">Ставок не было</td></tr>' : ''}
                                ${r.bidsHistory.map((b, i) => `
                                    <tr style="${i === 0 ? 'background-color: #f0fdf4; font-weight: bold;' : ''}">
                                        <td>${b.time}</td>
                                        <td>${b.phone} ${i === 0 ? '<span style="color:#059669; font-size:11px; margin-left:8px;">ПОБЕДИТЕЛЬ</span>' : ''}</td>
                                        <td>${b.amount}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            Документ сгенерирован автоматически Платформой РОЙ ТОРГ.<br/>
                            Дата выгрузки: ${new Date().toLocaleString('ru-RU')}
                        </div>
                        
                        <script>
                            // Небольшая задержка для рендеринга стилей, затем вызов системного окна печати
                            setTimeout(() => { window.print(); }, 800);
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } else {
                addToast('Ошибка', 'Не удалось сформировать отчет', 'error');
            }
        } catch(e) {
            addToast('Ошибка', 'Сбой сервера при выгрузке', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let uploadedUrls = [];
            let uploadedInspection = '';
            let uploadedAvtoteka = '';
            
            if (selectedFiles.length > 0 || inspectionFile || avtotekaFile) {
                const formDataObj = new FormData();
                selectedFiles.forEach(file => formDataObj.append('photos', file));
                if (inspectionFile) formDataObj.append('inspectionPdf', inspectionFile);
                if (avtotekaFile) formDataObj.append('avtotekaPdf', avtotekaFile);

                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formDataObj });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    uploadedUrls = uploadData.urls;
                    uploadedInspection = uploadData.inspectionPdf;
                    uploadedAvtoteka = uploadData.avtotekaPdf;
                } else {
                    addToast('Ошибка', 'Ошибка при загрузке файлов', 'error');
                    setIsLoading(false);
                    return;
                }
            }

            const lotDataToSubmit = {
                ...formData, adminId: currentUser.id,
                images: uploadedUrls.length ? uploadedUrls : undefined,
                inspectionPdf: uploadedInspection || undefined,
                avtotekaPdf: uploadedAvtoteka || undefined
            };

            // Если редактируем — шлем PUT, если создаем — POST
            const url = editLotId ? `/api/lots/${editLotId}` : '/api/lots';
            const method = editLotId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lotDataToSubmit)
            });

            if (response.ok) {
                addToast('Успех', editLotId ? 'Лот успешно обновлен!' : 'Лот успешно создан!', 'success');
                setFormData(initialFormState);
                setEditLotId(null);
                setSelectedFiles([]);
                setInspectionFile(null);
                setAvtotekaFile(null);
                setActiveTab('scheduled');
            } else {
                addToast('Ошибка', 'Не удалось сохранить лот', 'error');
            }
        } catch (error) {
            addToast('Сбой сервера', 'Проверьте, запущен ли бэкенд.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getTopBidders = (bids) => {
        if (!bids) return [];
        const unique = [];
        const seen = new Set();
        const sorted = [...bids].sort((a,b) => b.amount - a.amount);
        for (let b of sorted) {
            if (!seen.has(b.UserId)) {
                seen.add(b.UserId);
                unique.push(b);
                if (unique.length === 3) break;
            }
        }
        return unique;
     };

    return (
        <main className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full">
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-slate-900 text-white p-3 rounded-xl"><LayoutDashboard size={24}/></div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Панель Управления</h2>
                    <p className="text-slate-500 font-medium">Режим: {currentUser.role === 'superadmin' ? <span className="text-purple-600 font-bold">Супер-Администратор</span> : <span className="text-blue-600 font-bold">Администратор</span>}</p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar">
                <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <LayoutDashboard size={18}/> Дашборд
                </button>
                <button onClick={() => setActiveTab('users')} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Users size={18}/> Пользователи
                </button>
                <button onClick={() => { setActiveTab('create'); setEditLotId(null); setFormData(initialFormState); }} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    {editLotId ? <><Edit3 size={18}/> Редактирование</> : <><PlusCircle size={18}/> Создать лот</>}
                </button>
                <button onClick={() => setActiveTab('scheduled')} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'scheduled' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <CalendarClock size={18}/> Запланированные <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{scheduledLots.length}</span>
                </button>
                <button onClick={() => setActiveTab('archive')} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'archive' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Archive size={18}/> Архив торгов <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{archivedLots.length}</span>
                </button>
                <button onClick={() => setActiveTab('transactions')} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Wallet size={18}/> Транзакции
                </button>
                
                {currentUser.role === 'superadmin' && (
                    <button onClick={() => setActiveTab('logs')} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:text-purple-800'}`}>
                        <Activity size={18}/> Логи действий
                    </button>
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                
                {/* ВКЛАДКА ПОЛЬЗОВАТЕЛИ (С ЭКСПОРТОМ И РОЛЯМИ) */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex justify-end mb-4">
                            {/* Выгрузка в Excel (через CSV) */}
                            <button onClick={() => window.open('/api/admin/export/users', '_blank')} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition shadow flex items-center gap-2">
                                <FileSpreadsheet size={16}/> Выгрузить базу (Excel)
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                                        <th className="py-4 px-4 font-bold rounded-tl-xl">Телефон / Роль</th>
                                        <th className="py-4 px-4 font-bold">Депозит</th>
                                        <th className="py-4 px-4 font-bold">Документы</th>
                                        <th className="py-4 px-4 font-bold">Статус</th>
                                        <th className="py-4 px-4 font-bold text-right rounded-tr-xl">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adminUsers.map((user) => (
                                        <tr key={user.id} className={`border-b border-slate-100 transition ${user.isBlocked ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-slate-800">{user.phone}</div>
                                                <div className="text-[10px] uppercase font-bold mt-1 tracking-wider">
                                                    {user.role === 'superadmin' ? <span className="text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">SuperAdmin</span> : 
                                                     user.role === 'admin' ? <span className="text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Admin</span> : 
                                                     <span className="text-slate-400">User</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-blue-600">{user.depositBalance.toLocaleString('ru-RU')} ₽</td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1 text-sm">
                                                    {user.companyPdf ? <a href={`${user.companyPdf}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><FileText size={14}/> Реквизиты ЮЛ</a> : <span className="text-slate-400 text-xs">ЮЛ: Нет</span>}
                                                    {user.passportPdf ? <a href={`${user.passportPdf}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><User size={14}/> Паспорт ФЛ</a> : <span className="text-slate-400 text-xs">ФЛ: Нет</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {user.isBlocked ? (
                                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Заблокирован</span>
                                                    ) : user.isVerified ? (
                                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Верифицирован</span>
                                                    ) : (
                                                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">Без доступа</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 flex justify-end gap-2 items-center">
                                                {/* Только СуперАдмин может назначать админов */}
                                                {currentUser.role === 'superadmin' && user.role !== 'superadmin' && (
                                                    user.role === 'admin' 
                                                    ? <button onClick={() => handleAssignRole(user.id, 'user')} className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-1.5 rounded hover:bg-slate-300">Снять админа</button>
                                                    : <button onClick={() => handleAssignRole(user.id, 'admin')} className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1.5 rounded hover:bg-blue-200">Сделать админом</button>
                                                )}

                                                <button 
                                                    onClick={() => handleUserAction(user.id, 'verify')} 
                                                    className={`p-2 rounded-lg transition ${user.isVerified ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                    title={user.isVerified ? "Снять верификацию" : "Верифицировать вручную"}
                                                >
                                                    <UserCheck size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleUserAction(user.id, 'block')} 
                                                    className={`p-2 rounded-lg transition ${user.isBlocked ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                                    title={user.isBlocked ? "Разблокировать" : "Заблокировать аккаунт"}
                                                >
                                                    <ShieldBan size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ВКЛАДКА ТРАНЗАКЦИИ */}
                {activeTab === 'transactions' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                                    <th className="py-4 px-4 font-bold rounded-tl-xl">Дата</th>
                                    <th className="py-4 px-4 font-bold">Пользователь (ИНН)</th>
                                    <th className="py-4 px-4 font-bold">Тип операции</th>
                                    <th className="py-4 px-4 font-bold text-right rounded-tr-xl">Сумма (₽)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Транзакций пока нет.</td></tr> : transactions.map(tx => (
                                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                        <td className="py-4 px-4 text-sm text-slate-500">{new Date(tx.createdAt).toLocaleString('ru-RU')}</td>
                                        <td className="py-4 px-4 font-bold text-slate-800">{tx.User?.phone} {tx.User?.inn && <span className="text-xs font-mono text-slate-400 block">{maskInn(tx.User.inn)}</span>}</td>
                                        <td className="py-4 px-4 text-sm text-slate-600">{tx.description}</td>
                                        <td className="py-4 px-4 font-black text-right text-blue-600">+{tx.amount.toLocaleString('ru-RU')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ВКЛАДКА ЛОГИ СУПЕРАДМИНА */}
                {activeTab === 'logs' && currentUser.role === 'superadmin' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500 bg-purple-50">
                                    <th className="py-4 px-4 font-bold rounded-tl-xl">Время</th>
                                    <th className="py-4 px-4 font-bold">Исполнитель</th>
                                    <th className="py-4 px-4 font-bold">Событие</th>
                                    <th className="py-4 px-4 font-bold rounded-tr-xl">Детали</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminLogs.length === 0 ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Логи пусты.</td></tr> : adminLogs.map(log => (
                                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ru-RU')}</td>
                                        <td className="py-3 px-4 text-sm font-bold text-slate-700">{log.Admin ? log.Admin.phone : 'СИСТЕМА'}</td>
                                        <td className="py-3 px-4 text-xs font-mono bg-slate-100 px-2 rounded inline-block mt-2">{log.action}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                            <Users size={32} className="text-blue-600 mb-3" />
                            <div className="text-3xl font-black text-slate-800">{stats.totalUsers}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase mt-1">Всего юзеров</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                            <Car size={32} className="text-blue-600 mb-3" />
                            <div className="text-3xl font-black text-slate-800">{stats.activeLots}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase mt-1">Активных лотов</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                            <Archive size={32} className="text-blue-600 mb-3" />
                            <div className="text-3xl font-black text-slate-800">{stats.completedLots}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase mt-1">Завершено</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                            <Trophy size={32} className="text-blue-600 mb-3" />
                            <div className="text-3xl font-black text-slate-800">{stats.frequentBidders}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase mt-1">Частых участников</div>
                        </div>
                    </div>
                )}

                {activeTab === 'create' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {editLotId && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
                                <div className="font-bold text-blue-800">Режим редактирования лота</div>
                                <button type="button" onClick={() => { setEditLotId(null); setFormData(initialFormState); }} className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">Отменить редактирование</button>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Номер аукциона</label>
                                <input required type="text" value={formData.auctionId} onChange={e => setFormData({...formData, auctionId: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Номер лота (Уникальный)</label>
                                <input required type="text" value={formData.lotNumber} onChange={e => setFormData({...formData, lotNumber: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-mono" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Название техники (Марка, модель)</label>
                            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" placeholder="Например: Седельный тягач SITRAK C7H MAX" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Год выпуска</label>
                                <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" placeholder="2022" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Пробег / Моточасы</label>
                                <input type="text" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" placeholder="125 000 км" />
                            </div>
                        </div>

                        {/* БЛОК ПРОВЕРКИ СБ */}
                        <div className="grid grid-cols-2 gap-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ИНН Продавца (для СБ)</label>
                                <input type="text" value={formData.sellerInn} onChange={e => setFormData({...formData, sellerInn: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-mono" placeholder="7810123456" />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <input type="checkbox" id="sb" checked={formData.isSecurityChecked} onChange={e => setFormData({...formData, isSecurityChecked: e.target.checked})} className="w-5 h-5 text-blue-600 rounded cursor-pointer" />
                                <label htmlFor="sb" className="font-bold text-slate-700 cursor-pointer flex items-center gap-2"><ShieldCheck size={18} className="text-green-600"/> Проверен СБ (Рисков нет)</label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Оценка механика (1-10)</label>
                                <div className="relative">
                                    <input required type="number" min="1" max="10" value={formData.mechanicRating} onChange={e => setFormData({...formData, mechanicRating: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 pl-10" />
                                    <Star size={18} className="absolute left-3 top-3.5 text-amber-500"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Ссылка на видео-обзор (VK Видео, Rutube)</label>
                                <div className="relative">
                                    <input type="text" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 pl-10" placeholder="https://vk.com/video..." />
                                    <PlayCircle size={18} className="absolute left-3 top-3.5 text-red-500"/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-blue-100 p-3 rounded-full text-blue-600"><UploadCloud size={24}/></div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Фотографии техники</h3>
                                    <p className="text-xs text-slate-500">До 30 фото. Первая картинка будет заглавной в карточке.</p>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                            {selectedFiles.length > 0 && (
                                <div className="mt-4 text-sm font-medium text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                                    <CheckCircle2 size={16} className="inline mr-1"/> Выбрано файлов: {selectedFiles.length}
                                </div>
                            )}
                        </div>

                        {/* ЗАГРУЗКА PDF ДЛЯ ЛОТА */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="bg-blue-100 p-3 rounded-full text-blue-600"><FileText size={24}/></div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Акт инспекции</h3>
                                        <p className="text-xs text-slate-500">Загрузите PDF отчет</p>
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    accept="application/pdf"
                                    onChange={(e) => setInspectionFile(e.target.files[0])}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {inspectionFile && (
                                    <div className="mt-4 text-sm font-medium text-green-600 bg-green-50 p-2 rounded-lg border border-green-200 break-all">
                                        <CheckCircle2 size={16} className="inline mr-1"/> Выбран файл: {inspectionFile.name}
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="bg-slate-200 p-3 rounded-full text-slate-700"><Search size={24}/></div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Отчет Автотеки</h3>
                                        <p className="text-xs text-slate-500">Загрузите PDF отчет</p>
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    accept="application/pdf"
                                    onChange={(e) => setAvtotekaFile(e.target.files[0])}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                                />
                                {avtotekaFile && (
                                    <div className="mt-4 text-sm font-medium text-green-600 bg-green-50 p-2 rounded-lg border border-green-200 break-all">
                                        <CheckCircle2 size={16} className="inline mr-1"/> Выбран файл: {avtotekaFile.name}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Описание лота</label>
                            <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" placeholder="Опишите состояние техники..."></textarea>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">Точное время старта<Info size={16} className="text-blue-500" title="Если оставить пустым, торги начнутся прямо сейчас."/></label>
                                <input type="datetime-local" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Длительность торгов</label>
                                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <input required type="number" min="1" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-1/2 px-4 py-3 focus:outline-none border-r border-slate-200" />
                                    <select value={formData.durationType} onChange={e => setFormData({...formData, durationType: e.target.value})} className="w-1/2 px-4 py-3 focus:outline-none cursor-pointer bg-slate-50">
                                        <option value="days">Дней</option>
                                        <option value="hours">Часов</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Начальная цена (₽)</label>
                                <input required type="number" value={formData.currentPrice} onChange={e => setFormData({...formData, currentPrice: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" placeholder="От..." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Шаг аукциона (₽)</label>
                                <input required type="number" value={formData.minStep} onChange={e => setFormData({...formData, minStep: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-green-700 mb-2">Рыночная оценка (₽)</label>
                                <input type="number" value={formData.estimatedValue} onChange={e => setFormData({...formData, estimatedValue: e.target.value})} className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-xl focus:outline-none focus:border-green-600" placeholder="Для привлечения" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-amber-700 mb-2">Скрытый резерв (₽)</label>
                                <input type="number" value={formData.reservePrice} onChange={e => setFormData({...formData, reservePrice: e.target.value})} className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500" placeholder="Мин. цена" />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 pt-2 pb-2">
                            <input type="checkbox" id="nds" checked={formData.hasNds} onChange={e => setFormData({...formData, hasNds: e.target.checked})} className="w-5 h-5 text-blue-600 rounded cursor-pointer" />
                            <label htmlFor="nds" className="font-bold text-slate-700 cursor-pointer">Цена включает НДС 20% (Продавец ЮЛ на ОСНО)</label>
                        </div>

                        <hr className="border-slate-100" />
                        <div className="pt-4 flex gap-4">
                            <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition flex-1 flex justify-center items-center gap-2">
                                {isLoading ? 'Идет сохранение...' : editLotId ? <><CheckCircle2 size={20}/> Сохранить изменения</> : <><PlusCircle size={20}/> Создать и запланировать</>}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'scheduled' && (
                    <div className="space-y-4">
                        {scheduledLots.length === 0 ? <div className="text-center py-12 text-slate-500">Нет запланированных торгов.</div> : scheduledLots.map(lot => (
                            <div key={lot.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4 hover:shadow-md transition">
                                <div className="flex-1">
                                    <div className="text-xs text-slate-400 mb-1">Аукцион #{lot.auctionId} • Лот #{lot.lotNumber || lot.id}</div>
                                    <h4 className="font-bold text-slate-800">{lot.title}</h4>
                                </div>
                                <div className="text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
                                    <CalendarClock size={16} className="text-blue-600"/> Старт: {new Date(lot.startTime).toLocaleString('ru-RU')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => navigate('lot', lot.id)} className="text-blue-600 font-bold text-sm hover:underline px-2">Просмотр</button>
                                    {/* КНОПКА РЕДАКТИРОВАНИЯ */}
                                    <button onClick={() => handleEditLotClick(lot)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg transition" title="Редактировать">
                                        <Edit3 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'archive' && (
                    <div className="space-y-4">
                        {archivedLots.length === 0 ? <div className="text-center py-12 text-slate-500">Архив пуст.</div> : archivedLots.map(lot => {
                            const topBidders = getTopBidders(lot.Bids);
                            return (
                            <div key={lot.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl gap-4 flex flex-col md:flex-row md:items-start justify-between">
                                <div className="flex-1">
                                    <div className="text-xs text-slate-400 mb-1">Лот #{lot.lotNumber || lot.id} • Ставок: {lot.bidsCount}</div>
                                    <h4 className="font-bold text-slate-800 mb-3">{lot.title}</h4>
                                    
                                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm max-w-sm">
                                        <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Trophy size={14} className="text-yellow-500"/> Топ-3 участника:</h5>
                                        {topBidders.length === 0 ? <div className="text-slate-400 text-xs">Нет ставок</div> : topBidders.map((b, i) => (
                                            <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                                <span className="text-slate-600">{i + 1}. {b.userPhone}</span>
                                                <span className="font-bold">{b.amount.toLocaleString('ru-RU')} ₽</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-3 mt-4 md:mt-0 w-full md:w-auto">
                                    <div className="text-sm font-black text-slate-800 bg-white px-4 py-2 rounded-lg border border-slate-200 w-full text-center md:text-right">
                                        Продано: {lot.currentPrice.toLocaleString('ru-RU')} ₽
                                    </div>
                                    {/* ВЫГРУЗКА PDF ОТЧЕТА */}
                                    <button onClick={() => handleGenerateReport(lot.id)} className="w-full text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold text-sm px-4 py-2 rounded-lg transition flex items-center justify-center gap-2">
                                        <FileText size={16}/> Скачать отчет (PDF)
                                    </button>
                                    <button onClick={() => handleCopyLot(lot.id)} className="w-full text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 font-bold text-sm px-4 py-2 rounded-lg transition flex items-center justify-center gap-2">
                                        <Repeat size={16}/> Повторить лот
                                    </button>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </main>
    );
};

// === ГЛАВНЫЙ КОМПОНЕНТ APP ===
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentLotId, setCurrentLotId] = useState(null);
  const [lots, setLots] = useState([]);
  
  // ИСПРАВЛЕНИЕ: Локальное сохранение сессии (авторизация больше не слетает при F5)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('roy_currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  
  const [toasts, setToasts] = useState([]);

  // Отслеживаем секретный URL для админки (скрытый путь)
  useEffect(() => {
    const handleHashChange = () => {
        if (window.location.hash === '#admin-panel') {
            setCurrentPage('admin');
        }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Синхронизация сессии с Local Storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('roy_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('roy_currentUser');
    }
  }, [currentUser]);
  
  const addToast = (title, message = '', type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
      socket.on('updateLots', (updatedLots) => setLots(updatedLots));
      
      socket.on('bidSuccess', (data) => addToast("Успех", data.message, "success"));
      socket.on('bidError', (data) => addToast("Внимание", data.message, "error"));

      return () => {
          socket.off('updateLots');
          socket.off('bidSuccess');
          socket.off('bidError');
      };
  }, []);

  useEffect(() => {
    socket.on('outbid', (data) => {
        if (currentUser && data.previousUserId === currentUser.id) {
            addToast("Вашу ставку перебили!", `Лот: ${data.title}. Новая цена: ${data.newPrice.toLocaleString('ru-RU')} ₽`, "error");
        }
    });

    socket.on('winnerNotification', (data) => {
        if (currentUser && data.winnerUserId === currentUser.id) {
            setWinnerData(data);
        }
    });

    return () => {
        socket.off('outbid');
        socket.off('winnerNotification');
    }
  }, [currentUser]);

  const navigate = (page, params = null) => {
    setCurrentPage(page);
    if (page === 'lot') setCurrentLotId(params);
    window.scrollTo(0, 0);
  };

  const handleLogin = (user) => {
      setCurrentUser(user);
      setIsAuthModalOpen(false);
  };

  // Проверка прав администратора для роутинга
  const isAppAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.isAdmin === true);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800 relative">
      
      {winnerData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300">
            <Trophy size={64} className="mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-black text-slate-800 mb-2">Вы победили!</h2>
            <p className="text-slate-600 mb-6">Поздравляем с выигрышем лота <br/><b className="text-slate-900">{winnerData.title}</b>.</p>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
              <p className="text-sm text-slate-500 mb-1">Ваш персональный менеджер:</p>
              <a href={`tel:${winnerData.managerPhone}`} className="text-xl font-bold text-blue-600 hover:underline">{winnerData.managerPhone}</a>
            </div>
            <button onClick={() => setWinnerData(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">
              Отлично
            </button>
          </div>
        </div>
      )}

      <Navbar 
        navigate={navigate} 
        currentPage={currentPage} 
        currentUser={currentUser}
        openAuth={() => setIsAuthModalOpen(true)}
      />
      
      {currentPage === 'home' && <HomePage navigate={navigate} lots={lots} />}
      {currentPage === 'catalog' && <CatalogPage navigate={navigate} lots={lots} />}
      {currentPage === 'finance' && <FinancePage addToast={addToast} />}
      {currentPage === 'about' && <AboutPage />}
      {currentPage === 'sell' && <SellPage addToast={addToast} />}
      {currentPage === 'privacy' && <PrivacyPage />}
      {currentPage === 'offer' && <OfferPage />}
      {currentPage === 'rules' && <RulesPage />}
      {currentPage === 'inspection' && <InspectionPage />}
      
      {/* Жесткая защита Админки на уровне Роутера */}
      {currentPage === 'admin' && (
          isAppAdmin 
          ? <AdminPage navigate={navigate} lots={lots} addToast={addToast} currentUser={currentUser} />
          : <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
              <ShieldBan size={64} className="text-red-500 mb-4" />
              <h2 className="text-2xl font-black text-slate-800">Доступ закрыт</h2>
              <p className="text-slate-500 mt-2">У вас нет прав администратора для просмотра этой страницы.</p>
              <button onClick={() => navigate('home')} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">На главную</button>
            </div>
      )}

      {currentPage === 'profile' && <ProfilePage navigate={navigate} currentUser={currentUser} setCurrentUser={setCurrentUser} addToast={addToast} lots={lots} />}
      {currentPage === 'lot' && (
        <LotDetailPage 
          navigate={navigate} 
          lotId={currentLotId} 
          lots={lots} 
          currentUser={currentUser}
          openAuth={() => setIsAuthModalOpen(true)}
          addToast={addToast}
        />
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} addToast={addToast} navigate={navigate} />
      <Footer navigate={navigate} />
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}