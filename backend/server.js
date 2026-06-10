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

// === 2. МОДЕЛИ ===
const User = sequelize.define('User', {
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    inn: { type: DataTypes.STRING, allowNull: true },
    depositBalance: { type: DataTypes.INTEGER, defaultValue: 0 },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    // НОВЫЕ ПОЛЯ ДЛЯ МОДЕРАЦИИ И ДОКУМЕНТОВ
    isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false },
    passportPdf: { type: DataTypes.STRING, defaultValue: '' },
    companyPdf: { type: DataTypes.STRING, defaultValue: '' }
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
    inspectionPdf: { type: DataTypes.STRING, defaultValue: '' }, // Ссылка на акт осмотра
    avtotekaPdf: { type: DataTypes.STRING, defaultValue: '' },   // Ссылка на автотеку
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    // НОВЫЕ ПОЛЯ: Безопасность продавца
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

User.hasMany(Bid);
Bid.belongsTo(User);
Lot.hasMany(Bid);
Bid.belongsTo(Lot);
User.hasMany(AutoBid);
AutoBid.belongsTo(User);
Lot.hasMany(AutoBid);
AutoBid.belongsTo(Lot);

const smsCodes = new Map();

// === 3. REST API ===

// Мульти-загрузка: фото + PDF
app.post('/api/upload', upload.fields([
    { name: 'photos', maxCount: 30 },
    { name: 'inspectionPdf', maxCount: 1 },
    { name: 'avtotekaPdf', maxCount: 1 }
]), (req, res) => {
    try {
        console.log('📥 Поступил запрос на загрузку файлов лота:', req.files);
        
        // Используем относительные пути, чтобы избежать проблем с IP/доменом
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

// НОВЫЙ РОУТ: Загрузка документов пользователя из Личного Кабинета
app.post('/api/user/:id/documents', upload.fields([
    { name: 'passportPdf', maxCount: 1 },
    { name: 'companyPdf', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log(`📥 Загрузка документов для юзера ${req.params.id}`);
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (req.files['passportPdf']) {
            user.passportPdf = `/uploads/${req.files['passportPdf'][0].filename}`;
        }
        if (req.files['companyPdf']) {
            user.companyPdf = `/uploads/${req.files['companyPdf'][0].filename}`;
        }
        
        await user.save();
        res.json({ success: true, user });
    } catch (error) {
        console.error('❌ Ошибка загрузки документов юзера:', error);
        res.status(500).json({ error: 'Ошибка при сохранении документов' });
    }
});

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
            console.log(`✅ СМС успешно отправлено через sms.ru! Баланс: ${data.balance} руб.`);
            res.json({ success: true, message: 'СМС отправлено' });
        } else {
            console.error('❌ Ошибка от sms.ru:', data);
            // Если баланс кончился или ошибка API, падаем в демо-режим, чтобы не блочить работу
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
            defaults: { depositBalance: 0, isVerified: false, isBlocked: false }
        });
        
        // Проверка на блокировку при входе
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

app.post('/api/topup', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        
        // Проверка на блокировку при пополнении
        if (user.isBlocked) return res.status(403).json({ error: 'Действие запрещено. Аккаунт заблокирован.' });

        user.depositBalance += Number(amount);
        if (user.depositBalance >= 5000) user.isVerified = true;
        await user.save();
        res.json({ success: true, user });
    } catch (error) {
        console.error('Ошибка пополнения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/lots', async (req, res) => {
    try {
        const { 
            auctionId, lotNumber, title, description, year, mileage, 
            currentPrice, minStep, reservePrice, estimatedValue, hasNds, 
            duration, durationType, startTime, images, mechanicRating, videoUrl,
            inspectionPdf, avtotekaPdf, sellerInn, isSecurityChecked
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

        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) {
        console.error('Ошибка создания лота:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/user/:userId/bids', async (req, res) => {
    try {
        const bids = await Bid.findAll({ where: { UserId: req.params.userId }, include: [{ model: Lot, include: [Bid] }] });
        const lotsMap = new Map();
        bids.forEach(b => { if(b.Lot && !lotsMap.has(b.Lot.id)) lotsMap.set(b.Lot.id, b.Lot); });
        res.json({ success: true, lots: Array.from(lotsMap.values()) });
    } catch (error) {
        console.error('Ошибка истории:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// НОВЫЙ РОУТ АДМИНКИ: Получить всех пользователей
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['updatedAt'] }
        });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// НОВЫЙ РОУТ АДМИНКИ: Модерация (бан/верификация)
app.patch('/api/admin/users/:id/action', async (req, res) => {
    try {
        const { action } = req.body; 
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (action === 'verify') {
            user.isVerified = !user.isVerified;
        } else if (action === 'block') {
            user.isBlocked = !user.isBlocked;
        }
        
        await user.save();
        
        // Возвращаем обновленный список всех пользователей
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Ошибка модерации пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
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
        res.status(500).json({ error: 'Ошибка statistics' });
    }
});

app.post('/api/lots/:id/copy', async (req, res) => {
    try {
        const oldLot = await Lot.findByPk(req.params.id);
        if (!oldLot) return res.status(404).json({ error: 'Лот не найден' });
        const newLot = await Lot.create({
            ...oldLot.toJSON(), id: undefined,
            lotNumber: `L-${Math.floor(10000 + Math.random() * 90000)} (копия)`,
            title: oldLot.title + ' (повтор)',
            endTime: new Date(Date.now() + 86400000), status: 'active'
        });
        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) {
        console.error('Ошибка при дублировании:', error);
        res.status(500).json({ error: 'Ошибка при копировании' });
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
        
        // Предохранитель: заблокированный юзер не может делать автоставки
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

            // Блокировка автоброкера для забаненных
            if (user.isBlocked) {
                return socket.emit('bidError', { message: 'Ваш аккаунт заблокирован администратором' });
            }

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
            console.error(error);
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
            
            // Блокировка ставок для забаненных
            if (user.isBlocked) {
                return socket.emit('bidError', { message: 'Действие запрещено. Аккаунт заблокирован.' });
            }

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
            console.error('Ошибка ставки:', error);
            socket.emit('bidError', { message: 'Ошибка сервера' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Отключился: ${socket.id}`);
    });
});

// === 6. РАЗДАЧА ФРОНТЕНДА (КРИТИЧЕСКИ ВАЖНО) ===
const frontendPath = path.join(__dirname, '../frontend/build');
console.log('📦 Подключение папки с фронтендом:', frontendPath);

app.use(express.static(frontendPath));

// ИСПРАВЛЕНИЕ: Добавлено (api|uploads) чтобы не блокировать картинки!
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
        // ВАЖНО: alter: true мягко добавит новые колонки в базу, сохранив старые данные
        await sequelize.sync({ alter: true }); 
        console.log('✅ База данных готова (Синхронизация завершена)');

        const PORT = process.env.PORT || 80;
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
                        
                        console.log(`🏁 Аукцион ${lot.lotNumber} официально завершен сервером.`);
                        
                        if (topBids.length > 0) {
                            const winningAmount = topBids[0].amount;
                            const isReserveMet = !lot.reservePrice || winningAmount >= lot.reservePrice;
                            const computedCommission = Math.round(winningAmount * 0.03);

                            if (!isReserveMet) {
                                console.log(`⚠️ Резервная цена не достигнута. Лот ${lot.lotNumber} переходит в формат переговоров.`);
                            }

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