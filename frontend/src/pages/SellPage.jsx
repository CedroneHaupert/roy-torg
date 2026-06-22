import React from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';

const SellPage = ({ addToast, currentUser }) => {
    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const payload = {
            category: form.get('category'),
            year: form.get('year'),
            model: form.get('model'),
            city: form.get('city'),
            phone: form.get('phone')
        };
        
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'sell', payload, userId: currentUser?.id })
            });
            if (res.ok) {
                addToast('Заявка отправлена', 'Наш менеджер свяжется с вами для согласования выездного осмотра.', 'success');
                e.target.reset();
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            addToast('Сбой', 'Не удалось отправить заявку. Попробуйте позже.', 'error');
        }
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
                            <select name="category" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm"><option>Тягач</option><option>Полуприцепы</option><option>Спецтехника</option><option>LCV</option></select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Год выпуска</label>
                            <input name="year" required type="number" placeholder="2020" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Марка и модель</label>
                        <input name="model" required type="text" placeholder="KAMAZ 5490 NEO" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Где находится техника?</label>
                        <input name="city" required type="text" placeholder="Санкт-Петербург" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Контактный телефон</label>
                        <input name="phone" required type="tel" defaultValue={currentUser?.phone || ''} placeholder="+7 (___) ___-__-__" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 text-sm font-medium" />
                    </div>
                    <button type="submit" className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg transition mt-4">Отправить заявку</button>
                </form>
            </div>
        </div>
    </main>
    );
};

export default SellPage;