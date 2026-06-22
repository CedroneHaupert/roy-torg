import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

const FinancePage = ({ addToast, currentUser }) => {
    const [price, setPrice] = useState(5000000);
    const [downpaymentPercent, setDownpaymentPercent] = useState(20);
    const [months, setMonths] = useState(24);
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const downpaymentSum = price * (downpaymentPercent / 100);
    const creditSum = price - downpaymentSum;
    const monthlyRate = 0.30 / 12; 
    
    let monthlyPayment = 0;
    if (creditSum > 0) {
        monthlyPayment = creditSum * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    }
    
    const totalPayout = monthlyPayment * months;
    const overpayment = totalPayout - creditSum;

    const handleApply = async () => {
        if (!phone || phone.length < 10) {
            addToast('Ошибка', 'Пожалуйста, введите корректный номер телефона', 'error');
            return;
        }
        setIsSubmitting(true);
        const payload = { price, downpaymentPercent, downpaymentSum, creditSum, months, phone };
        
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'finance', payload, userId: currentUser?.id })
            });
            if (res.ok) {
                addToast('Заявка принята', 'Финансовый менеджер ДВИЖ-ИНВЕСТ.РФ скоро с вами свяжется.', 'success');
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            addToast('Сбой', 'Не удалось отправить заявку. Попробуйте позже.', 'error');
        } finally {
            setIsSubmitting(false);
        }
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
                        
                        <div className="space-y-3 pt-4 border-t border-slate-100 mb-4">
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
                        
                        <div className="pt-2 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Контактный телефон</label>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm font-medium" />
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

export default FinancePage;