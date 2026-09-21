import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({});

app.post('/api/analyze', async (req, res) => {
  try {
    const { grade, subjects, scheduleTableData, targetUniversities } = req.body;

    const prompt = `
당신은 대한민국 최고 수준의 대입 입시 컨설턴트 및 학습 스케줄링 전문가 AI입니다.
다음 학생의 데이터를 바탕으로 입시 분석, 진로 및 직업 추천, 약점 보완 공부법, 주간 스케줄을 작성해 주세요.

[학생 데이터]
1. 현재 학년: ${grade}
2. 과목별 모의고사(3/6/9/10월) 성적 및 세부 약점: ${JSON.stringify(subjects)}
3. 요일별 고정 일정 및 자습 가능 시간: ${JSON.stringify(scheduleTableData)}
4. 희망 대학 및 학과: ${JSON.stringify(targetUniversities)}

[응답 가이드라인]
- 희망 대학 및 학과 정보를 입시 빅데이터 기준으로 분석하여 역대 합격 컷, 반영 비율, 앞으로 목표 달성에 필요한 개월 수와 점수 향상폭을 제시하세요.
- 국어의 자주 틀리는 지문 유형(화작/언매/과학기술/철학 등)과 수학의 틀리는 문항 번호(예: 15, 22, 30번 등)에 맞춤화된 약점 보완 공부법을 제시하세요.
- 관심 분야 및 성적을 종합하여 유망한 진로 및 상세한 직업 설명을 제공하세요.

[응답 요구사항 - 반드시 아래 구조와 동일한 순수 JSON으로만 응답할 것]
{
  "totalWeeklySelfStudyHours": 전체주간자습시간_숫자,
  "recommendation": "종합 분석 및 핵심 학습 전략 총평 (3~4문장)",
  "careerRecommendations": [
    {
      "title": "추천 직업명",
      "field": "관련 분야",
      "description": "해당 직업에 대한 상세 설명 및 하는 일",
      "relatedMajors": ["관련 학과1", "관련 학과2"]
    }
  ],
  "universityAnalysis": [
    {
      "univName": "대학 및 학과명",
      "reflectionRatio": "수능 과목별 반영 비율 요약",
      "historicalCut": "역대 합격 컷/백분위 정보",
      "targetPeriodMonths": 목표 달성 개월 수(숫자),
      "scoreImprovementNeeded": 향상 필요 점수(숫자),
      "advice": "합격을 위한 전략적 조언"
    }
  ],
  "studyGuides": [
    {
      "subject": "과목명 및 약점 정보",
      "strategy": "약점 지문/문항 번호 보완을 위한 구체적인 공부법"
    }
  ],
  "weeklyPlan": [
    {
      "day": "월",
      "academy": "고정 일정",
      "selfStudyHours": 자습시간_숫자,
      "tasks": [
        { "subject": "과목명", "time": 배분시간_분_숫자 }
      ]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text);
    res.json(result);

  } catch (error) {
    console.error('AI 분석 오류:', error);
    res.status(500).json({ error: 'AI 분석 실패' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`running on ${PORT}`);
});
