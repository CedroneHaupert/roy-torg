require('dotenv').config();

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

// === 0. НАСТРОЙКА ХРАНИЛИЩА ФАЙЛОВ ===
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
    role: { type: DataTypes.STRING, defaultValue: 'user' }, 
    userType: { type: DataTypes.STRING, defaultValue: 'individual' },
    paymentToken: { type: DataTypes.STRING, allowNull: true } // Токен привязанной карты ЮKassa
});

const Lot = sequelize.define('Lot', {
    auctionId: { type: DataTypes.STRING, defaultValue: 'A-2026-05' },
    lotNumber: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, defaultValue: 'Тягачи' }, // Категория для каталога
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
    isSecurityChecked: { type: DataTypes.BOOLEAN, defaultValue: false },
    winnerId: { type: DataTypes.INTEGER, allowNull: true },
    winnerPhone: { type: DataTypes.STRING, allowNull: true },
    inspectionPaid: { type: DataTypes.BOOLEAN, defaultValue: false },
    commissionPaid: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Bid = sequelize.define('Bid', {
    amount: { type: DataTypes.INTEGER, allowNull: false },
    userPhone: { type: DataTypes.STRING, allowNull: false }
});

const AutoBid = sequelize.define('AutoBid', {
    maxAmount: { type: DataTypes.INTEGER, allowNull: false }
});

const AdminLog = sequelize.define('AdminLog', {
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true }
});

const Transaction = sequelize.define('Transaction', {
    type: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true }
});

const Lead = sequelize.define('Lead', {
    type: { type: DataTypes.STRING, allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'new' }, 
});

// Связи
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

User.hasMany(Lead); 
Lead.belongsTo(User);

const smsCodes = new Map();

// --- Вспомогательная функция СМС ---
async function sendSms(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const SMS_RU_API_ID = process.env.SMS_RU_API_ID || '';
    if (!SMS_RU_API_ID) {
        console.log(`[СМС ЗАГЛУШКА] На ${phone}: ${message}`);
        return;
    }
    try {
        await fetch(`https://sms.ru/sms/send?api_id=${SMS_RU_API_ID}&to=${cleanPhone}&msg=${encodeURIComponent(message)}&json=1`);
    } catch (e) {
        console.error('Ошибка отправки СМС:', e);
    }
}

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

app.post('/api/upload', upload.fields([
    { name: 'photos', maxCount: 30 },
    { name: 'inspectionPdf', maxCount: 1 },
    { name: 'avtotekaPdf', maxCount: 1 }
]), (req, res) => {
    try {
        const photoUrls = req.files['photos'] ? req.files['photos'].map(file => `/uploads/${file.filename}`) : [];
        const inspectionUrl = req.files['inspectionPdf'] ? `/uploads/${req.files['inspectionPdf'][0].filename}` : '';
        const avtotekaUrl = req.files['avtotekaPdf'] ? `/uploads/${req.files['avtotekaPdf'][0].filename}` : '';
        res.json({ success: true, urls: photoUrls, inspectionPdf: inspectionUrl, avtotekaPdf: avtotekaUrl });
    } catch (error) { 
        console.error('Ошибка upload:', error);
        res.status(500).json({ error: 'Ошибка сохранения файлов' }); 
    }
});

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
        console.error('Ошибка сохранения документов:', error);
        res.status(500).json({ error: 'Ошибка сохранения' }); 
    }
});

// НОВЫЙ ЭНДПОИНТ: Получение свежих данных юзера (чтобы баланс обновился после возврата с ЮKassa)
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json({ success: true, user });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/auth/send-code', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Номер телефона обязателен' });

    const cleanPhone = phone.replace(/\D/g, '');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    smsCodes.set(phone, code); 
    console.log(`📩 СМС Код ${code} для ${phone}`);

    try {
        const SMS_RU_API_ID = process.env.SMS_RU_API_ID || ''; 
        if (!SMS_RU_API_ID) return res.json({ success: true, message: 'Тестовый режим (введите 0000)' });
        
        const response = await fetch(`https://sms.ru/sms/send?api_id=${SMS_RU_API_ID}&to=${cleanPhone}&msg=${code}&json=1`);
        const data = await response.json();
        
        if (data.status === "OK") {
            res.json({ success: true, message: 'СМС отправлено' });
        } else {
            console.error('Ошибка шлюза:', data);
            res.json({ success: true, message: 'Ошибка шлюза (0000)' });
        }
    } catch (error) { 
        console.error('Сбой сети при СМС:', error);
        res.json({ success: true, message: 'Локальный режим (0000)' }); 
    }
});

app.post('/api/auth/verify', async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Заполните поля' });

    const savedCode = smsCodes.get(phone);
    if (savedCode !== code && code !== '0000') return res.status(400).json({ error: 'Неверный код' });

    try {
        const [user, created] = await User.findOrCreate({
            where: { phone },
            defaults: { depositBalance: 0, isVerified: false, isBlocked: false, role: 'user', userType: 'individual' }
        });

        // 👑 СУПЕРАДМИН
        if (phone === '+7 (917) 207-49-39') {
            user.role = 'superadmin';
            user.isVerified = true;
            await user.save();
        }

        if (user.isBlocked) return res.status(403).json({ error: 'Аккаунт заблокирован' });
        
        smsCodes.delete(phone);
        res.json({ success: true, message: 'Успешный вход', user });
    } catch (error) { 
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ error: 'Ошибка сервера' }); 
    }
});

// ==========================================
// 💳 ИНТЕГРАЦИЯ ЮKASSA
// ==========================================
app.post('/api/payments/youkassa/create', async (req, res) => {
    try {
        console.log('🚀 [ЮKASSA] Пришел запрос на создание платежа!', req.body);
        
        const { userId, amount, userType, returnUrl, paymentType, lotId, description } = req.body;
        const user = await User.findByPk(userId);
        if (!user || user.isBlocked) return res.status(403).json({ error: 'Доступ запрещен' });

        const shopId = process.env.YOOKASSA_SHOP_ID;
        const secretKey = process.env.YOOKASSA_SECRET_KEY;
        if (!shopId || !secretKey) {
            console.error('❌ Ошибка: Ключи ЮKassa не найдены в .env файле!');
            return res.status(500).json({ error: 'ЮKassa не настроена' });
        }

        const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const idempotenceKey = Date.now().toString() + userId + Math.random();
        
        // Поддерживаем кастомное описание или старое
        let finalDescription = description || `Внесение гарантийного депозита РОЙ ТОРГ (${user.phone})`;
        if (paymentType === 'inspection') finalDescription = `Оплата осмотра техники (Лот ${lotId}) - ${user.phone}`;

        console.log(`💸 Стучимся в API ЮKassa на сумму ${amount} руб...`);

        const yooResponse = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: { 
                'Authorization': authHeader, 
                'Idempotence-Key': idempotenceKey, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                amount: { value: `${amount}.00`, currency: 'RUB' },
                capture: true, 
                confirmation: { 
                    type: 'redirect', 
                    return_url: returnUrl || 'https://roy-torg.ru/#profile' 
                },
                description: finalDescription,
                metadata: { userId: user.id, userType: userType || user.userType, paymentType: paymentType || 'deposit', lotId: lotId || null }
            })
        });

        const paymentData = await yooResponse.json();
        
        if (paymentData.confirmation && paymentData.confirmation.confirmation_url) {
            console.log('✅ Ссылка успешно получена!');
            // Отдаем confirmationUrl ровно так, как ждет фронтенд
            res.json({ success: true, confirmationUrl: paymentData.confirmation.confirmation_url });
        } else {
            console.error('❌ Ошибка от ЮKassa:', paymentData);
            res.status(500).json({ error: 'Ошибка платежного шлюза' });
        }
    } catch (error) { 
        console.error('❌ Сбой сети при запросе к ЮKassa:', error);
        res.status(500).json({ error: 'Ошибка сервера' }); 
    }
});

// Обновил URL вебхука, чтобы он совпадал с тем, что я просил вписать в личном кабинете ЮKassa
app.post('/api/payments/youkassa/webhook', async (req, res) => {
    try {
        const event = req.body;
        if (event.event === 'payment.succeeded') {
            const payment = event.object;
            const userId = payment.metadata.userId;
            const userType = payment.metadata.userType;
            const paymentType = payment.metadata.paymentType;
            const lotId = payment.metadata.lotId;
            const amount = Number(payment.amount.value);

            console.log(`🤑 [ЮKASSA] Успешная оплата! Пользователь ID: ${userId}, Сумма: ${amount}`);

            const user = await User.findByPk(userId);
            if (user) {
                if (paymentType === 'inspection' && lotId) {
                    const lot = await Lot.findByPk(lotId);
                    if (lot) {
                        lot.inspectionPaid = true;
                        await lot.save();
                        await recordTransaction(user.id, 'inspection_fee', -amount, `Оплата осмотра (Лот ${lot.lotNumber})`);
                        io.emit('updateLots', await Lot.findAll({ include: [Bid] }));
                    }
                } else {
                    user.userType = userType || user.userType;
                    user.depositBalance += amount;
                    
                    const requiredDeposit = user.userType === 'legal' ? 5000 : 3000;
                    if (user.depositBalance >= requiredDeposit) user.isVerified = true;
                    
                    await user.save();
                    await recordTransaction(user.id, 'topup', amount, `Оплата по ЮKassa (${payment.id})`);
                }
            }
        }
        res.status(200).send('OK'); 
    } catch (error) { 
        console.error('Ошибка Webhook ЮKassa:', error);
        res.status(500).send('Error'); 
    }
});

// ==========================================
// ЛИДЫ (ЗАЯВКИ)
// ==========================================
app.post('/api/leads', async (req, res) => {
    try {
        const { type, payload, userId } = req.body;
        const lead = await Lead.create({ type, payload, UserId: userId || null });
        res.json({ success: true, lead });
    } catch (error) { 
        console.error('Ошибка создания лида:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.get('/api/user/:userId/bids', async (req, res) => {
    try {
        const bids = await Bid.findAll({ 
            where: { UserId: req.params.userId }, 
            include: [{ model: Lot, include: [Bid] }] 
        });
        const lotsMap = new Map();
        bids.forEach(b => { 
            if(b.Lot && !lotsMap.has(b.Lot.id)) lotsMap.set(b.Lot.id, b.Lot); 
        });
        res.json({ success: true, lots: Array.from(lotsMap.values()) });
    } catch (error) { 
        console.error('Ошибка получения ставок юзера:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

// === АДМИНКА ===
app.get('/api/admin/leads', async (req, res) => {
    try {
        const leads = await Lead.findAll({ 
            include: [{ model: User, attributes: ['phone', 'userType'] }], 
            order: [['createdAt', 'DESC']] 
        });
        res.json({ success: true, leads });
    } catch (error) { 
        console.error('Ошибка получения лидов:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.patch('/api/admin/leads/:id/status', async (req, res) => {
    try {
        const { status, adminId } = req.body;
        const lead = await Lead.findByPk(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Заявка не найдена' });

        lead.status = status;
        await lead.save();
        res.json({ success: true, lead });
    } catch (error) { 
        console.error('Ошибка статуса лида:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.post('/api/lots', async (req, res) => {
    try {
        const { 
            auctionId, lotNumber, title, category, description, year, mileage, 
            currentPrice, minStep, reservePrice, estimatedValue, hasNds, 
            duration, durationType, startTime, images, mechanicRating, videoUrl,
            inspectionPdf, avtotekaPdf, sellerInn, isSecurityChecked, adminId
        } = req.body;
        
        const start = startTime ? new Date(startTime).getTime() : Date.now();
        const durationMs = durationType === 'hours' ? Number(duration) * 60 * 60 * 1000 : Number(duration) * 24 * 60 * 60 * 1000;
        
        const newLot = await Lot.create({
            auctionId: auctionId || `A-${new Date().getFullYear()}`,
            lotNumber: lotNumber || `L-${Math.floor(10000 + Math.random() * 90000)}`,
            title, 
            category: category || 'Тягачи', 
            description, 
            year: year ? Number(year) : null, 
            mileage,
            currentPrice: Number(currentPrice), 
            minStep: Number(minStep) || 50000,
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

        if (adminId) await logAdminAction(adminId, 'CREATE_LOT', `Создан лот: ${newLot.lotNumber}`);
        
        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) { 
        console.error('Ошибка создания лота:', error);
        res.status(500).json({ error: 'Ошибка сервера' }); 
    }
});

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
        console.error('Ошибка редактирования лота:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

// НОВЫЙ РОУТ: Подтверждение оплат Админом вручную
app.patch('/api/admin/lots/:id/payment-status', async (req, res) => {
    try {
        const { inspectionPaid, commissionPaid, adminId } = req.body;
        const lot = await Lot.findByPk(req.params.id);
        if (!lot) return res.status(404).json({ error: 'Лот не найден' });

        if (inspectionPaid !== undefined) lot.inspectionPaid = inspectionPaid;
        if (commissionPaid !== undefined) lot.commissionPaid = commissionPaid;
        await lot.save();
        
        if (adminId) await logAdminAction(adminId, 'UPDATE_LOT_PAYMENT', `Изменен статус оплат лота: ${lot.lotNumber}`);
        
        io.emit('updateLots', await Lot.findAll({ include: [Bid] }));
        res.json({ success: true, lot });
    } catch (error) { 
        console.error('Ошибка статуса оплат:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.post('/api/lots/:id/copy', async (req, res) => {
    try {
        const { adminId } = req.body; 
        const oldLot = await Lot.findByPk(req.params.id);
        if (!oldLot) return res.status(404).json({ error: 'Лот не найден' });

        // Жестко планируем на неделю вперед, чтобы лот гарантированно упал в "Запланированные"
        const newStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
        const newEnd = new Date(newStart.getTime() + 3 * 24 * 60 * 60 * 1000); // Торги на 3 дня
        
        const newLot = await Lot.create({ 
            ...oldLot.toJSON(), 
            id: undefined, 
            lotNumber: `L-${Math.floor(10000 + Math.random() * 90000)}`, 
            startTime: newStart,
            endTime: newEnd, 
            status: 'active',
            bidsCount: 0,
            winnerId: null,
            winnerPhone: null,
            inspectionPaid: false,
            commissionPaid: false
        });
        
        if (adminId) await logAdminAction(adminId, 'COPY_LOT', `Скопирован лот ${oldLot.lotNumber}`);

        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) { 
        console.error('Ошибка копирования лота:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.get('/api/admin/users', async (req, res) => {
    try { 
        res.json({ success: true, users: await User.findAll({ order: [['createdAt', 'DESC']] }) }); 
    } catch (error) { 
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.patch('/api/admin/users/:id/action', async (req, res) => {
    try {
        const { action, adminId } = req.body; 
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Юзер не найден' });

        if (action === 'verify') {
            user.isVerified = !user.isVerified;
        } else if (action === 'block') {
            if (user.role === 'superadmin') return res.status(403).json({ error: 'Нельзя блок Суперадмина' });
            user.isBlocked = !user.isBlocked;
        }
        await user.save();
        res.json({ success: true, users: await User.findAll({ order: [['createdAt', 'DESC']] }) });
    } catch (error) { 
        console.error('Ошибка изменения статуса:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.patch('/api/admin/users/:id/role', async (req, res) => {
    try {
        const { role, adminId } = req.body; 
        const superAdmin = await User.findByPk(adminId);
        if (!superAdmin || superAdmin.role !== 'superadmin') return res.status(403).json({ error: 'Нет прав' });

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Юзер не найден' });

        if (user.id === superAdmin.id) return res.status(403).json({ error: 'Себе нельзя' });
        
        user.role = role;
        await user.save();
        res.json({ success: true, users: await User.findAll({ order: [['createdAt', 'DESC']] }) });
    } catch (error) { 
        console.error('Ошибка назначения роли:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const superAdmin = await User.findByPk(req.query.adminId);
        if (!superAdmin || superAdmin.role !== 'superadmin') return res.status(403).json({ error: 'Запрещено' });
        
        const logs = await AdminLog.findAll({ 
            include: [{ model: User, as: 'Admin', attributes: ['phone', 'role'] }], 
            order: [['createdAt', 'DESC']] 
        });
        res.json({ success: true, logs });
    } catch (error) { 
        console.error('Ошибка получения логов:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.get('/api/admin/transactions', async (req, res) => {
    try { 
        res.json({ 
            success: true, 
            transactions: await Transaction.findAll({ include: [{ model: User }], order: [['createdAt', 'DESC']] }) 
        }); 
    } catch (error) { 
        console.error('Ошибка получения транзакций:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

app.get('/api/admin/export/users', async (req, res) => {
    try {
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        let csvContent = '\uFEFFID;Телефон;ИНН;Тип;Депозит;Роль;Верифицирован;Заблокирован;Регистрация\n';
        users.forEach(u => { 
            csvContent += `${u.id};${u.phone};${u.inn || 'Нет'};${u.userType};${u.depositBalance};${u.role};${u.isVerified ? 'Да' : 'Нет'};${u.isBlocked ? 'Да' : 'Нет'};${new Date(u.createdAt).toLocaleDateString('ru-RU')}\n`; 
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="roytorg_users.csv"');
        res.send(csvContent);
    } catch (error) { 
        console.error('Ошибка экспорта:', error);
        res.status(500).send('Ошибка'); 
    }
});

app.get('/api/admin/lot-report/:id', async (req, res) => {
    try {
        const lot = await Lot.findByPk(req.params.id, { include: [{ model: Bid, include: [User] }] });
        if (!lot) return res.status(404).json({ error: 'Лот не найден' });

        const sortedBids = lot.Bids.sort((a, b) => b.amount - a.amount);
        res.json({ 
            success: true, 
            report: { 
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
                bidsHistory: sortedBids.map(b => ({ amount: b.amount, phone: b.userPhone, time: new Date(b.createdAt).toLocaleString('ru-RU') })) 
            } 
        });
    } catch (error) { 
        console.error('Ошибка отчета PDF:', error);
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

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
        res.status(500).json({ error: 'Ошибка' }); 
    }
});

// === 4. АВТОБРОКЕР ===
async function triggerAutoBids(lotId) {
    try {
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
            const user = await User.findByPk(bestAutoBid.UserId);
            if (user.isBlocked || user.depositBalance < 49) return; 

            lot.currentPrice = requiredBid; 
            lot.bidsCount += 1;
            const timeRemaining = new Date(lot.endTime).getTime() - Date.now();
            if (timeRemaining > 0 && timeRemaining < 180000) lot.endTime = new Date(Date.now() + 180000); 
            await lot.save();

            user.depositBalance -= 49;
            const requiredDeposit = user.userType === 'legal' ? 5000 : 3000;
            if (user.depositBalance < requiredDeposit) user.isVerified = false;
            await user.save();
            
            await recordTransaction(user.id, 'bid_fee', -49, `Комиссия автоброкера (Лот ${lot.lotNumber})`);

            await Bid.create({ amount: requiredBid, LotId: lot.id, UserId: user.id, userPhone: user.phone });
            
            io.emit('updateLots', await Lot.findAll({ include: [Bid] }));
            if (prevLeaderId && prevLeaderId !== user.id) {
                io.emit('outbid', { previousUserId: prevLeaderId, lotId: lot.id, title: lot.title, newPrice: requiredBid });
                // СМС при перебитой ставке
                const prevUser = await User.findByPk(prevLeaderId);
                if (prevUser) sendSms(prevUser.phone, `ТОРГИ: Ваша ставка на лот ${lot.lotNumber} перебита. Новая цена: ${requiredBid} руб.`);
            }
            await triggerAutoBids(lot.id);
        }
    } catch (err) {
        console.error('Ошибка в логике Автоброкера:', err);
    }
}

// === 5. СОКЕТЫ ===
io.on('connection', async (socket) => {
    try { 
        socket.emit('updateLots', await Lot.findAll({ include: [Bid] })); 
    } catch (e) {
        console.error('Ошибка отправки лотов при подключении:', e);
    }

    socket.on('setupAutoBroker', async (data) => {
        try {
            const user = await User.findByPk(data.userId);
            if (!user || user.isBlocked) return socket.emit('bidError', { message: 'Заблокирован' });
            
            const requiredDeposit = user.userType === 'legal' ? 5000 : 3000;
            if (!user.isVerified && user.depositBalance < requiredDeposit) return socket.emit('bidError', { message: 'Пополните депозит' });
            if (user.depositBalance < 49) return socket.emit('bidError', { message: 'Нет 49 ₽ на ставку' });
            
            const lot = await Lot.findByPk(data.lotId);
            if (lot.status === 'completed' || data.maxAmount < lot.currentPrice + lot.minStep) return socket.emit('bidError', { message: 'Ошибка лимита' });

            user.depositBalance -= 49;
            if (user.depositBalance < requiredDeposit) user.isVerified = false;
            await user.save();
            await recordTransaction(user.id, 'bid_fee', -49, `Включение автоброкера (Лот ${lot.lotNumber})`);

            let autoBid = await AutoBid.findOne({ where: { LotId: data.lotId, UserId: data.userId } });
            if (autoBid) { 
                autoBid.maxAmount = data.maxAmount; 
                await autoBid.save(); 
            } else { 
                await AutoBid.create({ maxAmount: data.maxAmount, LotId: data.lotId, UserId: data.userId }); 
            }

            socket.emit('bidSuccess', { message: `Робот включен (списано 49 ₽)` });
            await triggerAutoBids(data.lotId);
        } catch (error) { 
            console.error('Ошибка сокета setupAutoBroker:', error);
            socket.emit('bidError', { message: 'Ошибка сервера' }); 
        }
    });

    socket.on('cancelAutoBroker', async (data) => {
        try { 
            await AutoBid.destroy({ where: { LotId: data.lotId, UserId: data.userId } }); 
            socket.emit('bidSuccess', { message: 'Автоброкер отключен' }); 
        } catch (error) {
            console.error('Ошибка отмены автоброкера:', error);
        }
    });

    socket.on('placeBid', async (data) => {
        try {
            const user = await User.findByPk(data.userId);
            if (!user || user.isBlocked) return socket.emit('bidError', { message: 'Заблокирован' });
            
            const requiredDeposit = user.userType === 'legal' ? 5000 : 3000;
            if (!user.isVerified && user.depositBalance < requiredDeposit) return socket.emit('bidError', { message: 'Пополните депозит' });
            if (user.depositBalance < 49) return socket.emit('bidError', { message: 'Нет 49 ₽ на ставку' });

            const lot = await Lot.findByPk(data.lotId);
            if (!lot || lot.status === 'completed' || new Date(lot.endTime).getTime() <= Date.now() || data.bidAmount < lot.currentPrice + lot.minStep) return socket.emit('bidError', { message: 'Ошибка ставки' });

            user.depositBalance -= 49;
            if (user.depositBalance < requiredDeposit) user.isVerified = false;
            await user.save();
            await recordTransaction(user.id, 'bid_fee', -49, `Ручная ставка (Лот ${lot.lotNumber})`);

            lot.currentPrice = data.bidAmount; 
            lot.bidsCount += 1;
            const timeRemaining = new Date(lot.endTime).getTime() - Date.now();
            if (timeRemaining > 0 && timeRemaining < 180000) lot.endTime = new Date(Date.now() + 180000); 
            await lot.save();
            await Bid.create({ amount: data.bidAmount, LotId: lot.id, UserId: user.id, userPhone: user.phone });

            const latestBid = await Bid.findOne({ where: { LotId: lot.id }, order: [['createdAt', 'DESC']] });
            const prevLeaderId = latestBid ? latestBid.UserId : null;

            io.emit('updateLots', await Lot.findAll({ include: [Bid] }));
            socket.emit('bidSuccess', { message: 'Ставка принята (списано 49 ₽)' });

            if (prevLeaderId && prevLeaderId !== user.id) {
                io.emit('outbid', { previousUserId: prevLeaderId, lotId: lot.id, title: lot.title, newPrice: data.bidAmount });
                // СМС при перебитой ставке
                const prevUser = await User.findByPk(prevLeaderId);
                if (prevUser) sendSms(prevUser.phone, `ТОРГИ: Ваша ставка на лот ${lot.lotNumber} перебита. Новая цена: ${data.bidAmount} руб.`);
            }
            await triggerAutoBids(lot.id);
        } catch (error) { 
            console.error('Ошибка сокета placeBid:', error);
            socket.emit('bidError', { message: 'Ошибка сервера' }); 
        }
    });
});

app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get(/^(?!\/(api|uploads)).*/, (req, res) => { 
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html')); 
});

async function startServer() {
    try {
        await sequelize.sync(); 
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Сервер РОЙ ТОРГ запущен на порту ${PORT}`);
            
            setInterval(async () => {
                try {
                    const expiredLots = await Lot.findAll({ 
                        where: { status: 'active', endTime: { [Op.lt]: new Date() } }, 
                        include: [Bid] 
                    });
                    
                    for (let lot of expiredLots) {
                        lot.status = 'completed'; 
                        await lot.save();
                        
                        const topBids = await Bid.findAll({ 
                            where: { LotId: lot.id }, 
                            order: [['amount', 'DESC']], 
                            limit: 3 
                        });
                        
                        if (topBids.length > 0) {
                            const winningAmount = topBids[0].amount;
                            const isReserveMet = !lot.reservePrice || winningAmount >= lot.reservePrice;
                            
                            // Сохраняем победителя в БД
                            lot.winnerId = topBids[0].UserId;
                            lot.winnerPhone = topBids[0].userPhone;
                            await lot.save();
                            
                            // Отправляем СМС Победителю
                            sendSms(topBids[0].userPhone, `Победа! Вы выиграли аукцион на лот ${lot.lotNumber}. Перейдите в ЛК для оплаты осмотра и завершения сделки.`);
                            
                            io.emit('winnerNotification', { 
                                lotId: lot.id, 
                                title: lot.title, 
                                winnerPhone: topBids[0].userPhone, 
                                winnerUserId: topBids[0].UserId, 
                                managerPhone: '+7 (921) 123-45-67', 
                                reserveMet: isReserveMet, 
                                commissionAmount: Math.round(winningAmount * 0.03) 
                            });
                        }
                    }
                    if (expiredLots.length > 0) {
                        io.emit('updateLots', await Lot.findAll({ include: [Bid] }));
                    }
                } catch (err) {
                    console.error('Ошибка в цикле проверки торгов (CRON):', err);
                }
            }, 10000); 
        });
    } catch (error) {
        console.error('Критическая ошибка запуска:', error);
    }
}

startServer();