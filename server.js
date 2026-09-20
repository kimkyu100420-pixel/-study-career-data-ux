const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (q, r) => r.json({ status: 'ok', service: 'study-career-data-ux' }));

// 관심 분야별 주요 관련 과목 가중치
const interestSubjectWeights = {
  'AI/데이터': { '수학': 1.5, '과학탐구': 1.3, '영어': 1.2 },
  'SW/개발': { '수학': 1.4, '영어': 1.3, '과학탐구': 1.1 },
  '보안/네트워크': { '수학': 1.3, '영어': 1.3, '국어': 1.1 },
  'UX/UI': { '사회탐구': 1.3, '국어': 1.2, '영어': 1.1 },
  '영상/콘텐츠': { '국어': 1.3, '사회탐구': 1.2, '영어': 1.1 },
  '3D/게임': { '수학': 1.3, '과학탐구': 1.2, '국어': 1.1 },
  '로봇/자율주행': { '수학': 1.5, '과학탐구': 1.4 },
  '바이오/의학': { '과학탐구': 1.6, '수학': 1.3, '영어': 1.2 },
  '친환경/에너지': { '과학탐구': 1.5, '수학': 1.2, '사회탐구': 1.1 },
  '경영/스타트업': { '수학': 1.3, '사회탐구': 1.3, '영어': 1.2 },
  '금융/핀테크': { '수학': 1.5, '사회탐구': 1.3, '영어': 1.1 },
  '마케팅/브랜딩': { '국어': 1.3, '사회탐구': 1.3, '영어': 1.2 },
  '심리/사회': { '사회탐구': 1.5, '국어': 1.3, '영어': 1.1 },
  '스토리/문학': { '국어': 1.6, '사회탐구': 1.2, '영어': 1.1 }
};

const mapInterestsToKeywords = {
  'AI/데이터': ['인공지능 엔지니어', '빅데이터 분석가', '머신러닝 연구원'],
  'SW/개발': ['풀스택 개발자', '클라우드 아키텍트', '소프트웨어 엔지니어'],
  '보안/네트워크': ['정보보안 전문가', '화이트해커', '네트워크 엔지니어'],
  'UX/UI': ['UX/UI 디자이너', '사용자 경험 연구원', '인터랙션 디자이너'],
  '영상/콘텐츠': ['미디어 크리에이터', '영상 편집자', '콘텐츠 기획자'],
  '3D/게임': ['3D 아티스트', '게임 기획자', 'VR/AR 개발자'],
  '로봇/자율주행': ['로봇 공학자', '자율주행 시스템 개발자', '메카트로닉스'],
  '바이오/의학': ['바이오 헬스케어 연구원', '의공학자', '신약 개발자'],
  '친환경/에너지': ['신재생에너지 전문가', '기후변화 연구원', '스마트팜 전문가'],
  '경영/스타트업': ['서비스 기획자', '스타트업 창업가', '프로덕트 매니저(PM)'],
  '금융/핀테크': ['핀테크 개발자', '금융 데이터 분석가', '투자 분석가'],
  '마케팅/브랜딩': ['디지털 마케터', '브랜드 매니저', '그로스 해커'],
  '심리/사회': ['인지심리학자', 'UX 리서처', '사회조사 분석가'],
  '스토리/문학': ['스토리텔러', '웹툰/웹소설 기획자', '카피라이터']
};

app.post('/api/analyze', (req, res) => {
  const { subjects = [], weeklyInput = [], interests = [] } = req.body;

  // 1. 과목별 취약도 + 진로 가중치 통합 계산
  const analyzed = subjects
    .filter(s => s.name && Number.isFinite(Number(s.score)))
    .map(s => {
      const score = Math.min(100, Math.max(0, Number(s.score)));
      const grade = Math.min(9, Math.max(1, Number(s.grade) || 5));
      const wrong = Math.min(100, Math.max(0, Number(s.wrong) || 0));

      // 등급(1~9) 및 원점수 기반 기본 취약도 (등급이 낮을수록/점수가 낮을수록 상승)
      let basePriority = (100 - score) * 0.4 + (grade - 1) * 8 + wrong * 0.3;

      // 진로 연관성 가중치
      let careerWeight = 1.0;
      interests.forEach(interest => {
        if (interestSubjectWeights[interest] && interestSubjectWeights[interest][s.name]) {
          careerWeight = Math.max(careerWeight, interestSubjectWeights[interest][s.name]);
        }
      });

      const priorityScore = basePriority * careerWeight;

      let guide = '';
      if (grade >= 5 || score < 60) {
        guide = `[개념 보완 필요] 기본 개념 복습 및 교과서 기본 문제 회독 추천.`;
      } else if (wrong > 30) {
        guide = `[오답 분석 집중] 오답률이 높은 단원 위주 오답 노트 및 기출 오답 풀이 추천.`;
      } else if (careerWeight > 1.0) {
        guide = `[희망 진로 핵심 과목] 상위권 유지 및 심화 탐구 보고서/프로젝트 연계 추천.`;
      } else {
        guide = `[상태 유지] 감을 잃지 않도록 일일 꾸준한 모의고사 문제 풀이 추천.`;
      }

      return {
        name: s.name,
        score,
        grade,
        wrong,
        careerWeight,
        priority: Math.round(Math.min(100, priorityScore)),
        rawPriority: priorityScore,
        guide
      };
    })
    .sort((a, b) => b.rawPriority - a.rawPriority);

  // 2. 주간 자습 시간 계산 및 요일별 과목 배분
  const totalPrioritySum = analyzed.reduce((sum, s) => sum + s.rawPriority, 0) || 1;
  let totalWeeklySelfStudyHours = 0;

  const weeklyPlan = weeklyInput.map(item => {
    const hours = Number(item.selfStudyHours) || 0;
    totalWeeklySelfStudyHours += hours;
    const totalMins = hours * 60;

    // 해당 요일에 배분할 자습 과목 시간(분) 계산
    let tasks = [];
    if (totalMins > 0 && analyzed.length > 0) {
      tasks = analyzed.slice(0, 3).map(s => { // 상위 2~3개 과목 우선 배치
        const allocatedMins = Math.round((s.rawPriority / totalPrioritySum) * totalMins);
        return { subject: s.name, time: allocatedMins };
      }).filter(t => t.time > 0);
    }

    return {
      day: item.day,
      academy: item.academy,
      selfStudyHours: hours,
      tasks
    };
  });

  // 추천 키워드
  const keywords = [...new Set(interests.flatMap(i => mapInterestsToKeywords[i] || [i]))];

  // 총평
  const topSubject = analyzed[0] ? analyzed[0].name : '핵심 과목';
  const recommendation = `분석 결과, 현재 가장 우선적으로 보완해야 할 과목은 [${topSubject}]입니다. 요일별 고정 일정 외 순수 자습 시간 동안 AI가 추천한 자습 시간을 지켜보세요.`;

  res.json({
    subjects: analyzed,
    totalWeeklySelfStudyHours,
    weeklyPlan,
    keywords,
    recommendation
  });
});

app.get('*', (q, r) => r.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`running on ${PORT}`));
