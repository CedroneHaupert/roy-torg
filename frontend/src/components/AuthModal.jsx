import React, { useState } from 'react';
import { X } from 'lucide-react';

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
                placeholder="----"
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

export default AuthModal;