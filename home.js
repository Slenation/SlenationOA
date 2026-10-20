const express = require('express');
const router = express.Router();

// 홈 루트 (랜딩 페이지 디자인 및 기능 통합)
router.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>슬네이션 - 실시간 계좌 입금 알림 & 스트리밍 서포터 시스템</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f4f8fa;
            color: #1e293b;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* 상단 네비게이션 바 */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 40px;
            background-color: #ffffff;
            border-bottom: 1px solid #e2e8f0;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 22px;
            font-weight: 800;
            color: #101828;
            text-decoration: none;
        }

        .logo-icon {
            width: 28px;
            height: 28px;
            background-color: #4ade80;
            border-radius: 6px;
            display: inline-block;
        }

        .nav-links {
            display: flex;
            gap: 32px;
            list-style: none;
        }

        .nav-links a {
            text-decoration: none;
            color: #475569;
            font-size: 15px;
            font-weight: 600;
            transition: color 0.2s;
        }

        .nav-links a:hover {
            color: #16a34a;
        }

        .login-btn-top {
            background-color: #52b735;
            color: white;
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
            transition: background-color 0.2s;
        }

        .login-btn-top:hover {
            background-color: #439a2b;
        }

        /* 중앙 히어로 메인 섹션 */
        main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
        }

        .version-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background-color: #e8f7ec;
            color: #16a34a;
            border: 1px solid #bbf7d0;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 32px;
        }

        .badge-dot {
            width: 7px;
            height: 7px;
            background-color: #16a34a;
            border-radius: 50%;
        }

        .hero-title {
            font-size: 46px;
            font-weight: 900;
            line-height: 1.3;
            color: #0f172a;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
        }

        .hero-title .highlight {
            color: #52b735;
        }

        .hero-subtitle {
            font-size: 17px;
            color: #64748b;
            margin-bottom: 36px;
            font-weight: 500;
        }

        .cta-group {
            deflex: flex;
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .btn-primary {
            background-color: #52b735;
            color: white;
            padding: 14px 28px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 4px 6px -1px rgba(82, 183, 53, 0.2);
            transition: all 0.2s;
        }

        .btn-primary:hover {
            background-color: #439a2b;
            transform: translateY(-1px);
        }

        .btn-secondary {
            background-color: #ffffff;
            color: #1e293b;
            padding: 14px 28px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            transition: all 0.2s;
        }

        .btn-secondary:hover {
            background-color: #f8fafc;
            border-color: #cbd5e1;
        }
    </style>
</head>
<body>

    <!-- 상단 네비게이션 -->
    <header>
        <a href="/" class="logo">
            <span class="logo-icon"></span>
            Slenation
        </a>
        <ul class="nav-links">
            <li><a href="#about">서비스 소개</a></li>
            <li><a href="#guide">사용 방법</a></li>
            <li><a href="#patch">패치 노트</a></li>
            <li><a href="#support">고객센터</a></li>
        </ul>
        <a href="/login" class="login-btn-top">로그인</a>
    </header>

    <!-- 중앙 히어로 영역 -->
    <main>
        <div class="version-badge">
            <span class="badge-dot"></span>
            슬네이션 Open Alpha v1.0
        </div>

        <h1 class="hero_title" class="hero-title">
            실시간 계좌 입금 알림<br>
            <span class="highlight">& 스트리밍 서포터 시스템</span>
        </h1>

        <p class="hero-subtitle">
            은행 입금 건을 초단위로 수신받아 스트리밍에 즉시 연동하세요.
        </p>

        <div class="cta-group">
            <a href="/register" class="btn-primary">무료로 시작하기</a>
            <a href="/login" class="btn-secondary">스트리머 로그인</a>
        </div>
    </main>

</body>
</html>
    `);
});

module.exports = router;
