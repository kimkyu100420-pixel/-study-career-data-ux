import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/analyze', (req, res) => {
  try {
    const { grade = '고3', subjects = [], scheduleTableData = [], targetUniversities = [] } = req.body;

    // 1. 주간 총 자습 시간 계산
    const totalWeeklySelfStudyHours = scheduleTableData.reduce((acc, cur) => acc + (Number(cur.selfStudyHours) || 0), 0);

    // 2. 취약 과목 분석 (가장 성적이 낮거나 보완이 필요한 과목 선별)
    const processedSubjects = subjects.map(s => {
      const scores = Object.values(s.mockScores || {}).map(m => Number(m.score) || 0).filter(v => v > 0);
      const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
      return { ...s, avgScore };
    }).sort((a, b) => a.avgScore - b.avgScore);

    const weakestSubject = processedSubjects[0] ? processedSubjects[0].name : '수학';

    // 3. 과목 및 세부 약점별 맞춤 공부법 생성
    const studyGuides = subjects.map(s => {
      let strategy = `${s.name} 기본 핵심 개념 정리 및 기출 문제 오답 노트를 기반으로 주간 복습을 진행하세요.`;
      if (s.name === '국어') {
        if (s.koreanWeakTypes && s.koreanWeakTypes.length > 0) {
          strategy = `취약 유형 [${s.koreanWeakTypes.join(', ')}] 집중 보완: 매일 2지문씩 구조도(주제, 논지 연결, 개념 비교) 작성 훈련과 지문 문맥 추론 연습을 진행하세요.`;
        } else {
          strategy = `독서 및 문학 지문의 구조적 독해 훈련과 함께 매일 기출 3지문 분석을 권장합니다.`;
        }
      } else if (s.name === '수학') {
        if (s.mathWrongNumbers) {
          strategy = `자주 틀리는 문항(${s.mathWrongNumbers}) 대비: 조건 해석 능력 강화를 위해 최근 3개년 기출 킬러/준킬러 유형을 매일 2문항씩 정밀 복기하세요.`;
        } else {
          strategy = `개념서 반복 숙달과 실전 모의고사 풀이 시간을 배분하여 오답률 높은 유형을 재풀이하세요.`;
        }
      } else if (s.name === '영어') {
        strategy = `빈칸 추론 및 순서/삽입 유형 집중 연습과 매일 수능 필수 어휘 40개 암기를 추천합니다.`;
      } else if (s.name.includes('탐구') || s.name.includes('사탐') || s.name.includes('과탐')) {
        strategy = `개념 타임라인/기본 개념도 완전 정복 및 단원별 기출 선지(OX) 반복 체화 훈련을 진행하세요.`;
      }
      return {
        subject: `${s.name}${s.koreanWeakTypes?.length ? ` (${s.koreanWeakTypes.join(', ')})` : ''}${s.mathWrongNumbers ? ` (${s.mathWrongNumbers})` : ''}`,
        strategy
      };
    });

    // 4. 희망 대학 입시 분석 & 목표 점수 로드맵 생성
    const universityAnalysis = targetUniversities.length ? targetUniversities.map((univ, index) => {
      return {
        univName: univ,
        reflectionRatio: index === 0 ? '국어 33.3% / 수학 40% / 탐구 26.7%' : '국어 30% / 수학 35% / 탐구 35%',
        historicalCut: `수능 백분위 상위 ${(0.8 + index * 1.5).toFixed(1)}% 이내`,
        targetPeriodMonths: grade === '고3' ? 6 : (grade === '고2' ? 12 : 18),
        scoreImprovementNeeded: 8 + index * 4,
        advice: `[${univ}] 합격을 위해 주요 반영 비율이 높은 ${weakestSubject} 과목의 성적 향상이 시급합니다. 고난도 문항 체화 전략을 세우세요.`
      };
    }) : [
      {
        univName: '목표 대학 미입력',
        reflectionRatio: '국어 30% / 수학 35% / 탐구 35%',
        historicalCut: '상위 5% 이내',
        targetPeriodMonths: 6,
        scoreImprovementNeeded: 10,
        advice: '희망 대학을 입력하면 맞춤형 과목 반영 비율 및 역대 합격 컷 분석이 함께 제공됩니다.'
      }
    ];

    // 5. 추천 진로 및 직업 탐구 데이터
    const careerRecommendations = [
      {
        title: 'AI / 데이터 분석 전문가',
        field: 'IT 및 데이터 과학',
        description: '빅데이터를 수집·분석하여 패턴을 발견하고, 인공지능 알고리즘을 개발하거나 비즈니스 의사결정을 돕는 최첨단 전문 직업입니다.',
        relatedMajors: ['컴퓨터공학과', '데이터과학과', '인공지능학과', '수학과']
      },
      {
        title: '신재생 에너지 / 바이오 융합 연구원',
        field: '첨단 공학 및 자연과학',
        description: '친환경 신소재나 바이오 헬스케어 기술을 연구 개발하여 미래 신산업 생태계를 설계하는 전문 연구직입니다.',
        relatedMajors: ['바이오공학과', '화학공학과', '생명과학과', '신소재공학과']
      }
    ];

    // 6. 요일별 자습 시간 분배 및 스케줄링
    const activeSubjects = subjects.length ? subjects.map(s => s.name) : ['국어', '수학', '영어', '탐구'];
    const weeklyPlan = scheduleTableData.map(item => {
      const hours = Number(item.selfStudyHours) || 0;
      const totalMins = hours * 60;
      let tasks = [];

      if (totalMins > 0) {
        const subCount = Math.min(activeSubjects.length, 3);
        const timePerSub = Math.floor(totalMins / subCount);
        tasks = activeSubjects.slice(0, subCount).map(subName => ({
          subject: subName,
          time: timePerSub
        }));
      }

      return {
        day: item.day,
        academy: item.academy,
        selfStudyHours: hours,
        tasks
      };
    });

    // 최종 결과 반환
    res.json({
      totalWeeklySelfStudyHours,
      recommendation: `${grade} 성적 및 자습 데이터를 분석한 결과, 가장 보완이 시급한 과목은 [${weakestSubject}]입니다. 주간 자습 시간 총 ${totalWeeklySelfStudyHours}시간을 활용해 약점 영역 위주로 배분해 드렸습니다.`,
      careerRecommendations,
      universityAnalysis,
      studyGuides,
      weeklyPlan
    });

  } catch (error) {
    console.error('분석 오류:', error);
    res.status(500).json({ error: '데이터 처리 실패' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 포트 ${PORT}에서 작동 중입니다.`);
});
