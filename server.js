const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// 홈 랜딩 및 모달 라우터 불러오기
const homeRouter = require('./home');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.memoryStorage() });

// 1. MongoDB 연결
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('✅ MongoDB Atlas 연결 성공!');
        await User.updateMany(
            { "alertSettings.useImage": { $exists: false } },
            { $set: { "alertSettings.useImage": true, "alertSettings.useReaction": true } }
        );
    })
    .catch((err) => console.error('❌ MongoDB 연결 에러:', err));

// 유저 스키마
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    apiKey: { type: String, required: true, unique: true },
    alertSettings: {
        soundType: { type: String, default: 'coinsound.mp3' },
        duration: { type: Number, default: 10 },
        fontSize: { type: String, default: '8vh' },
        fontFamily: { type: String, default: 'Jalnan2, sans-serif' },
        fontColor: { type: String, default: '#ffffff' },
        borderColor: { type: String, default: '#000000' },
        borderWidth: { type: String, default: '2px' },
        effect: { type: String, default: 'letter-wave' },
        layoutType: { type: String, default: 'default' },
        useImage: { type: Boolean, default: true }
    },
    menuSettings: {
        textColor: { type: String, default: '#ff2a85' },
        fontSize: { type: String, default: '24px' },
        fontFamily: { type: String, default: 'Apple SD Gothic Neo, "Malgun Gothic", sans-serif' },
        effect: { type: String, default: 'modern-glow' },
        borderColor: { type: String, default: '#000000' },
        borderWidth: { type: String, default: '0px' },
        scrollMode: { type: String, default: 'page' },
        scrollInterval: { type: Number, default: 3 }
    }
});

// 후원 스키마
const donationSchema = new mongoose.Schema({
    streamerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nickname: { type: String, default: "익명" },
    amount: { type: Number, default: 0 },
    message: { type: String, default: "" },
    datetime: { type: String, required: true },
    dateKey: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// 리액션 설정 스키마
const reactionSchema = new mongoose.Schema({
    streamerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: "기본 리액션" },
    amount: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    audioUrl: { type: String, default: "" }
});

const User = mongoose.model('User', userSchema);
const Donation = mongoose.model('Donation', donationSchema);
const Reaction = mongoose.model('Reaction', reactionSchema);

function getKSTDateTime() {
    return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getKSTDateKey() {
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().split('T')[0];
}

// 홈 루트 라우터 연결
app.use('/', homeRouter);

// 회원가입 처리 API (백틱 추가 수정)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const apiKey = 'sely_' + crypto.randomBytes(16).toString('hex');
        const newUser = new User({ username, password, apiKey });
        await newUser.save();
        res.send(`<script>alert('회원가입 성공! 발급된 계정으로 로그인해주세요.'); location.href = '/login';</script>`);
    } catch (e) {
        res.send(`<script>alert('회원가입 실패 (중복된 아이디일 수 있습니다)'); history.back();</script>`);
    }
});

// 메뉴판 설정 저장 API
app.post('/api/settings/menu/:apiKey', async (req, res) => {
    try {
        const { textColor, fontSize, fontFamily, effect, borderColor, borderWidth, scrollMode, scrollInterval } = req.body;
        const user = await User.findOneAndUpdate(
            { apiKey: req.params.apiKey },
            { $set: { 
                'menuSettings.textColor': textColor, 
                'menuSettings.fontSize': fontSize, 
                'menuSettings.fontFamily': fontFamily, 
                'menuSettings.effect': effect, 
                'menuSettings.borderColor': borderColor, 
                'menuSettings.borderWidth': borderWidth, 
                'menuSettings.scrollMode': scrollMode, 
                'menuSettings.scrollInterval': Number(scrollInterval) || 3 
            }},
            { new: true }
        );
        if (!user) return res.status(404).json({ success: false, error: 'Streamer not found' });
        res.json({ success: true, message: '메뉴판 설정이 저장되었습니다.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// 알림창 설정 저장 API
app.post('/api/settings/alert/:apiKey', async (req, res) => {
    try {
        const { layoutType, fontSize, fontFamily, fontColor, borderColor, borderWidth, effect } = req.body;
        const user = await User.findOneAndUpdate(
            { apiKey: req.params.apiKey },
            { $set: { 
                'alertSettings.layoutType': layoutType, 
                'alertSettings.fontSize': fontSize, 
                'alertSettings.fontFamily': fontFamily, 
                'alertSettings.fontColor': fontColor, 
                'alertSettings.borderColor': borderColor, 
                'alertSettings.borderWidth': borderWidth, 
                'alertSettings.effect': effect 
            }},
            { new: true }
        );
        if (!user) return res.status(404).json({ success: false, error: 'Streamer not found' });
        res.json({ success: true, message: '알림창 설정이 저장되었습니다.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// 로그인 및 대시보드 UI (백틱 누락 및 구문 오류 수정)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.send(`<script>alert('아이디 또는 비밀번호가 틀렸습니다.'); history.back();</script>`);
        }

        let reactions = [];
        try {
            reactions = await Reaction.find({ streamerId: user._id }).sort({ amount: 1 });
        } catch (err) {
            console.error("리액션 조회 에러:", err);
        }

        const menuSettings = user.menuSettings || {
            textColor: '#ff2a85',
            fontSize: '24px',
            fontFamily: 'Apple SD Gothic Neo, "Malgun Gothic", sans-serif',
            effect: 'modern-glow',
            borderColor: '#000000',
            borderWidth: '0px',
            scrollMode: 'page',
            scrollInterval: 3
        };

        const alertSettings = user.alertSettings || {
            layoutType: 'default',
            fontSize: '8vh',
            fontFamily: 'Jalnan2, sans-serif',
            fontColor: '#ffffff',
            borderColor: '#000000',
            borderWidth: '2px',
            effect: 'letter-wave'
        };

        res.send(`<!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>슬네이션 - 대시보드</title>
            <style>
                body { font-family: sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
                .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .api-key-box { background: #eee; padding: 15px; border-radius: 6px; word-break: break-all; margin: 20px 0; font-family: monospace; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>환영합니다, ${user.username}님! 🎉</h1>
                <p>스트리머 전용 연동 API 키입니다:</p>
                <div class="api-key-box">${user.apiKey}</div>
                <p><a href="/overlay/${user.apiKey}" target="_blank">OBS 알림 오버레이 링크 보기</a></p>
                <p><a href="/menu-overlay/${user.apiKey}" target="_blank">메뉴판 오버레이 링크 보기</a></p>
            </div>
        </body>
        </html>`);
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

// 📋 메뉴판 오버레이 엔드포인트
app.get('/menu-overlay/:apiKey', async (req, res) => {
    try {
        const { apiKey } = req.params;
        const user = await User.findOne({ apiKey });
        if (!user) return res.status(404).send('Streamer not found');

        const reactions = await Reaction.find({ streamerId: user._id }).sort({ amount: 1 });
        const menuSettings = user.menuSettings || {
            textColor: '#ff2a85',
            fontSize: '24px',
            fontFamily: 'Jalnan2, sans-serif',
            effect: 'modern-glow',
            borderColor: '#000000',
            borderWidth: '0px',
            scrollMode: 'page',
            scrollInterval: 3
        };

        const bw = menuSettings.borderWidth || '0px';
        const bc = menuSettings.borderColor || '#000000';
        const tc = menuSettings.textColor;
        const effect = menuSettings.effect;
        const scrollMode = menuSettings.scrollMode || 'page';
        const intervalSec = menuSettings.scrollInterval || 3;
        
        let extraStyle = `-webkit-font-smoothing: antialiased;`;

        if (bw !== '0px' && bw !== '0') {
            extraStyle += ` -webkit-text-stroke: ${bw} ${bc}; paint-order: fill stroke;`;
        }

        if (effect === 'modern-glow') {
            extraStyle += ` text-shadow: 0 0 2px #ffffff, 0 0 8px ${tc}, 0 0 16px ${tc};`;
        } else if (effect === 'soft-shadow') {
            extraStyle += ` text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5), 0 0 10px ${tc};`;
        } else if (effect === 'clean-flat') {
            extraStyle += ` text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);`;
        } else if (effect === 'rainbow') {
            extraStyle += ` text-shadow: 0 0 4px #ffffff, 0 0 10px #ff0055, 0 0 20px #ff9900, 0 0 30px #33ccff;`;
        } else if (effect === 'gold') {
            extraStyle += ` text-shadow: 0 0 4px #ffffff, 0 0 12px #ffd700, 2px 2px 4px rgba(0,0,0,0.9);`;
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>SelyPay Menu Overlay</title>
                <link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@700;900&display=swap" rel="stylesheet">
                <style>
                    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
                    @font-face {
                        font-family: 'Jalnan2';
                        src: url('/Jalnan2TTF.ttf') format('truetype');
                        font-weight: normal;
                        font-style: normal;
                    }
                    body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; font-family: ${menuSettings.fontFamily}; height: 100vh; width: 100vw; }
                    #menu-container { display: flex; flex-direction: column; gap: 10px; width: fit-content; padding: 10px; }
                    .menu-row { color: ${tc}; font-size: ${menuSettings.fontSize}; font-weight: 800; letter-spacing: -0.5px; ${extraStyle} white-space: nowrap; }
                    @keyframes scrollTicker { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
                    .ticker-wrapper { overflow: hidden; height: 100vh; width: 100vw; position: relative; }
                    .ticker-content { display: flex; flex-direction: column; gap: 10px; position: absolute; width: fit-content; padding: 10px; }
                </style>
            </head>
            <body>
                <div id="app"></div>
                <script>
                    const reactions = ${JSON.stringify(reactions)};
                    const mode = "${scrollMode}";
                    const intervalTime = ${intervalSec} * 1000;
                    const app = document.getElementById('app');

                    if (reactions.length === 0) {
                        app.innerHTML = '<div style="padding:10px;" class="menu-row" style="color:#aaa; font-size:16px;">등록된 리액션이 없습니다.</div>';
                    } else {
                        const rowsHTML = reactions.map(r => 
                            '<div class="menu-row">' + r.name + '<span style="display:inline-block; width: 1.5em;"></span>' + r.amount.toLocaleString() + '원</div>'
                        ).join('');

                        if (mode === 'ticker') {
                            app.className = 'ticker-wrapper';
                            app.innerHTML = '<div class="ticker-content">' + rowsHTML + rowsHTML + '</div>';
                            setTimeout(() => {
                                const content = app.querySelector('.ticker-content');
                                const totalHeight = content.scrollHeight / 2;
                                if (totalHeight > window.innerHeight) {
                                    const duration = totalHeight / 35;
                                    content.style.animation = 'scrollTicker ' + duration + 's linear infinite';
                                }
                            }, 100);
                        } else {
                            app.innerHTML = '<div id="menu-container"></div>';
                            const container = document.getElementById('menu-container');
                            let pages = [];
                            let currentPageItems = [];
                            const measureDiv = document.createElement('div');
                            measureDiv.className = 'menu-row';
                            measureDiv.style.visibility = 'hidden';
                            measureDiv.style.position = 'absolute';
                            document.body.appendChild(measureDiv);

                            function buildPages() {
                                pages = [];
                                currentPageItems = [];
                                const maxH = window.innerHeight - 20;
                                let currentH = 0;
                                const gap = 10;
                                reactions.forEach((r) => {
                                    measureDiv.innerHTML = r.name + '<span style="display:inline-block; width: 1.5em;"></span>' + r.amount.toLocaleString() + '원';
                                    const itemH = measureDiv.getBoundingClientRect().height;
                                    if (currentPageItems.length > 0 && (currentH + gap + itemH > maxH)) {
                                        pages.push(currentPageItems);
                                        currentPageItems = [r];
                                        currentH = itemH;
                                    } else {
                                        currentPageItems.push(r);
                                        currentH += (currentPageItems.length === 1 ? itemH : gap + itemH);
                                    }
                                });
                                if (currentPageItems.length > 0) pages.push(currentPageItems);
                            }

                            buildPages();
                            if (document.body.contains(measureDiv)) document.body.removeChild(measureDiv);

                            let pageIndex = 0;
                            function renderPage() {
                                if (pages.length === 0) return;
                                const items = pages[pageIndex];
                                container.innerHTML = items.map(r => 
                                    '<div class="menu-row">' + r.name + '<span style="display:inline-block; width: 1.5em;"></span>' + r.amount.toLocaleString() + '원</div>'
                                ).join('');
                                pageIndex = (pageIndex + 1) % pages.length;
                            }

                            renderPage();
                            let timer = null;
                            if (pages.length > 1) timer = setInterval(renderPage, intervalTime);

                            window.addEventListener('resize', () => {
                                if (timer) clearInterval(timer);
                                buildPages();
                                pageIndex = 0;
                                renderPage();
                                if (pages.length > 1) timer = setInterval(renderPage, intervalTime);
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send('Menu Overlay Error');
    }
});

// 회원가입 페이지 라우트 (백틱 추가 수정)
app.get('/register', (req, res) => {
    res.send(`<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>스트리머 회원가입</title></head>
    <body style="font-family:sans-serif; background:#f4f7f6; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
        <div style="background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); width:300px;">
            <h2>스트리머 회원가입</h2>
            <form action="/api/register" method="POST">
                <div style="margin-bottom:15px;">
                    <label>아이디</label><br>
                    <input type="text" name="username" style="width:100%; padding:8px; margin-top:5px;" required>
                </div>
                <div style="margin-bottom:15px;">
                    <label>비밀번호</label><br>
                    <input type="password" name="password" style="width:100%; padding:8px; margin-top:5px;" required>
                </div>
                <button type="submit" style="width:100%; padding:10px; background:#ff4757; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">가입하기</button>
            </form>
            <p style="text-align:center; margin-top:15px;"><a href="/login">이미 계정이 있으신가요? 로그인</a></p>
        </div>
    </body>
    </html>`);
});

// 로그인 페이지 라우트 (백틱 추가 수정)
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>슬네이션 - 스트리머 로그인</title>
        <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; height: 100vh; background: #f0f4f8; display: flex; justify-content: center; align-items: center; font-family: sans-serif; }
            .login-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); width: 350px; text-align: center; }
            .input-group { margin-bottom: 15px; text-align: left; }
            .input-group label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 13px; }
            .input-group input { width: 100%; padding: 10px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; }
            .login-btn { width: 100%; padding: 12px; background: #52b735; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>스트리머 로그인</h2>
            <form action="/api/login" method="POST" style="margin-top: 20px;">
                <div class="input-group">
                    <label>아이디</label>
                    <input type="text" name="username" required>
                </div>
                <div class="input-group">
                    <label>비밀번호</label>
                    <input type="password" name="password" required>
                </div>
                <button type="submit" class="login-btn">로그인</button>
            </form>
            <p style="margin-top: 15px; font-size: 13px;"><a href="/register">계정이 없으신가요? 회원가입</a></p>
        </div>
    </body>
    </html>`);
});

// 스트리머별 OBS 알림 오버레이 화면
app.get('/overlay/:apiKey', async (req, res) => {
    const { apiKey } = req.params;
    const user = await User.findOne({ apiKey });
    if (!user) return res.status(404).send('Streamer not found');
});

// 방송용 실시간 랭킹 OBS 오버레이 화면 (백틱 추가 수정)
app.get('/ranking-overlay/:apiKey', async (req, res) => {
    const { apiKey } = req.params;
    const user = await User.findOne({ apiKey });
    if (!user) return res.status(404).send('Streamer not found');
    
    res.send(`<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>SelyPay Ranking Overlay</title>
        <style>
            body { background-color: transparent; margin: 0; font-family: 'Malgun Gothic', sans-serif; }
            .ranking-board { background: rgba(0, 0, 0, 0.75); color: white; padding: 20px; border-radius: 10px; width: fit-content; min-width: 250px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h3 { margin: 0 0 15px 0; font-size: 18px; text-align: center; color: #f1c40f; }
            .rank-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-size: 15px; }
            .rank-item:last-child { border-bottom: none; }
            .name { font-weight: bold; }
            .amount { color: #ffffff; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="ranking-board">
            <h3>🏆 오늘의 후원 랭킹</h3>
            <div id="ranking-content">불러오는 중...</div>
        </div>
        <script>
            async function fetchOverlayRanking() {
                try {
                    const response = await fetch('/api/ranking/' + '${apiKey}');
                    const ranking = await response.json();
                    const container = document.getElementById('ranking-content');
                    container.innerHTML = '';
                    if (!ranking || ranking.length === 0) {
                        container.innerHTML = '<div style="text-align:center; padding:10px; color:#aaa;">오늘 후원 내역이 없습니다.</div>';
                        return;
                    }
                    ranking.forEach((item, index) => {
                        const div = document.createElement('div');
                        div.className = 'rank-item';
                        div.innerHTML = '<span class="name">' + (index + 1) + '. ' + item._id + '</span><span class="amount">' + item.totalamount.toLocaleString() + '원</span>';
                        container.appendChild(div);
                    });
                } catch (e) {
                    console.error(e);
                }
            }
            fetchOverlayRanking();
            setInterval(fetchOverlayRanking, 5000);
        </script>
    </body>
    </html>`);
});

// 기타 API 라우트들
app.get('/api/logs/:apiKey', async (req, res) => {
    try {
        const user = await User.findOne({ apiKey: req.params.apiKey });
        if (!user) return res.status(404).json([]);
        const logs = await Donation.find({ streamerId: user._id }).sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/ranking/:apiKey', async (req, res) => {
    try {
        const user = await User.findOne({ apiKey: req.params.apiKey });
        if (!user) return res.status(404).json([]);
        const todayKey = getKSTDateKey();
        const todayDonations = await Donation.find(
            { streamerId: user._id, dateKey: todayKey },
            { nickname: 1, amount: 1, timestamp: 1 }
        ).sort({ timestamp: 1 });
        res.json(todayDonations);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/reactions/:apiKey', async (req, res) => {
    try {
        const user = await User.findOne({ apiKey: req.params.apiKey });
        if (!user) return res.status(404).json([]);
        const reactions = await Reaction.find({ streamerId: user._id }).sort({ amount: 1 });
        res.json(reactions);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/api/reactions/:apiKey', upload.fields([{ name: 'image' }, { name: 'audio' }]), async (req, res) => {
    try {
        const user = await User.findOne({ apiKey: req.params.apiKey });
        if (!user) return res.status(404).json({ success: false, error: 'Streamer not found' });
        const { name, amount } = req.body;
        let imageUrl = "";
        let audioUrl = "";
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// 리액션 수정 API (PUT)
app.put('/api/reaction/:apiKey/:id', upload.fields([{ name: 'image' }, { name: 'audio' }]), async (req, res) => {
    try {
        const user = await User.findOne({ apiKey: req.params.apiKey });
        if (!user) return res.status(404).json({ success: false, error: 'Streamer not found' });

        const reaction = await Reaction.findOne({ _id: req.params.id, streamerId: user._id });
        if (!reaction) return res.status(404).json({ success: false, error: 'Reaction not found' });

        const { name, amount } = req.body;
        if (name) reaction.name = name;
        if (amount) reaction.amount = Number(amount);

        const SUPABASE_URL = process.env.SUPABASE_URL || 'https://당신의프로젝트주소.supabase.co';
        const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '당신의Publishable키';
        const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'reactions';
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        if (req.files && req.files['image']) {
            const file = req.files['image'][0];
            const fileExt = file.originalname.split('.').pop();
            const imgName = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '.' + fileExt;
            const { error: imgError } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(imgName, file.buffer, { contentType: file.mimetype, upsert: false });
            if (imgError) throw imgError;
            const { data: imgPublic } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(imgName);
            reaction.imageUrl = imgPublic.publicUrl;
        }

        if (req.files && req.files['audio']) {
            const file = req.files['audio'][0];
            const fileExt = file.originalname.split('.').pop();
            const audioName = 'audio_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '.' + fileExt;
            const { error: audioError } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(audioName, file.buffer, { contentType: file.mimetype, upsert: false });
            if (audioError) throw audioError;
            const { data: audioPublic } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(audioName);
            reaction.audioUrl = audioPublic.publicUrl;
        }

        await reaction.save();
        res.json({ success: true, message: '리액션이 수정되었습니다.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message || 'Server Error' });
    }
});

// 리액션 삭제 API (DELETE)
app.delete('/api/reaction/:apiKey/:id', async (req, res) => {
    try {
        const user = await User.findOne({ apiKey: req.params.apiKey });
        if (!user) return res.status(404).json({ success: false, error: 'Streamer not found' });

        const result = await Reaction.findOneAndDelete({ _id: req.params.id, streamerId: user._id });
        if (!result) return res.status(404).json({ success: false, error: 'Reaction not found' });

        res.json({ success: true, message: '리액션이 삭제되었습니다.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message || 'Server Error' });
    }
});

const manualPlayStore = {}; 

app.post('/api/play/:apiKey/:donationId', async (req, res) => {
    try {
        const user = await User.findOne({ apiKey: req.params.apiKey });
        if (!user) return res.status(404).json({ success: false, error: 'Streamer not found' });
        const donation = await Donation.findOne({ _id: req.params.donationId, streamerId: user._id });
        if (!donation) return res.status(404).json({ success: false, error: 'Donation not found' });

        if (!manualPlayStore[user.apiKey]) manualPlayStore[user.apiKey] = [];
        manualPlayStore[user.apiKey].push(donation.toObject());
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

app.get('/api/manual-play/:apiKey', async (req, res) => {
    const apiKey = req.params.apiKey;
    if (manualPlayStore[apiKey] && manualPlayStore[apiKey].length > 0) {
        const items = [...manualPlayStore[apiKey]];
        manualPlayStore[apiKey] = [];
        res.json(items);
    } else {
        res.json([]);
    }
});

// 서버 구동 (백틱 추가 수정)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
