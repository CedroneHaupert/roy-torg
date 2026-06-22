import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, Users, Edit3, PlusCircle, 
  CalendarClock, Archive, Wallet, Activity, FileSpreadsheet, 
  FileText, User, UserCheck, ShieldBan, ShieldCheck, Star, PlayCircle, 
  UploadCloud, CheckCircle2, Search, Trophy, Repeat, Info 
} from 'lucide-react';

// === Вспомогательная функция маскировки ИНН ===
const maskInn = (inn) => {
    if (!inn) return 'Не указан';
    if (inn.length < 6) return 'Скрыт';
    return inn.substring(0, 3) + '*****' + inn.substring(inn.length - 2);
};

const AdminPage = ({ navigate, lots, addToast, currentUser }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState({ totalUsers: 0, activeLots: 0, completedLots: 0, frequentBidders: 0 });
    const [adminUsers, setAdminUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [adminLogs, setAdminLogs] = useState([]);
    const [leads, setLeads] = useState([]);
    
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
        } else if (activeTab === 'leads') {
            fetchLeads();
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

    const fetchLeads = async () => {
        try {
            const res = await fetch('/api/admin/leads');
            const data = await res.json();
            if (data.success) setLeads(data.leads);
        } catch (error) { console.error(error); }
    };

    const fetchLogs = async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/admin/logs?adminId=${currentUser.id}`);
            const data = await res.json();
            if (data.success) setAdminLogs(data.logs);
        } catch (error) { console.error(error); }
    };

    const handleUserAction = async (userId, action) => {
        if (!currentUser?.id) {
            addToast('Ошибка сессии', 'Отсутствует ID. Выйдите и зайдите заново.', 'error');
            return;
        }
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
        if (!currentUser?.id) {
            addToast('Ошибка сессии', 'Система не может подтвердить ваш ID. Выйдите из аккаунта и войдите заново!', 'error');
            return;
        }
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
                if (data.error && data.error.includes('Нет прав')) {
                    addToast('Внимание!', 'Бэкенд вас не пускает. Выйдите из аккаунта и войдите заново, чтобы обновить права в базе данных!', 'error');
                } else {
                    addToast('Ошибка', data.error || 'Ошибка при изменении роли', 'error');
                }
            }
        } catch (error) { 
            addToast('Ошибка сети', 'Не удалось связаться с сервером', 'error'); 
        }
    };

    const handleLeadStatus = async (id, status) => {
        if (!currentUser?.id) return addToast('Ошибка', 'Перезайдите в аккаунт', 'error');
        try {
            const res = await fetch(`/api/admin/leads/${id}/status`, {
                method: 'PATCH', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status, adminId: currentUser.id })
            });
            if (res.ok) {
                addToast('Успех', 'Статус заявки изменен', 'success');
                fetchLeads();
            }
        } catch (error) {
            addToast('Ошибка', 'Не удалось обновить статус заявки', 'error');
        }
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
        if (!currentUser?.id) return addToast('Ошибка', 'Перезайдите в аккаунт', 'error');
        try {
            const res = await fetch(`/api/lots/${id}/copy`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: currentUser.id })
            });
            if (res.ok) addToast('Успех', 'Лот успешно скопирован и перенесен в запланированные', 'success');
        } catch (e) { addToast('Ошибка', 'Не удалось скопировать лот', 'error'); }
    }

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
                ...formData, adminId: currentUser?.id,
                images: uploadedUrls.length ? uploadedUrls : undefined,
                inspectionPdf: uploadedInspection || undefined,
                avtotekaPdf: uploadedAvtoteka || undefined
            };

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
                <button onClick={() => setActiveTab('leads')} className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'leads' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <ClipboardList size={18}/> Входящие заявки
                    {leads.filter(l => l.status === 'new').length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{leads.filter(l => l.status === 'new').length}</span>}
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
                
                {activeTab === 'leads' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                                    <th className="py-4 px-4 font-bold rounded-tl-xl">Дата / Тип</th>
                                    <th className="py-4 px-4 font-bold">Контакты</th>
                                    <th className="py-4 px-4 font-bold">Детали заявки</th>
                                    <th className="py-4 px-4 font-bold">Статус</th>
                                    <th className="py-4 px-4 font-bold text-right rounded-tr-xl">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.length === 0 ? <tr><td colSpan="5" className="text-center py-8 text-slate-500">Заявок пока нет.</td></tr> : leads.map(lead => (
                                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                        <td className="py-4 px-4">
                                            <div className="text-sm font-bold text-slate-800">{new Date(lead.createdAt).toLocaleDateString('ru-RU')}</div>
                                            <div className="text-xs text-slate-500 mt-1">{lead.type === 'sell' ? 'Продажа техники' : 'Софинансирование'}</div>
                                        </td>
                                        <td className="py-4 px-4 font-medium text-slate-800 text-sm">
                                            {lead.payload.phone || lead.User?.phone || 'Не указан'}
                                        </td>
                                        <td className="py-4 px-4 text-xs text-slate-600 leading-relaxed">
                                            {lead.type === 'sell' ? (
                                                <><b>Марка:</b> {lead.payload.model} ({lead.payload.year} г.)<br/><b>Город:</b> {lead.payload.city}</>
                                            ) : (
                                                <><b>Лот:</b> {lead.payload.price?.toLocaleString()} ₽<br/><b>Аванс:</b> {lead.payload.downpaymentPercent}% на {lead.payload.months} мес.</>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            {lead.status === 'new' ? <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-200">Новая</span> : 
                                             lead.status === 'processed' ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded border border-green-200">В работе</span> : 
                                             <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded border border-slate-200">Отказ</span>}
                                        </td>
                                        <td className="py-4 px-4 flex justify-end gap-2">
                                            {lead.status === 'new' && <button onClick={() => handleLeadStatus(lead.id, 'processed')} className="text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-bold px-2 py-1.5 rounded transition">В работу</button>}
                                            {lead.status !== 'rejected' && <button onClick={() => handleLeadStatus(lead.id, 'rejected')} className="text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold px-2 py-1.5 rounded transition">Отказ</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex justify-end mb-4">
                            <button onClick={() => window.open('/api/admin/export/users', '_blank')} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition shadow flex items-center gap-2">
                                <FileSpreadsheet size={16}/> Выгрузить базу (Excel)
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                                        <th className="py-4 px-4 font-bold rounded-tl-xl">Телефон / Роль</th>
                                        <th className="py-4 px-4 font-bold">Тип</th>
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
                                                    {user.role === 'superadmin' ? <span className="text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">SuperAdmin</span> : 
                                                     user.role === 'admin' ? <span className="text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">Admin</span> : 
                                                     <span className="text-slate-400">User</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-xs font-bold text-slate-500">{user.userType === 'legal' ? 'ЮЛ' : 'ФЛ'}</td>
                                            <td className={`py-4 px-4 font-bold ${user.depositBalance < 0 ? 'text-red-500' : 'text-blue-600'}`}>{user.depositBalance.toLocaleString('ru-RU')} ₽</td>
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
                                        <td className={`py-4 px-4 font-black text-right ${tx.amount < 0 ? 'text-red-500' : 'text-blue-600'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('ru-RU')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

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

export default AdminPage;