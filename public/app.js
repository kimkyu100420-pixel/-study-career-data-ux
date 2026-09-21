const box = document.getElementById('subjects');
const scheduleBox = document.getElementById('weekly-schedule-inputs');
let selectedInterests = new Set();

const days = ['월', '화', '수', '목', '금', '토', '일'];
const koreanPassageTypes = ['과학기술', '철학', '예술', '법', '고전소설', '고전시가', '현대소설', '현대시'];

// 탐구 과목 여부 확인
function isExplorationSubject(name) {
  return name.includes('탐구') || name.includes('사탐') || name.includes('과탐') || 
         ['한국사', '생활과윤리', '윤리와사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와법', '사회문화',
          '물리학', '화학', '생명과학', '지구과학'].some(k => name.includes(k));
}

// 1. 과목 입력 카드 생성
function addSubjectCard(name = '') {
  const card = document.createElement('div');
  card.className = 'subject-card';

  const isExp = isExplorationSubject(name);
  const maxScore = isExp ? 50 : 100;

  card.innerHTML = `
    <div class="subject-row-main">
      <input class="subj-name" placeholder="과목명" value="${name}">
      <input class="subj-score" type="number" min="0" max="${maxScore}" placeholder="점수(${maxScore}만점)">
      <input class="subj-grade" type="number" min="1" max="9" placeholder="등급">
    </div>
    <div class="subject-detail-box"></div>
  `;

  box.appendChild(card);

  const nameInput = card.querySelector('.subj-name');
  const scoreInput = card.querySelector('.subj-score');
  const detailBox = card.querySelector('.subject-detail-box');

  // 과목 종류 변경에 따른 세부 약점 입력창 렌더링
  function updateDetailBox() {
    const val = nameInput.value.trim();
    const isExploration = isExplorationSubject(val);
    const limit = isExploration ? 50 : 100;
    
    scoreInput.max = limit;
    scoreInput.placeholder = `점수(${limit}만점)`;

    if (val === '국어') {
      detailBox.style.display = 'block';
      detailBox.innerHTML = `
        <label>자주 틀리는 지문 유형 (다중 선택)</label>
        <div class="type-chips">
          ${koreanPassageTypes.map(t => `<button class="type-chip" data-type="${t}">${t}</button>`).join('')}
        </div>
      `;
      // 지문 유형 토글 이벤트
      detailBox.querySelectorAll('.type-chip').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          btn.classList.toggle('sel');
        };
      });
    } else if (val === '수학') {
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

  nameInput.oninput = updateDetailBox;
  updateDetailBox();
}

// 기본 5개 과목 추가
['국어', '수학', '영어', '사회탐구', '과학탐구'].forEach(s => addSubjectCard(s));
document.getElementById('add').onclick = () => addSubjectCard();

// 2. 요일별 고정 일정 입력 폼
days.forEach(day => {
  const div = document.createElement('div');
  div.className = 'day-input-card';
  div.innerHTML = `
    <strong>${day}요일</strong>
    <input class="academy" data-day="${day}" placeholder="학원/고정일정" style="margin-bottom: 6px;">
    <label style="font-size:11px; color:#64748b; display:block; margin-bottom:2px;">자습 시간(시간)</label>
    <input class="self-time" data-day="${day}" type="number" min="0" step="0.5" value="${day === '토' || day === '일' ? 6 : 3}">
  `;
  scheduleBox.appendChild(div);
});

// 관심 분야 버튼 토글
document.querySelectorAll('#chips button').forEach(b => {
  b.onclick = () => {
    b.classList.toggle('sel');
    if (b.classList.contains('sel')) selectedInterests.add(b.dataset.v);
    else selectedInterests.delete(b.dataset.v);
  };
});

// 3. 분석 요청 처리
document.getElementById('analyze').onclick = async () => {
  // 과목 정보 수집
  const subjects = [...document.querySelectorAll('.subject-card')].map(card => {
    const name = card.querySelector('.subj-name').value.trim();
    const score = Number(card.querySelector('.subj-score').value);
    const grade = Number(card.querySelector('.subj-grade').value);

    let extraData = {};
    if (name === '국어') {
      const selectedTypes = [...card.querySelectorAll('.type-chip.sel')].map(el => el.dataset.type);
      extraData.koreanPassageTypes = selectedTypes;
    } else if (name === '수학') {
      const wrongNums = card.querySelector('.math-wrong-nums')?.value.trim() || '';
      extraData.mathWrongNumbers = wrongNums;
    }

    return {
      name,
      score,
      grade,
      maxScore: isExplorationSubject(name) ? 50 : 100,
      ...extraData
    };
  }).filter(s => s.name && Number.isFinite(s.score));

  if (!subjects.length) return alert('최소 1개 이상의 과목 성적을 입력해 주세요.');

  // 희망 대학 수집 (최대 3개)
  const targetUniversities = [...document.querySelectorAll('.univ-item')]
    .map(i => i.value.trim())
    .filter(v => v.length > 0);

  // 요일별 스케줄 수집
  const weeklyInput = days.map(day => {
    const ac = document.querySelector(`.academy[data-day="${day}"]`).value.trim();
    const st = Number(document.querySelector(`.self-time[data-day="${day}"]`).value) || 0;
    return { day, academy: ac || '없음', selfStudyHours: st };
  });

  // 서버 API 호출
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjects,
      targetUniversities,
      interests: [...selectedInterests],
      weeklyInput
    })
  }).then(res => res.json());

  // 데이터 렌더링
  document.getElementById('summary').textContent = `총 주간 자습 시간: ${response.totalWeeklySelfStudyHours}시간 · 분석 완료 과목: ${response.subjects.length}개`;
  document.getElementById('rec').textContent = response.recommendation;

  // 1. 희망 대학 입시 분석 & 목표 점수/기간 로드맵
  document.getElementById('univ-analysis').innerHTML = response.universityAnalysis.length ? 
    response.universityAnalysis.map(u => `
      <div class="univ-card">
        <h4>${u.univName}</h4>
        <span class="badge">주요 반영 비율: ${u.reflectionRatio}</span>
        <p><strong>역대 합격 컷:</strong> ${u.historicalCut}</p>
        <p><strong>목표 달성 로드맵:</strong> ${u.targetPeriodMonths}개월 동안 약 ${u.scoreImprovementNeeded}점 상승 필요</p>
        <p style="margin-top:6px; font-size:11px; color:#64748b;">📌 ${u.advice}</p>
      </div>
    `).join('') : '<p style="color:#64748b; font-size:13px;">입력된 희망 대학이 없습니다.</p>';

  // 2. 과목 및 약점 맞춤 공부법
  document.getElementById('study-guides').innerHTML = response.studyGuides.map(g => `
    <div class="study-guide-card">
      <h5>${g.subject} 보완 전략</h5>
      <p>${g.strategy}</p>
    </div>
  `).join('');

  // 3. 주간 자습 스케줄표
  document.getElementById('weekly-plan').innerHTML = `
    <div class="weekly-grid">
      ${response.weeklyPlan.map(p => `
        <div class="schedule-card">
          <h4>${p.day}요일 <small style="font-size:11px; color:#64748b;">(${p.selfStudyHours}시간)</small></h4>
          <span class="academy-tag">🏫 ${p.academy}</span>
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

  // 4. 키워드
  document.getElementById('keys').innerHTML = (response.keywords || [])
    .map(k => `<span class="key">${k}</span>`).join('');
};
