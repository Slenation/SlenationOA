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

// 홈 루트 라우터 연결
app.use('/', homeRouter);

// 📌 [수정] 회원가입 처리 API (백틱 추가)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const apiKey = 'sely_' + crypto.randomBytes(16).toString('hex');
        const newUser = new User({ username, password, apiKey });
        await newUser.save();
        res.send(`<script>alert('회원가입 성공! 발급된 계정으로 로그인해주세요.'); location.href = '/login';</script>`);
    } else { // 예외 처리 구조 정돈
        res.send(`<script>alert('회원가입 실패 (중복된 아이디일 수 있습니다)'); history.back();</script>`);
    }
    } catch (e) {
        res.send(`<script>alert('회원가입 실패 (중복된 아이디일 수 있습니다)'); history.back();</script>`);
    }
});

// 📌 [추가/보완] 로그인 페이지 라우트
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>스트리머 로그인</title></head>
    <body style="font-family:sans-serif; background:#f4f7f6; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
        <div style="background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); width:300px;">
            <h2>스트리머 로그인</h2>
            <form action="/api/login" method="POST">
                <div style="margin-bottom:15px;">
                    <label>아이디</label><br>
                    <input type="text" name="username" style="width:100%; padding:8px; margin-top:5px;" required>
                </div>
                <div style="margin-bottom:15px;">
                    <label>비밀번호</label><br>
                    <input type="password" name="password" style="width:100%; padding:8px; margin-top:5px;" required>
                </div>
                <button type="submit" style="width:100%; padding:10px; background:#4cd137; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">로그인</button>
            </form>
            <p style="text-align:center; margin-top:15px;"><a href="/register">계정이 없으신가요? 회원가입</a></p>
        </div>
    </body>
    </html>`);
});

// 📌 [추가/보완] 로그인 처리 API (회원가입 후 진입하는 핵심 라우터)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // User 모델이 정의되어 있어야 합니다.
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.send(`<script>alert('아이디 또는 비밀번호가 틀렸습니다.'); history.back();</script>`);
        }

        // 로그인 성공 시 대시보드 화면 전송 (예시 대시보드 UI)
        res.send(`<!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>슬네이션 - 대시보드</title>
            <style>
                body { font-family: 'Noto Sans KR', sans-serif; background: #f4f7f6; margin: 0; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; }
                .api-key-box { background: #eee; padding: 15px; border-radius: 5px; word-break: break-all; margin: 20px 0; font-family: monospace; }
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
                <style>
                    body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; font-family: ${menuSettings.fontFamily}; height: 100vh; width: 100vw; }
                    #menu-container { display: flex; flex-direction: column; gap: 10px; width: fit-content; padding: 10px; }
                    .menu-row { color: ${tc}; font-size: ${menuSettings.fontSize}; font-weight: 800; letter-spacing: -0.5px; ${extraStyle} white-space: nowrap; }
                </style>
            </head>
            <body>
                <div id="app"></div>
                <script>
                    const reactions = ${JSON.stringify(reactions)};
                    const app = document.getElementById('app');
                    if (reactions.length === 0) {
                        app.innerHTML = '<div class="menu-row" style="color:#aaa; font-size:16px;">등록된 리액션이 없습니다.</div>';
                    } else {
                        app.innerHTML = reactions.map(r => '<div class="menu-row">' + r.name + ' : ' + r.amount.toLocaleString() + '원</div>').join('');
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

// 스트리머별 OBS 알림 오버레이 화면
app.get('/overlay/:apiKey', async (req, res) => {
    const { apiKey } = req.params;
    const user = await User.findOne({ apiKey });
    if (!user) return res.status(404).send('Streamer not found');

    const settings = user.alertSettings || {};
    const reactions = await Reaction.find({ streamerId: user._id }).sort({ amount: 1 });
    const useImage = settings.useImage !== undefined ? settings.useImage : true;

    const fontSize = settings.fontSize || '8vh';
    const fontFamily = settings.fontFamily || 'Jalnan2, sans-serif';
    const fontColor = settings.fontColor || '#ffffff';
    const borderColor = settings.borderColor || '#000000';
    const borderWidth = settings.borderWidth || '2px';
    const effect = settings.effect || 'letter-wave';

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>SelyPay Alert Overlay</title>
            <style>
                body { background: transparent; margin: 0; overflow: hidden; font-family: ${fontFamily}; }
                #alert-container { width: 100vw; height: 100vh; display: none; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; box-sizing: border-box; padding: 2vh 3vw; }
            </style>
        </head>
        <body>
            <div id="alert-container">
                <div id="alert-line1"></div>
            </div>
        </body>
        </html>
    `);
});

// 방송용 실시간 랭킹 OBS 오버레이 화면
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
            .ranking-board { background: rgba(0, 0, 0, 0.75); color: white; padding: 20px; border-radius: 10px; width: fit-content; min-width: 250px; }
        </style>
    </head>
    <body>
        <div class="ranking-board">
            <h3>🏆 오늘의 후원 랭킹</h3>
            <div id="ranking-content">불러오는 중...</div>
        </div>
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

// 서버 구동
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
