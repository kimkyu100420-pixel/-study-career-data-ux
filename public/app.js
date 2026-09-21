const subjectsContainer = document.getElementById('subjects');
const scheduleTableBody = document.getElementById('schedule-table-body');
const days = ['월', '화', '수', '목', '금', '토', '일'];

const koreanTypes = ['화작', '언매', '과학기술', '철학', '예술', '법', '현대시', '현대소설', '고전시가', '고전소설'];

// 1. 요일별 일정 표 행 생성
days.forEach(day => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="font-weight: bold; color: #2f6fed; width: 80px;">${day}요일</td>
    <td><input class="table-academy" data-day="${day}" placeholder="예: 수학학원 (18:00~20:00)"></td>
    <td style="width: 140px;"><input class="table-time" data-day="${day}" type="number" min="0" step="0.5" value="${day === '토' || day === '일' ? 6 : 3}"></td>
  `;
  scheduleTableBody.appendChild(tr);
});

// 탐구 과목 판단
function isExploration(name) {
  return name.includes('탐구') || name.includes('사탐') || name.includes('과탐') ||
    ['한국사', '생활과윤리', '윤리와사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와법', '사회문화',
     '물리학', '화학', '생명과학', '지구과학'].some(k => name.includes(k));
}

// 2. 과목 카드 생성 (3모, 6모, 9모, 10모 성적 및 약점 입력)
function addSubjectCard(name = '') {
  const card = document.createElement('div');
  card.className = 'subject-card';

  const isExp = isExploration(name);
  const maxScore = isExp ? 50 : 100;

  card.innerHTML = `
    <input class="subject-title-input" placeholder="과목명" value="${name}">
    <div class="mock-scores-grid">
      ${['3모', '6모', '9모', '10모'].map(m => `
        <div class="mock-item">
          <label>${m}</label>
          <div class="mock-input-row">
            <input class="m-score" data-mock="${m}" type="number" min="0" max="${maxScore}" placeholder="점수">
            <input class="m-grade" data-mock="${m}" type="number" min="1" max="9" placeholder="등급">
          </div>
        </div>
      `).join('')}
    </div>
    <div class="subject-detail-box"></div>
  `;

  subjectsContainer.appendChild(card);

  const titleInput = card.querySelector('.subject-title-input');
  const detailBox = card.querySelector('.subject-detail-box');

  function updateDetails() {
    const subjName = titleInput.value.trim();
    const limit = isExploration(subjName) ? 50 : 100;

    card.querySelectorAll('.m-score').forEach(input => {
      input.max = limit;
    });

    if (subjName === '국어') {
      detailBox.style.display = 'block';
      detailBox.innerHTML = `
        <label>자주 틀리는 지문 및 영역 유형 (다중 선택)</label>
        <div class="type-chips">
          ${koreanTypes.map(t => `<button class="type-chip" data-type="${t}">${t}</button>`).join('')}
        </div>
      `;
      detailBox.querySelectorAll('.type-chip').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          btn.classList.toggle('sel');
        };
      });
    } else if (subjName === '수학') {
      detailBox.style.display = 'block';
      detailBox.innerHTML = `
        <label>자주 틀리는 문항 번호</label>
        <input class="math-wrong-nums" placeholder="예: 15번, 22번, 30번">
      `;
    } else {
      detailBox.style.display = 'none';
      detailBox.innerHTML = '';
    }
  }

  titleInput.oninput = updateDetails;
  updateDetails();
}

// 기본 5개 과목 세팅
['국어', '수학', '영어', '사회탐구', '과학탐구'].forEach(s => addSubjectCard(s));
document.getElementById('add-subject-btn').onclick = () => addSubjectCard();

// 3. 분석 버튼 클릭
document.getElementById('analyze-btn').onclick = async () => {
  const currentGrade = document.getElementById('grade-select').value;

  const subjects = [...document.querySelectorAll('.subject-card')].map(card => {
    const name = card.querySelector('.subject-title-input').value.trim();
    const mockScores = {};

    card.querySelectorAll('.mock-item').forEach(item => {
      const mockName = item.querySelector('label').textContent;
      const score = item.querySelector('.m-score').value;
      const grade = item.querySelector('.m-grade').value;
      if (score || grade) {
        mockScores[mockName] = {
          score: Number(score) || 0,
          grade: Number(grade) || 0
        };
      }
    });

    let extraData = {};
    if (name === '국어') {
      extraData.koreanWeakTypes = [...card.querySelectorAll('.type-chip.sel')].map(el => el.dataset.type);
    } else if (name === '수학') {
      extraData.mathWrongNumbers = card.querySelector('.math-wrong-nums')?.value.trim() || '';
    }

    return {
      name,
      mockScores,
      ...extraData
    };
  }).filter(s => s.name);

  if (!subjects.length) return alert('최소 1개 이상의 과목 정보를 입력해 주세요.');

  const scheduleTableData = days.map(day => {
    const academy = document.querySelector(`.table-academy[data-day="${day}"]`).value.trim();
    const selfTime = Number(document.querySelector(`.table-time[data-day="${day}"]`).value) || 0;
    return { day, academy: academy || '없음', selfStudyHours: selfTime };
  });

  const targetUniversities = [...document.querySelectorAll('.univ-item')]
    .map(el => el.value.trim())
    .filter(val => val.length > 0);

  // 백엔드 API 요청
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grade: currentGrade,
      subjects,
      scheduleTableData,
      targetUniversities
    })
  }).then(res => res.json());

  // 렌더링
  document.getElementById('summary').textContent = `학년: ${currentGrade} · 주간 자습 가능 시간: ${response.totalWeeklySelfStudyHours}시간`;
  document.getElementById('rec').textContent = response.recommendation;

  // 1. 추천 진로 및 상세 직업 설명
  document.getElementById('career-recommendations').innerHTML = (response.careerRecommendations || []).map(c => `
    <div class="career-card">
      <h4>${c.title}</h4>
      <span class="badge">${c.field}</span>
      <p><strong>직업 설명:</strong> ${c.description}</p>
      <p style="margin-top: 6px;"><strong>관련 추천 학과:</strong> ${c.relatedMajors.join(', ')}</p>
    </div>
  `).join('');

  // 2. 희망 대학 입시 분석 & 로드맵
  document.getElementById('univ-analysis').innerHTML = (response.universityAnalysis || []).map(u => `
    <div class="univ-card">
      <h4>${u.univName}</h4>
      <span class="badge">반영 비율: ${u.reflectionRatio}</span>
      <p><strong>역대 합격 컷:</strong> ${u.historicalCut}</p>
      <p><strong>목표 달성 로드맵:</strong> ${u.targetPeriodMonths}개월 동안 약 ${u.scoreImprovementNeeded}점 향상 필요</p>
      <p style="margin-top: 6px; color: #2f6fed;">📌 ${u.advice}</p>
    </div>
  `).join('');

  // 3. 맞춤 공부법
  document.getElementById('study-guides').innerHTML = (response.studyGuides || []).map(g => `
    <div class="study-guide-card">
      <h5>${g.subject} 세부 약점 보완 전략</h5>
      <p>${g.strategy}</p>
    </div>
  `).join('');

  // 4. 주간 자습 스케줄표
  document.getElementById('weekly-plan').innerHTML = `
    <div class="weekly-grid">
      ${(response.weeklyPlan || []).map(p => `
        <div class="schedule-card">
          <h4 style="font-size:14px;">${p.day}요일 <small style="font-size:11px; color:#64748b;">(${p.selfStudyHours}시간)</small></h4>
          <span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px; display:block; margin:4px 0 8px;">🏫 ${p.academy}</span>
          <div>
            ${p.tasks.length ? p.tasks.map(t => `
              <div class="task-item">
                <span>• ${t.subject}</span>
                <span class="time">${t.time}분</span>
              </div>
            `).join('') : '<span style="color:#94a3b8; font-size:11px;">자습 시간 없음</span>'}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // 스크롤 이동
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
};
