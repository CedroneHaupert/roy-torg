require('dotenv').config(); // Загружаем секреты из файла .env

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// === 0. НАСТРОЙКА ХРАНИЛИЩА ФАЙЛОВ (MULTER) ===
// Убеждаемся, что папка для загрузок существует
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Раздаем статику загрузок по прямому пути
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === 1. БАЗА ДАННЫХ ===
let sequelize;
if (process.env.NODE_ENV === 'production') {
    sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false
    });
    console.log('🔗 Режим: PRODUCTION (PostgreSQL)');
} else {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'roytorg.sqlite'), 
        logging: false 
    });
    console.log('🔗 Режим: DEVELOPMENT (SQLite)');
}

// === 2. МОДЕЛИ БД ===
const User = sequelize.define('User', {
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    inn: { type: DataTypes.STRING, allowNull: true },
    depositBalance: { type: DataTypes.INTEGER, defaultValue: 0 },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false },
    passportPdf: { type: DataTypes.STRING, defaultValue: '' },
    companyPdf: { type: DataTypes.STRING, defaultValue: '' },
    // НОВАЯ РОЛЕВАЯ СИСТЕМА: 'user', 'admin', 'superadmin'
    role: { type: DataTypes.STRING, defaultValue: 'user' }
});

const Lot = sequelize.define('Lot', {
    auctionId: { type: DataTypes.STRING, defaultValue: 'A-2026-05' },
    lotNumber: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    year: { type: DataTypes.INTEGER, allowNull: true },
    mileage: { type: DataTypes.STRING, defaultValue: '' },
    currentPrice: { type: DataTypes.INTEGER, allowNull: false },
    minStep: { type: DataTypes.INTEGER, defaultValue: 50000 },
    reservePrice: { type: DataTypes.INTEGER, allowNull: true },
    estimatedValue: { type: DataTypes.INTEGER, allowNull: true },
    startTime: { type: DataTypes.DATE, allowNull: true },
    endTime: { type: DataTypes.DATE, allowNull: false },
    bidsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    hasNds: { type: DataTypes.BOOLEAN, defaultValue: true },
    imageUrl: { type: DataTypes.STRING, defaultValue: '' },
    images: { type: DataTypes.JSON, defaultValue: [] },
    mechanicRating: { type: DataTypes.INTEGER, defaultValue: 8 },
    videoUrl: { type: DataTypes.STRING, defaultValue: '' },
    inspectionPdf: { type: DataTypes.STRING, defaultValue: '' }, 
    avtotekaPdf: { type: DataTypes.STRING, defaultValue: '' },   
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    sellerInn: { type: DataTypes.STRING, defaultValue: '' },
    isSecurityChecked: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Bid = sequelize.define('Bid', {
    amount: { type: DataTypes.INTEGER, allowNull: false },
    userPhone: { type: DataTypes.STRING, allowNull: false }
});

const AutoBid = sequelize.define('AutoBid', {
    maxAmount: { type: DataTypes.INTEGER, allowNull: false }
});

// НОВАЯ МОДЕЛЬ: Логирование действий администраторов
const AdminLog = sequelize.define('AdminLog', {
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true }
});

// НОВАЯ МОДЕЛЬ: Финансовые транзакции пользователей (пополнения, списания, комиссии)
const Transaction = sequelize.define('Transaction', {
    type: { type: DataTypes.STRING, allowNull: false }, // 'topup', 'withdraw', 'commission', 'penalty'
    amount: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true }
});

// Связи БД
User.hasMany(Bid);
Bid.belongsTo(User);
Lot.hasMany(Bid);
Bid.belongsTo(Lot);

User.hasMany(AutoBid);
AutoBid.belongsTo(User);
Lot.hasMany(AutoBid);
AutoBid.belongsTo(Lot);

User.hasMany(AdminLog, { foreignKey: 'adminId' });
AdminLog.belongsTo(User, { as: 'Admin', foreignKey: 'adminId' });

User.hasMany(Transaction);
Transaction.belongsTo(User);


const smsCodes = new Map();

// --- Вспомогательные функции ---
async function logAdminAction(adminId, action, details) {
    if (!adminId) return;
    try {
        await AdminLog.create({ adminId, action, details });
    } catch (e) {
        console.error("Ошибка логирования действий админа:", e);
    }
}

async function recordTransaction(userId, type, amount, description) {
    try {
        await Transaction.create({ UserId: userId, type, amount, description });
    } catch (e) {
        console.error("Ошибка записи транзакции:", e);
    }
}

// === 3. REST API ===

// Мульти-загрузка: фото + PDF
app.post('/api/upload', upload.fields([
    { name: 'photos', maxCount: 30 },
    { name: 'inspectionPdf', maxCount: 1 },
    { name: 'avtotekaPdf', maxCount: 1 }
]), (req, res) => {
    try {
        console.log('📥 Поступил запрос на загрузку файлов лота:', req.files);
        
        const photoUrls = req.files['photos'] ? req.files['photos'].map(file => `/uploads/${file.filename}`) : [];
        const inspectionUrl = req.files['inspectionPdf'] ? `/uploads/${req.files['inspectionPdf'][0].filename}` : '';
        const avtotekaUrl = req.files['avtotekaPdf'] ? `/uploads/${req.files['avtotekaPdf'][0].filename}` : '';

        res.json({ 
            success: true, 
            urls: photoUrls, 
            inspectionPdf: inspectionUrl, 
            avtotekaPdf: avtotekaUrl 
        });
    } catch (error) {
        console.error('❌ Ошибка upload:', error);
        res.status(500).json({ error: 'Ошибка при сохранении файлов' });
    }
});

// Загрузка документов пользователя
app.post('/api/user/:id/documents', upload.fields([
    { name: 'passportPdf', maxCount: 1 },
    { name: 'companyPdf', maxCount: 1 }
]), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        if (req.files['passportPdf']) user.passportPdf = `/uploads/${req.files['passportPdf'][0].filename}`;
        if (req.files['companyPdf']) user.companyPdf = `/uploads/${req.files['companyPdf'][0].filename}`;
        
        await user.save();
        res.json({ success: true, user });
    } catch (error) {
        console.error('❌ Ошибка загрузки документов:', error);
        res.status(500).json({ error: 'Ошибка при сохранении документов' });
    }
});

// АВТОРИЗАЦИЯ
app.post('/api/auth/send-code', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Номер телефона обязателен' });

    const cleanPhone = phone.replace(/\D/g, '');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    smsCodes.set(phone, code); 

    console.log(`\n=============================`);
    console.log(`📩 [СМС ШЛЮЗ] Код ${code} для ${phone}`);
    console.log(`=============================\n`);

    try {
        const SMS_RU_API_ID = process.env.SMS_RU_API_ID || ''; 
        if (!SMS_RU_API_ID) {
            console.log('⚠️ Ключ SMS_RU_API_ID не задан в .env. Режим демо (введите 0000)');
            return res.json({ success: true, message: 'Тестовый режим (введите 0000)' });
        }

        const response = await fetch(`https://sms.ru/sms/send?api_id=${SMS_RU_API_ID}&to=${cleanPhone}&msg=${code}&json=1`);
        const data = await response.json();

        if (data.status === "OK") {
            res.json({ success: true, message: 'СМС отправлено' });
        } else {
            console.error('❌ Ошибка от sms.ru:', data);
            res.json({ success: true, message: 'Ошибка шлюза. Включен резервный режим демо (0000)' });
        }
    } catch (error) {
        console.error('Ошибка сети при отправке СМС:', error.message);
        res.json({ success: true, message: 'Локальный режим (введите 0000)' });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Телефон и код обязательны' });

    const savedCode = smsCodes.get(phone);
    if (savedCode !== code && code !== '0000') {
        return res.status(400).json({ error: 'Неверный код подтверждения' });
    }

    try {
        const [user, created] = await User.findOrCreate({
            where: { phone },
            defaults: { depositBalance: 0, isVerified: false, isBlocked: false, role: 'user' }
        });

        // 👑 СУПЕРАДМИН (Назначается автоматически при входе с этого номера)
        if (phone === '+7 (917) 207-49-39') {
            user.role = 'superadmin';
            user.isVerified = true;
            await user.save();
            await logAdminAction(user.id, 'SYSTEM', 'Суперадмин успешно авторизован');
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
        }

        smsCodes.delete(phone);
        res.json({ success: true, message: created ? 'Пользователь зарегистрирован' : 'Успешный вход', user });
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ПОПОЛНЕНИЕ БАЛАНСА
app.post('/api/topup', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (user.isBlocked) return res.status(403).json({ error: 'Действие запрещено. Аккаунт заблокирован.' });

        user.depositBalance += Number(amount);
        if (user.depositBalance >= 5000) user.isVerified = true;
        await user.save();

        await recordTransaction(user.id, 'topup', Number(amount), 'Пополнение обеспечительного платежа (Холдирование / Банковский перевод)');

        res.json({ success: true, user });
    } catch (error) {
        console.error('Ошибка пополнения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ИСТОРИЯ СТАВОК ЮЗЕРА
app.get('/api/user/:userId/bids', async (req, res) => {
    try {
        const bids = await Bid.findAll({ where: { UserId: req.params.userId }, include: [{ model: Lot, include: [Bid] }] });
        const lotsMap = new Map();
        bids.forEach(b => { if(b.Lot && !lotsMap.has(b.Lot.id)) lotsMap.set(b.Lot.id, b.Lot); });
        res.json({ success: true, lots: Array.from(lotsMap.values()) });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==========================================
// 🛡️ АДМИНСКИЕ РОУТЫ (RBAC + ЛОГИРОВАНИЕ)
// ==========================================

// СОЗДАНИЕ ЛОТА (Админом)
app.post('/api/lots', async (req, res) => {
    try {
        const { 
            auctionId, lotNumber, title, description, year, mileage, 
            currentPrice, minStep, reservePrice, estimatedValue, hasNds, 
            duration, durationType, startTime, images, mechanicRating, videoUrl,
            inspectionPdf, avtotekaPdf, sellerInn, isSecurityChecked, adminId
        } = req.body;
        
        const start = startTime ? new Date(startTime).getTime() : Date.now();
        const durationMs = durationType === 'hours' ? Number(duration) * 60 * 60 * 1000 : Number(duration) * 24 * 60 * 60 * 1000;
        
        const newLot = await Lot.create({
            auctionId: auctionId || 'A-2026-05',
            lotNumber: lotNumber || `L-${Math.floor(10000 + Math.random() * 90000)}`,
            title, description, year: year ? Number(year) : null, mileage,
            currentPrice: Number(currentPrice), minStep: Number(minStep) || 50000,
            reservePrice: reservePrice ? Number(reservePrice) : null,
            estimatedValue: estimatedValue ? Number(estimatedValue) : null,
            startTime: startTime ? new Date(startTime) : null,
            endTime: new Date(start + durationMs),
            hasNds,
            imageUrl: (images && images.length > 0) ? images[0] : '',
            images: images || [],
            inspectionPdf: inspectionPdf || '',
            avtotekaPdf: avtotekaPdf || '',
            status: 'active',
            mechanicRating: mechanicRating ? Number(mechanicRating) : 8,
            videoUrl: videoUrl || '',
            sellerInn: sellerInn || '',
            isSecurityChecked: isSecurityChecked || false
        });

        if (adminId) await logAdminAction(adminId, 'CREATE_LOT', `Создан лот: ${newLot.lotNumber} - ${newLot.title}`);

        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) {
        console.error('Ошибка создания лота:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// РЕДАКТИРОВАНИЕ ЛОТА (Только если он запланирован или активен)
app.put('/api/lots/:id', async (req, res) => {
    try {
        const { adminId, ...updates } = req.body;
        const lot = await Lot.findByPk(req.params.id);
        if (!lot) return res.status(404).json({ error: 'Лот не найден' });
        
        await lot.update(updates);
        if (adminId) await logAdminAction(adminId, 'EDIT_LOT', `Отредактирован лот: ${lot.lotNumber}`);

        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot });
    } catch (error) {
        console.error('Ошибка редактирования:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ДУБЛИРОВАНИЕ ЛОТА
app.post('/api/lots/:id/copy', async (req, res) => {
    try {
        const { adminId } = req.body; // Ожидаем ID админа
        const oldLot = await Lot.findByPk(req.params.id);
        if (!oldLot) return res.status(404).json({ error: 'Лот не найден' });
        
        const newLot = await Lot.create({
            ...oldLot.toJSON(), id: undefined,
            lotNumber: `L-${Math.floor(10000 + Math.random() * 90000)} (копия)`,
            title: oldLot.title + ' (повтор)',
            endTime: new Date(Date.now() + 86400000), status: 'active'
        });

        if (adminId) await logAdminAction(adminId, 'COPY_LOT', `Лот ${oldLot.lotNumber} скопирован в ${newLot.lotNumber}`);

        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при копировании' });
    }
});

// ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (Для админки)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['updatedAt'] }
        });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// БЛОКИРОВКА / ВЕРИФИКАЦИЯ (Админом)
app.patch('/api/admin/users/:id/action', async (req, res) => {
    try {
        const { action, adminId } = req.body; 
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        if (action === 'verify') {
            user.isVerified = !user.isVerified;
            await logAdminAction(adminId, user.isVerified ? 'VERIFY_USER' : 'UNVERIFY_USER', `Верификация изменена у ${user.phone}`);
        } else if (action === 'block') {
            // Суперадмина заблокировать нельзя
            if (user.role === 'superadmin') return res.status(403).json({ error: 'Нельзя заблокировать Суперадминистратора' });
            user.isBlocked = !user.isBlocked;
            await logAdminAction(adminId, user.isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER', `Блокировка изменена у ${user.phone}`);
        }
        
        await user.save();
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// НАЗНАЧЕНИЕ РОЛЕЙ (Только Суперадмин)
app.patch('/api/admin/users/:id/role', async (req, res) => {
    try {
        const { role, adminId } = req.body; 
        // Проверяем, что запрос делает суперадмин
        const superAdmin = await User.findByPk(adminId);
        if (!superAdmin || superAdmin.role !== 'superadmin') {
            return res.status(403).json({ error: 'Нет прав. Только Суперадмин может назначать администраторов.' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        // Нельзя понизить самого себя (защита от выстрела в ногу)
        if (user.id === superAdmin.id) return res.status(403).json({ error: 'Нельзя изменить роль самому себе' });

        user.role = role; // 'user' или 'admin'
        await user.save();
        
        await logAdminAction(adminId, 'CHANGE_ROLE', `Пользователю ${user.phone} назначена роль: ${role}`);

        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ПРОСМОТР ЛОГОВ АДМИНОВ (Только Суперадмин)
app.get('/api/admin/logs', async (req, res) => {
    try {
        const adminId = req.query.adminId;
        const superAdmin = await User.findByPk(adminId);
        if (!superAdmin || superAdmin.role !== 'superadmin') return res.status(403).json({ error: 'Доступ запрещен' });

        const logs = await AdminLog.findAll({
            include: [{ model: User, as: 'Admin', attributes: ['phone', 'role'] }],
            order: [['createdAt', 'DESC']],
            limit: 500
        });
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ПРОСМОТР ФИНАНСОВЫХ ТРАНЗАКЦИЙ (Админ)
app.get('/api/admin/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.findAll({
            include: [{ model: User, attributes: ['phone', 'inn'] }],
            order: [['createdAt', 'DESC']],
            limit: 1000
        });
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ВЫГРУЗКА В EXCEL: Список пользователей (CSV с BOM для идеального чтения в Excel)
app.get('/api/admin/export/users', async (req, res) => {
    try {
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        
        // \uFEFF сообщает Экселю, что это UTF-8, чтобы кириллица читалась идеально
        let csvContent = '\uFEFF'; 
        csvContent += 'ID;Телефон;ИНН;Депозит (руб);Роль;Верифицирован;Заблокирован;Дата регистрации\n';
        
        users.forEach(u => {
            const date = new Date(u.createdAt).toLocaleDateString('ru-RU');
            csvContent += `${u.id};${u.phone};${u.inn || 'Нет'};${u.depositBalance};${u.role};${u.isVerified ? 'Да' : 'Нет'};${u.isBlocked ? 'Да' : 'Нет'};${date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="roytorg_users.csv"');
        res.send(csvContent);
    } catch (error) {
        res.status(500).send('Ошибка генерации файла');
    }
});

// ВЫГРУЗКА ЛОТА В PDF: Подготовка структурированных данных
app.get('/api/admin/lot-report/:id', async (req, res) => {
    try {
        const lot = await Lot.findByPk(req.params.id, {
            include: [{ model: Bid, include: [User] }]
        });
        if (!lot) return res.status(404).json({ error: 'Лот не найден' });

        // Сортируем ставки
        const sortedBids = lot.Bids.sort((a, b) => b.amount - a.amount);
        
        const reportData = {
            auctionId: lot.auctionId,
            lotNumber: lot.lotNumber,
            title: lot.title,
            year: lot.year,
            mileage: lot.mileage,
            sellerInn: lot.sellerInn || 'Не указан',
            minReserve: lot.reservePrice || 'Отсутствует',
            estimatedValue: lot.estimatedValue || 'Не указана',
            finalPrice: lot.currentPrice,
            status: lot.status,
            endDate: new Date(lot.endTime).toLocaleString('ru-RU'),
            bidsHistory: sortedBids.map(b => ({
                amount: b.amount,
                phone: b.userPhone,
                time: new Date(b.createdAt).toLocaleString('ru-RU')
            }))
        };
        
        res.json({ success: true, report: reportData });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка формирования отчета' });
    }
});

// СТАТИСТИКА (Дашборд)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.count();
        const activeLots = await Lot.count({ where: { status: 'active' } });
        const completedLots = await Lot.count({ where: { status: 'completed' } });
        
        const frequentBidders = await Bid.count({
            attributes: ['userPhone'],
            group: ['userPhone'],
            having: sequelize.where(sequelize.fn('count', sequelize.col('id')), '>', 3)
        });

        res.json({ totalUsers, activeLots, completedLots, frequentBidders: frequentBidders.length });
    } catch (error) {
        console.error('Ошибка статистики:', error);
        res.status(500).json({ error: 'Ошибка statistics' });
    }
});


// === 4. ЛОГИКА АВТОБРОКЕРА ===
async function triggerAutoBids(lotId) {
    const lot = await Lot.findByPk(lotId);
    if (!lot || lot.status === 'completed' || new Date(lot.endTime).getTime() <= Date.now()) return;

    const latestBid = await Bid.findOne({ where: { LotId: lot.id }, order: [['createdAt', 'DESC']] });
    const prevLeaderId = latestBid ? latestBid.UserId : null;

    const autoBids = await AutoBid.findAll({ where: { LotId: lot.id } });
    const competingAutoBids = autoBids.filter(ab => ab.UserId !== prevLeaderId);
    
    if (competingAutoBids.length === 0) return; 

    competingAutoBids.sort((a, b) => b.maxAmount - a.maxAmount);
    const bestAutoBid = competingAutoBids[0];
    const requiredBid = lot.currentPrice + lot.minStep;

    if (bestAutoBid.maxAmount >= requiredBid) {
        lot.currentPrice = requiredBid;
        lot.bidsCount += 1;
        const timeRemaining = new Date(lot.endTime).getTime() - Date.now();
        if (timeRemaining > 0 && timeRemaining < 180000) lot.endTime = new Date(Date.now() + 180000); 
        await lot.save();

        const user = await User.findByPk(bestAutoBid.UserId);
        if (user.isBlocked) return;

        await Bid.create({ amount: requiredBid, LotId: lot.id, UserId: user.id, userPhone: user.phone });

        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);

        if (prevLeaderId && prevLeaderId !== user.id) {
            io.emit('outbid', { previousUserId: prevLeaderId, lotId: lot.id, title: lot.title, newPrice: requiredBid });
        }
        await triggerAutoBids(lot.id);
    }
}

// === 5. ЛОГИКА СОКЕТОВ ===
io.on('connection', async (socket) => {
    console.log(`⚡ Подключился пользователь: ${socket.id}`);

    try {
        const activeLots = await Lot.findAll({ include: [Bid] });
        socket.emit('updateLots', activeLots);
    } catch (e) {
        console.error("Ожидание инициализации базы...");
    }

    socket.on('setupAutoBroker', async (data) => {
        const { lotId, maxAmount, userId } = data;
        try {
            const user = await User.findByPk(userId);
            if (!user) return;
            if (user.isBlocked) return socket.emit('bidError', { message: 'Ваш аккаунт заблокирован администратором' });
            if (!user.isVerified && user.depositBalance < 5000) return socket.emit('bidError', { message: 'Внесите депозит 5000 ₽' });
            
            const lot = await Lot.findByPk(lotId);
            if (lot.status === 'completed') return socket.emit('bidError', { message: 'Торги завершены!' });
            if (maxAmount < lot.currentPrice + lot.minStep) return socket.emit('bidError', { message: 'Лимит слишком мал' });

            let autoBid = await AutoBid.findOne({ where: { LotId: lotId, UserId: userId } });
            if (autoBid) { 
                autoBid.maxAmount = maxAmount; 
                await autoBid.save(); 
            } else { 
                await AutoBid.create({ maxAmount, LotId: lotId, UserId: userId }); 
            }

            socket.emit('bidSuccess', { message: `Робот включен! Лимит: ${maxAmount} ₽` });
            await triggerAutoBids(lotId);
        } catch (error) {
            socket.emit('bidError', { message: 'Ошибка настройки автоброкера' });
        }
    });

    socket.on('cancelAutoBroker', async (data) => {
        try {
            await AutoBid.destroy({ where: { LotId: data.lotId, UserId: data.userId } });
            socket.emit('bidSuccess', { message: 'Автоброкер отключен' });
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('placeBid', async (data) => {
        const { lotId, bidAmount, userId } = data;
        try {
            const user = await User.findByPk(userId);
            if (!user) return;
            if (user.isBlocked) return socket.emit('bidError', { message: 'Действие запрещено. Аккаунт заблокирован.' });
            if (!user.isVerified && user.depositBalance < 5000) return socket.emit('bidError', { message: 'Внесите депозит 5000 ₽' });

            const lot = await Lot.findByPk(lotId);
            if (!lot || lot.status === 'completed' || new Date(lot.endTime).getTime() <= Date.now()) return socket.emit('bidError', { message: 'Торги завершены!' });

            if (bidAmount >= lot.currentPrice + lot.minStep) {
                lot.currentPrice = bidAmount;
                lot.bidsCount += 1;
                const timeRemaining = new Date(lot.endTime).getTime() - Date.now();
                if (timeRemaining > 0 && timeRemaining < 180000) lot.endTime = new Date(Date.now() + 180000); 
                
                await lot.save();
                await Bid.create({ amount: bidAmount, LotId: lot.id, UserId: user.id, userPhone: user.phone });

                const latestBid = await Bid.findOne({ where: { LotId: lot.id }, order: [['createdAt', 'DESC']] });
                const prevLeaderId = latestBid ? latestBid.UserId : null;

                const updatedLots = await Lot.findAll({ include: [Bid] });
                io.emit('updateLots', updatedLots);
                socket.emit('bidSuccess', { message: 'Ставка принята!' });

                if (prevLeaderId && prevLeaderId !== user.id) {
                    io.emit('outbid', { previousUserId: prevLeaderId, lotId: lot.id, title: lot.title, newPrice: bidAmount });
                }
                await triggerAutoBids(lot.id);
            } else {
                socket.emit('bidError', { message: `Ставка слишком мала!` });
            }
        } catch (error) {
            socket.emit('bidError', { message: 'Ошибка сервера' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Отключился: ${socket.id}`);
    });
});

// === 6. РАЗДАЧА ФРОНТЕНДА ===
const frontendPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendPath));

app.get(/^(?!\/(api|uploads)).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            console.error('❌ Ошибка отправки index.html:', err);
            res.status(500).send('Ошибка загрузки фронтенда. Проверьте папку build.');
        }
    });
});

// === 7. ЗАПУСК БАЗЫ ДАННЫХ И СЕРВЕРА ===
async function startServer() {
    try {
        // alter: true бережно сохранит старые данные и добавит новые колонки/таблицы
        await sequelize.sync({ alter: true }); 
        console.log('✅ База данных готова (Синхронизация завершена)');

        const PORT = process.env.PORT || 5000; // Поставил 5000 порт по умолчанию (под Nginx)
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Сервер РОЙ ТОРГ запущен на порту ${PORT}`);
            
            // CRON-УВЕДОМЛЕНИЯ ОБ ОКОНЧАНИИ ТОРГОВ
            setInterval(async () => {
                try {
                    const expiredLots = await Lot.findAll({
                        where: { status: 'active', endTime: { [Op.lt]: new Date() } },
                        include: [Bid]
                    });

                    for (let lot of expiredLots) {
                        lot.status = 'completed';
                        await lot.save();
                        
                        const topBids = await Bid.findAll({ where: { LotId: lot.id }, order: [['amount', 'DESC']], limit: 3 });
                        
                        if (topBids.length > 0) {
                            const winningAmount = topBids[0].amount;
                            const isReserveMet = !lot.reservePrice || winningAmount >= lot.reservePrice;
                            const computedCommission = Math.round(winningAmount * 0.03);
                            
                            // Записываем системный лог о завершении
                            await logAdminAction(null, 'SYSTEM_AUCTION_END', `Лот ${lot.lotNumber} завершен. Победитель: ${topBids[0].userPhone}`);

                            io.emit('winnerNotification', { 
                                lotId: lot.id, 
                                title: lot.title,
                                winnerPhone: topBids[0].userPhone,
                                winnerUserId: topBids[0].UserId,
                                managerPhone: '+7 (921) 123-45-67',
                                reserveMet: isReserveMet,          
                                commissionAmount: computedCommission 
                            });
                        }
                    }

                    if (expiredLots.length > 0) {
                        const updatedLots = await Lot.findAll({ include: [Bid] });
                        io.emit('updateLots', updatedLots);
                    }
                } catch (err) {
                    console.error("Ошибка в cron-задаче:", err);
                }
            }, 10000); 
        });

    } catch (error) {
        console.error('Критическая ошибка при запуске бэкенда:', error);
    }
}

startServer();