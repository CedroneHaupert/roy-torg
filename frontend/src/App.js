import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Trophy, ShieldBan, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

// === КОМПОНЕНТЫ ===
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';

// === СТРАНИЦЫ ===
import AdminPage from './pages/AdminPage';
import CatalogPage from './pages/CatalogPage';
import FinancePage from './pages/FinancePage';
import HomePage from './pages/HomePage';
import LotDetailPage from './pages/LotDetailPage';
import ProfilePage from './pages/ProfilePage';
import SellPage from './pages/SellPage';

// Информационные страницы (предполагается, что они все экспортируются из одного файла)
import { 
  PrivacyPage, 
  OfferPage, 
  RulesPage, 
  InspectionPage, 
  AboutPage 
} from './pages/InfoPages';

// Подключаемся к бэкенду. Экспортируем для использования в LotDetailPage и др.
export const socket = io('');

// === МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ ===
const AuthModal = ({ isOpen, onClose, onLogin, addToast, navigate }) => {
  const [step, setStep] = useState(1); 
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isOpen) return null;

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

// === FOOTER ===
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

// === ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ ===
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentLotId, setCurrentLotId] = useState(null);
  const [lots, setLots] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('roy_currentUser');
      let parsedUser = saved ? JSON.parse(saved) : null;
      
      // Временное решение для разработки
      if (parsedUser) {
          parsedUser.role = 'superadmin';
          parsedUser.isAdmin = true;
      }
      return parsedUser;
    } catch (e) {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Обработка навигации по хэшу
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

  // Синхронизация пользователя с localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('roy_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('roy_currentUser');
    }
  }, [currentUser]);
  
  // Управление уведомлениями
  const addToast = (title, message = '', type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // Слушатели Socket.io
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

  // Маршрутизация
  const navigate = (page, params = null) => {
    setCurrentPage(page);
    if (page === 'lot') setCurrentLotId(params);
    window.scrollTo(0, 0);
  };

  // Обработка входа
  const handleLogin = (user) => {
      user.role = 'superadmin';
      user.isAdmin = true;
      setCurrentUser(user);
      setIsAuthModalOpen(false);
  };

  const isAppAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.isAdmin === true);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800 relative">
      
      {/* Модальное окно победителя */}
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

      {/* Навигация */}
      <Navbar 
        navigate={navigate} 
        currentPage={currentPage} 
        currentUser={currentUser}
        openAuth={() => setIsAuthModalOpen(true)}
      />
      
      {/* Рендеринг страниц в зависимости от состояния currentPage */}
      {currentPage === 'home' && <HomePage navigate={navigate} lots={lots} />}
      {currentPage === 'catalog' && <CatalogPage navigate={navigate} lots={lots} />}
      {currentPage === 'finance' && <FinancePage addToast={addToast} currentUser={currentUser} />}
      {currentPage === 'about' && <AboutPage />}
      {currentPage === 'sell' && <SellPage addToast={addToast} currentUser={currentUser} />}
      {currentPage === 'privacy' && <PrivacyPage />}
      {currentPage === 'offer' && <OfferPage />}
      {currentPage === 'rules' && <RulesPage />}
      {currentPage === 'inspection' && <InspectionPage />}
      
      {/* Защита Админ-панели на уровне роутера */}
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

      {/* Глобальные компоненты: Модалка входа, Подвал, Уведомления */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} addToast={addToast} navigate={navigate} />
      <Footer navigate={navigate} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
    </div>
  );
}