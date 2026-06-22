import React from 'react';
import { MapPin, MonitorSmartphone, FileSignature, ShieldCheck, Wallet } from 'lucide-react';

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
            
            <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">2. Гарантийный депозит и Участие</h3>
            <p>Для активации функции совершения ставок Пользователь обязан внести обеспечительный платеж (Депозит). Для физических лиц сумма депозита составляет <b>3 000 (Три тысячи) рублей</b>. Для юридических лиц депозит составляет <b>5 000 (Пять тысяч) рублей</b>.</p>
            <p>За совершение каждой ставки (ручной или автоматической через модуль «Автоброкер») с баланса Лицензиата списывается невозвратная комиссия в размере <b>49 (Сорок девять) рублей</b>.</p>

            <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">3. Порядок оплаты при победе в торгах</h3>
            <p>В случае признания Лицензиата победителем торгов, он обязуется <b>в течение 3 (Трех) рабочих дней</b> оплатить услуги по выездной инспекции техники в размере <b>12 800 (Двенадцать тысяч восемьсот) рублей</b> банковской картой или по счету.</p>
            <p>После подтверждения оплаты инспекции Победитель обязуется выплатить Лицензиару вознаграждение в размере <b>3% (Три процента)</b> от итоговой стоимости Лота. До момента оплаты комиссий контакты Продавца не передаются.</p>

            <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">4. Штрафные санкции</h3>
            <p>В случае отказа Победителя от оплаты инспекции, комиссии 3% или необоснованного отказа от подписания Договора купли-продажи с Продавцом, Платформа удерживает штраф в размере <b>3 000 (Три тысячи) рублей</b>. Баланс Пользователя может уйти в отрицательное значение, а аккаунт подлежит блокировке до полного погашения задолженности.</p>
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
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Статус участников и Депозит</h3>
                    <p className="text-slate-600 leading-relaxed">К участию допускаются пользователи, внесшие гарантийный депозит (3000 ₽ для ФЛ, 5000 ₽ для ЮЛ). При отрицательном балансе доступ к торгам блокируется.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center shrink-0">2</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Автоброкер и ставки</h3>
                    <p className="text-slate-600 leading-relaxed">За каждое действие по совершению ставки (ручное или срабатывание робота-автоброкера) с баланса пользователя списывается комиссия 49 ₽. Автоброкер автоматически перебивает ставки конкурентов до достижения вашего установленного лимита.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center shrink-0">3</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Осмотр и Комиссии</h3>
                    <p className="text-slate-600 leading-relaxed">Победитель торгов оплачивает 12 800 ₽ за выездную инспекцию в течение 3 дней, а затем 3% от финальной стоимости лота. При отказе от покупки удерживается штраф 3000 ₽.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center shrink-0">4</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Скрытый резерв</h3>
                    <p className="text-slate-600 leading-relaxed">Продавец имеет право установить минимальную цену продажи (Скрытый резерв). Если по окончании времени торгов итоговая ставка не достигла резерва, продавец вправе отказаться от сделки.</p>
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

export { PrivacyPage, OfferPage, RulesPage, InspectionPage, AboutPage };