import React, { useState, useEffect } from 'react';
import { 
  UserCircle, ShieldBan, User, Wallet, ListOrdered, FileUp, Bot, 
  LayoutDashboard, LogOut, CreditCard, FileText, CheckCircle2, 
  Gavel, Trophy, AlertTriangle 
} from 'lucide-react';
import { maskInn } from '../utils/helpers';

const ProfilePage = ({ currentUser, setCurrentUser, navigate, addToast, lots }) => {
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [showRefundInfo, setShowRefundInfo] = useState(false);
  const [depositMethod, setDepositMethod] = useState('card');

  const isAppAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.isAdmin === true);

  useEffect(() => {
      if (currentUser && currentUser.id) {
          fetch(`/api/user/${currentUser.id}`)
              .then(res => res.json())
              .then(data => {
                  if (data.success && data.user.depositBalance !== currentUser.depositBalance) {
                      setCurrentUser(data.user);
                      if (data.user.depositBalance > currentUser.depositBalance) {
                          addToast("Успешно", "Ваш баланс пополнен!", "success");
                      }
                  }
              }).catch(console.error);
      }
  }, [currentUser, setCurrentUser, addToast]);

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
    const amount = depositMethod === 'card' ? 3000 : 5000;
    const userType = depositMethod === 'card' ? 'individual' : 'legal';

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const response = await fetch('/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, amount, userType, returnUrl: window.location.href })
        });
        const data = await response.json();
        
        if (data.success && data.url) window.location.href = data.url; 
        else { addToast("Ошибка", data.error || "Не удалось создать платеж", "error"); setIsProcessingTopUp(false); }
    } catch (error) { 
        addToast("Сбой сети", "Не удалось связаться с сервером", "error"); 
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
                  
                  {/* КНОПКА АДМИНКИ */}
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
                  <div className={`bg-gradient-to-r ${currentUser.depositBalance < 0 ? 'from-red-800 to-red-900' : 'from-slate-800 to-slate-900'} rounded-2xl p-8 text-white shadow-lg flex justify-between items-center mb-8 relative overflow-hidden`}>
                      <div className="absolute -right-4 -bottom-8 opacity-20">
                          <Wallet size={160} />
                      </div>
                      <div className="relative z-10">
                          <p className="text-slate-300 text-sm font-medium mb-1">Обеспечительный платеж (Депозит)</p>
                          <div className="text-4xl md:text-5xl font-black">{currentUser.depositBalance.toLocaleString('ru-RU')} ₽</div>
                          {currentUser.depositBalance < 0 && <p className="text-red-300 text-xs mt-2 font-bold uppercase">Отрицательный баланс! Пополните счет.</p>}
                      </div>
                  </div>
                  
                  {!currentUser.isVerified ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                      <h3 className="font-bold text-slate-800 text-lg mb-4">Пополнение баланса (Депозит)</h3>
                      
                      <div className="flex border-b border-orange-200 mb-6">
                          <button onClick={() => setDepositMethod('card')} className={`px-4 py-2 font-bold text-sm border-b-2 ${depositMethod === 'card' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Для Физлиц (3 000 ₽)</button>
                          <button onClick={() => setDepositMethod('invoice')} className={`px-4 py-2 font-bold text-sm border-b-2 ${depositMethod === 'invoice' ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Для Юрлиц (5 000 ₽)</button>
                      </div>

                      {depositMethod === 'card' ? (
                          <>
                              <p className="text-slate-600 text-sm mb-6 max-w-lg leading-relaxed">
                                  Для полноценного участия в торгах необходимо внести гарантийный депозит 3 000 рублей. Сумма холдируется (замораживается) на вашей карте и автоматически возвращается при проигрыше.
                              </p>
                              <button onClick={handleTopUp} disabled={isProcessingTopUp} className="bg-[#F97316] disabled:bg-orange-400 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2">
                                  {isProcessingTopUp ? 'Связь с банком (ЮKassa)...' : <><CreditCard size={18}/> Заморозить 3 000 ₽</>}
                              </button>
                              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><ShieldCheck size={14}/> Платеж защищен шифрованием эквайринга</p>
                          </>
                      ) : (
                          <>
                              <p className="text-slate-600 text-sm mb-6 max-w-lg leading-relaxed">
                                  Сгенерируйте счет на оплату депозита (5 000 рублей) для вашей бухгалтерии. После поступления средств на наш расчетный счет, депозит будет зачислен в Личный кабинет.
                              </p>
                              <button onClick={() => addToast('Счет сгенерирован', 'Началось скачивание PDF-файла.', 'success')} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2">
                                  <FileText size={18}/> Скачать счет (PDF)
                              </button>
                              <p className="text-xs text-slate-400 mt-3">Срок зачисления зависит от банка (обычно 1-2 рабочих дня).</p>
                          </>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <CheckCircle2 className="text-green-600 mt-1" size={24} />
                            <div>
                                <h3 className="font-bold text-green-800 text-lg mb-1">Доступ к торгам открыт</h3>
                                <p className="text-green-700 text-sm leading-relaxed max-w-md">
                                    Вы можете делать ставки на любые лоты в пределах вашего депозита. Не забывайте пополнять счет для оплаты комиссий за ставки (49 ₽).
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

              {/* Секция Документы */}
              <div id="sec-documents" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-24">
                  <h2 className="text-2xl font-black text-slate-800 mb-6">Мои документы</h2>
                  <p className="text-slate-600 text-sm mb-6">Загрузите документы для ручной модерации администратором. Это позволит получить полный доступ к торгам.</p>
                  
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

export default ProfilePage;