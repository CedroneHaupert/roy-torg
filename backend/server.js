require('dotenv').config(); // Загружаем секреты из файла .env

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// === 0. НАСТРОЙКА ХРАНИЛИЩА ФАЙЛОВ (MULTER) ===
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === 1. БАЗА ДАННЫХ (УМНАЯ НАСТРОЙКА) ===
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
        storage: './roytorg.sqlite', 
        logging: false 
    });
    console.log('🔗 Режим: DEVELOPMENT (SQLite)');
}

// === 2. МОДЕЛИ (ТАБЛИЦЫ В БАЗЕ) ===
const User = sequelize.define('User', {
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    inn: { type: DataTypes.STRING, allowNull: true },
    depositBalance: { type: DataTypes.INTEGER, defaultValue: 0 },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false }
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
    reservePrice: { type: DataTypes.INTEGER, allowNull: true },     // Минимально желаемая цена контрагента
    estimatedValue: { type: DataTypes.INTEGER, allowNull: true },   // Независимая рыночная оценка платформы (ярко горит на фронте)
    startTime: { type: DataTypes.DATE, allowNull: true },
    endTime: { type: DataTypes.DATE, allowNull: false },
    bidsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    hasNds: { type: DataTypes.BOOLEAN, defaultValue: true },
    imageUrl: { type: DataTypes.STRING, defaultValue: '' },
    images: { type: DataTypes.JSON, defaultValue: [] },
    mechanicRating: { type: DataTypes.INTEGER, defaultValue: 8 },
    videoUrl: { type: DataTypes.STRING, defaultValue: '' },
    status: { type: DataTypes.STRING, defaultValue: 'active' }
});

const Bid = sequelize.define('Bid', {
    amount: { type: DataTypes.INTEGER, allowNull: false },
    userPhone: { type: DataTypes.STRING, allowNull: false }
});

const AutoBid = sequelize.define('AutoBid', {
    maxAmount: { type: DataTypes.INTEGER, allowNull: false }
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

// Временное хранилище СМС
const smsCodes = new Map();

// === 3. REST API МАРШРУТЫ ===
app.post('/api/upload', upload.array('photos', 30), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Файлы не найдены' });
        }
        const baseUrl = process.env.NODE_ENV === 'production' ? 'http://37.252.19.74:5001' : `http://localhost:${process.env.PORT || 5001}`;
        const fileUrls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
        res.json({ success: true, urls: fileUrls });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при сохранении файлов' });
    }
});

// ОТПРАВКА СМС
app.post('/api/auth/send-code', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Номер телефона обязателен' });

    const cleanPhone = phone.replace(/\D/g, '');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    smsCodes.set(phone, code); 

    console.log(`\n=============================`);
    console.log(`📩 [СМС ШЛЮЗ] Подготовка сообщения на ${phone}`);
    console.log(`🔑 КОД ПОДТВЕРЖДЕНИЯ ДЛЯ ТЕСТА: ${code}`);
    console.log(`=============================\n`);

    try {
        const SMS_RU_API_ID = process.env.SMS_RU_API_ID || 'C44CE6B9-CF6F-B42C-8F39-5F51EE55D681';
        const response = await fetch(`https://sms.ru/sms/send?api_id=${SMS_RU_API_ID}&to=${cleanPhone}&msg=${code}&json=1`);
        const data = await response.json();

        if (data.status === "OK") {
            console.log(`✅ СМС успешно отправлено через sms.ru! Баланс: ${data.balance} руб.`);
            res.json({ success: true, message: 'СМС отправлено' });
        } else {
            console.error('❌ Ошибка от sms.ru:', data);
            // Возвращаем true, чтобы даже при проблемах с шлюзом до прохождения операторов, Лэндинг переключался на шаг ввода кода 0000
            res.json({ success: true, message: 'Включен режим тестирования (введите 0000)' });
        }
    } catch (error) {
        // Защита: если нет интернета или шлюз лежит, даем зайти по 0000
        res.json({ success: true, message: 'Локальный режим (введите 0000)' });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Телефон и код обязательны' });

    const savedCode = smsCodes.get(phone);
    // Проверка мастер-кода 0000 для обхода операторской блокировки Оксаны
    if (savedCode !== code && code !== '0000') {
        return res.status(400).json({ error: 'Неверный код подтверждения' });
    }

    try {
        const [user, created] = await User.findOrCreate({
            where: { phone },
            defaults: { depositBalance: 0, isVerified: false }
        });
        smsCodes.delete(phone);
        res.json({ success: true, message: created ? 'Пользователь зарегистрирован' : 'Успешный вход', user });
    } catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/topup', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        user.depositBalance += Number(amount);
        if (user.depositBalance >= 5000) user.isVerified = true;
        await user.save();
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/lots', async (req, res) => {
    try {
        const { 
            auctionId, lotNumber, title, description, year, mileage, 
            currentPrice, minStep, reservePrice, estimatedValue, hasNds, duration, durationType, startTime,
            images, mechanicRating, videoUrl
        } = req.body;
        
        const start = startTime ? new Date(startTime).getTime() : Date.now();
        const durationMs = durationType === 'hours' ? Number(duration) * 60 * 60 * 1000 : Number(duration) * 24 * 60 * 60 * 1000;
        const mainImage = (images && images.length > 0) ? images[0] : '';

        const newLot = await Lot.create({
            auctionId: auctionId || 'A-2026-05',
            lotNumber: lotNumber || `L-${Math.floor(10000 + Math.random() * 90000)}`,
            title, description, year: year ? Number(year) : null, mileage,
            currentPrice: Number(currentPrice), minStep: Number(minStep) || 50000,
            reservePrice: reservePrice ? Number(reservePrice) : null,
            estimatedValue: estimatedValue ? Number(estimatedValue) : null, // Записываем рыночную оценку площадки
            startTime: startTime ? new Date(startTime) : null,
            endTime: new Date(start + durationMs),
            hasNds,
            imageUrl: mainImage,
            images: images || [],
            status: 'active',
            mechanicRating: mechanicRating ? Number(mechanicRating) : 8,
            videoUrl: videoUrl || ''
        });

        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
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
        res.status(500).json({ error: 'Ошибка сервера при получении истории' });
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

        res.json({
            totalUsers,
            activeLots,
            completedLots,
            frequentBidders: frequentBidders.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка statistics' });
    }
});

app.post('/api/lots/:id/copy', async (req, res) => {
    try {
        const oldLot = await Lot.findByPk(req.params.id);
        if (!oldLot) return res.status(404).json({ error: 'Лот не найден' });

        const newLot = await Lot.create({
            auctionId: oldLot.auctionId,
            lotNumber: `L-${Math.floor(10000 + Math.random() * 90000)} (копия)`,
            title: oldLot.title + ' (повтор)',
            description: oldLot.description,
            year: oldLot.year,
            mileage: oldLot.mileage,
            currentPrice: oldLot.currentPrice,
            minStep: oldLot.minStep,
            reservePrice: oldLot.reservePrice,
            estimatedValue: oldLot.estimatedValue, // Переносим рыночную оценку при дублировании лота
            endTime: new Date(Date.now() + 86400000), 
            hasNds: oldLot.hasNds,
            imageUrl: oldLot.imageUrl,
            images: oldLot.images,
            status: 'active',
            mechanicRating: oldLot.mechanicRating,
            videoUrl: oldLot.videoUrl
        });
        
        const updatedLots = await Lot.findAll({ include: [Bid] });
        io.emit('updateLots', updatedLots);
        res.json({ success: true, lot: newLot });
    } catch (error) {
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
        if (timeRemaining > 0 && timeRemaining < 180000) {
            lot.endTime = new Date(Date.now() + 180000); 
        }
        await lot.save();

        const user = await User.findByPk(bestAutoBid.UserId);
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
            if (!user || (!user.isVerified && user.depositBalance < 5000)) return socket.emit('bidError', { message: 'Внесите депозит 5000 ₽' });

            const lot = await Lot.findByPk(lotId);
            if (lot.status === 'completed') return socket.emit('bidError', { message: 'Торги завершены!' });
            if (maxAmount < lot.currentPrice + lot.minStep) return socket.emit('bidError', { message: 'Лимит робота должен быть выше текущей цены + шаг!' });

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
            socket.emit('bidError', { message: 'Ошибка установки автоброкера' });
        }
    });

    socket.on('cancelAutoBroker', async (data) => {
        const { lotId, userId } = data;
        await AutoBid.destroy({ where: { LotId: lotId, UserId: userId } });
        socket.emit('bidSuccess', { message: 'Автоброкер успешно отключен' });
    });

    socket.on('placeBid', async (data) => {
        const { lotId, bidAmount, userId } = data;
        
        try {
            const user = await User.findByPk(userId);
            if (!user) return socket.emit('bidError', { message: 'Пожалуйста, авторизуйтесь!' });
            if (!user.isVerified && user.depositBalance < 5000) return socket.emit('bidError', { message: 'Внесите депозит 5000 ₽' });

            const lot = await Lot.findByPk(lotId);
            if (!lot || lot.status === 'completed' || new Date(lot.endTime).getTime() <= Date.now()) {
                return socket.emit('bidError', { message: 'Торги уже завершены!' });
            }

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
                socket.emit('bidSuccess', { message: 'Ставка успешно принята!' });

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

// === 6. ЗАПУСК БАЗЫ ДАННЫХ И СЕРВЕРА ===
// Раздача React-приложения через Node.js (заменяет Nginx)
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

async function startServer() {
    try {
        // ВНИМАНИЕ: { force: false } чтобы при случайном переклике PM2 база данных НЕ очищалась полностью, сохраняя лоты и пользователей боевого сервера.
        await sequelize.sync({ force: false }); 
        console.log('✅ База данных синхронизирована');

        // Создаем демо-лоты только если таблица пустая
        const count = await Lot.count();
        if (count === 0) {
            await Lot.create({
                auctionId: 'A-2026-05',
                lotNumber: 'L-54321',
                title: 'Седельный тягач KAMAZ 5490 NEO',
                description: 'Отличное состояние, один владелец. Своевременный сервис в официальном дилерском центре.',
                year: 2021,
                mileage: '284 000 км',
                currentPrice: 4250000,
                minStep: 50000,
                reservePrice: 4500000,     // Резервная цена контрагента
                estimatedValue: 4800000,   // Зеленая яркая рыночная оценка
                endTime: new Date(Date.now() + 86400000), 
                hasNds: true
            });

            await Lot.create({
                auctionId: 'A-2026-05',
                lotNumber: 'L-98765',
                title: 'Полуприцеп шторный ТОНАР T3-13',
                description: 'Требует небольшого косметического ремонта тента. Оси в идеале, резина свежая.',
                year: 2020,
                mileage: 'Без пробега по РФ',
                currentPrice: 650000,
                minStep: 20000,
                reservePrice: 750000,
                estimatedValue: 950000,
                endTime: new Date(Date.now() + 600000), // Закончится через 10 минут для тестов
                hasNds: true
            });
        }

        const PORT = process.env.PORT || 5001;
        server.listen(PORT, () => {
            console.log(`🚀 Сервер РОЙ ТОРГ запущен на порту ${PORT}`);
            
            // === 7. ФОНОВЫЕ ЗАДАЧИ (CRON-УВЕДОМЛЕНИЯ ОБ ОФЕРТЕ) ===
            setInterval(async () => {
                try {
                    const expiredLots = await Lot.findAll({
                        where: {
                            status: 'active',
                            endTime: { [Op.lt]: new Date() }
                        },
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
                        
                        console.log(`🏁 Аукцион ${lot.lotNumber} официально завершен сервером.`);
                        
                        if (topBids.length > 0) {
                            const winningAmount = topBids[0].amount;
                            // Проверяем, выполнено ли условие резервной цены контрагента
                            const isReserveMet = !lot.reservePrice || winningAmount >= lot.reservePrice;
                            // Считаем 3% невозвратной комиссии от итоговой ставки для перехода к ДКП
                            const computedCommission = Math.round(winningAmount * 0.03);

                            if (!isReserveMet) {
                                console.log(`⚠️ Резервная цена не достигнута. Лот ${lot.lotNumber} переходит в формат переговоров.`);
                            }

                            io.emit('winnerNotification', { 
                                lotId: lot.id, 
                                title: lot.title,
                                winnerPhone: topBids[0].userPhone,
                                winnerUserId: topBids[0].UserId,
                                managerPhone: '+7 (921) 123-45-67', // Контакт личного куратора сделки в СПБ
                                reserveMet: isReserveMet,          // Сигнал фронтенду: сделка или переговоры
                                commissionAmount: computedCommission // Сумма 3% к оплате на Р/С
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
            }, 10000); // Проверка каждые 10 секунд
        });

    } catch (error) {
        console.error('Критическая ошибка при запуске бэкенда:', error);
    }
}

// Запускаем весь процесс
startServer();