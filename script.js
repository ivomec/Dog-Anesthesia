// --- 전역 변수 및 상수 ---
const concentrations = { lidocaine: 20, ketamine: 100, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, cerenia: 10, cephron: 50, baytril25: 25, baytril50: 50, clavamox_iv: 100 };
const pillStrengths = { gabapentin: 100, acetaminophen: 160, amoxicillin_capsule: 250, famotidine: 10, misoprostol: 100 };
let selectedTubeInfo = { size: null, cuff: false, notes: '' };
const weightSizeGuide = [ { weight: 1, size: '3.0' }, { weight: 2, size: '3.5' }, { weight: 3.5, size: '4.0' }, { weight: 4, size: '4.5' }, { weight: 6, size: '5.5' }, { weight: 8, size: '6.0' }, { weight: 9, size: '7.0' }, { weight: 12, size: '7.0' }, { weight: 14, size: '7.5' }, { weight: 20, size: '9.0' }, { weight: 30, size: '11.0' }, { weight: 40, size: '13.0' } ];
const tracheaSizeGuide = [ { diameter: 5.13, id: '2.5' }, { diameter: 5.88, id: '3.0' }, { diameter: 6.63, id: '3.5' }, { diameter: 7.50, id: '4.0' }, { diameter: 8.13, id: '4.5' }, { diameter: 8.38, id: '5.0' }, { diameter: 9.13, id: '5.5' }, { diameter: 10.00, id: '6.0' }, { diameter: 11.38, id: '6.5' }, { diameter: 11.63, id: '7.0' }, { diameter: 12.50, id: '7.5' }, { diameter: 13.38, id: '8.0' } ];

// --- 탭 관리 ---
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// --- 환자 상태 가져오기 ---
function getPatientStatus() {
    const statuses = {};
    document.querySelectorAll('input[name="patient_status"]:checked').forEach((checkbox) => {
        statuses[checkbox.value] = true;
    });
    return statuses;
}

// --- 메인 계산 함수 ---
function calculateAll() {
    const weightInput = document.getElementById('weight');
    const weight = parseFloat(weightInput.value);
    
    // 체중 미입력시 UI 초기화
    if (!weight || weight <= 0) {
        const elementsToClear = ['pre_op_drugs_result', 'dog_nerve_block_result', 'lk_cri_calc_result', 'workflow_steps', 'hypotension_protocol', 'bradycardia_protocol', 'cpa_protocol', 'discharge_gold', 'discharge_alt', 'etco2Tab', 'patch_recommendation'];
        elementsToClear.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = `<p class="text-center text-gray-500 p-4">체중을 입력해주세요.</p>`;
        });
        const weightInputTube = document.getElementById('weight-input');
        if (weightInputTube) { weightInputTube.value = ''; calculateWeightSize(); }
        updateTubeDisplay();
        return;
    }
    
    populatePrepTab(weight);
    populateEmergencyTab(weight);
    populateEtco2Tab();
    populateDischargeTab(weight);
    populateProtocolTab(weight);
    
    // ET Tube 계산기 자동화
    const weightInputTube = document.getElementById('weight-input');
    if (weightInputTube) {
        weightInputTube.value = weight;
        calculateWeightSize();
    }
    updateTubeDisplay();
}

// --- 탭별 내용 채우기 ---
function populatePrepTab(weight) {
    const status = getPatientStatus();
    
    // 약물 계산
    const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
    const butorMl = (0.2 * weight) / concentrations.butorphanol;
    const midaMl = (0.2 * weight) / concentrations.midazolam;
    const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
    const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
    const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
    const alfaxanMlMax = 'alfaxanMlMax' in concentrations ? (2 * weight) / concentrations.alfaxalone : (2 * weight) / concentrations.alfaxalone_max; // Compatibility
    
    const fluidRate = (status.cardiac || status.kidney) ? 2 : 5;
    const fluidTarget = fluidRate * weight;
    const pumpCorrectionFactor = 0.7;
    const fluidCorrected = fluidTarget / pumpCorrectionFactor;
    
    // 결과 출력
    document.getElementById('pre_op_drugs_result').innerHTML = `
        <div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold text-teal-800">🛡️ 예방적 항생제</h4><p><span class="result-value">${clavaIvMl.toFixed(2)} mL</span> (클라바목스)</p></div>
        <div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold text-blue-800">😌 마취 전 투약</h4><p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p></div>
        <div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold text-amber-800">⚡ LK 부하 용량</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p><p class="text-xs text-gray-600 font-semibold mt-1">※ 희석: 케타민 0.1mL + N/S 0.9mL</p></div>
        <div class="p-3 bg-indigo-50 rounded-lg"><h4 class="font-bold text-indigo-800">💤 마취 유도제</h4><p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span> 알팍산</p></div>
        <div class="p-3 bg-cyan-50 rounded-lg"><h4 class="font-bold text-cyan-800">💧 수액 펌프</h4><p><span class="result-value">${fluidCorrected.toFixed(1)} mL/hr</span></p><p class="text-xs text-gray-500 mt-1">(목표: ${fluidTarget.toFixed(1)}mL/hr)</p></div>
    `;

    const sites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;
    document.getElementById('dog_nerve_block_result').innerHTML = `<div class="space-y-2"><label for="dog_block_sites" class="font-semibold text-gray-700">📍 마취 부위 수:</label><select id="dog_block_sites" class="large-interactive-field" onchange="calculateAll()"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select></div><div class="p-3 border rounded-lg bg-gray-50 mt-4 text-center"><h4 class="font-semibold text-gray-800">총 준비 용량 (${sites}군데)</h4><p class="text-lg"><span class="result-value">${((0.1 * weight * sites)*0.8).toFixed(2)}mL</span> (부피) + <span class="result-value">${((0.1 * weight * sites)*0.2).toFixed(2)}mL</span> (리도)</p><p class="text-xs text-gray-500 mt-1">부위당 약 ${((0.1 * weight * sites) / sites).toFixed(2)} mL 주입</p></div>`;
    document.getElementById('dog_block_sites').value = sites;
    
    const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
    const pumpRate = (lidoRateMcg * weight * 60) / 2000;
    document.getElementById('lk_cri_calc_result').innerHTML = `<div class="p-4 border rounded-lg bg-gray-50 space-y-2"><h4 class="font-semibold text-gray-800">CRI 펌프 속도 설정</h4><p class="text-xs text-gray-600">🧪 희석: 리도카인 3mL + 케타민 0.12mL + N/S 26.88mL</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="lk_cri_rate_mcg" class="large-interactive-field" onchange="calculateAll()"><option value="25">25</option><option value="30">30</option><option value="50">50</option></select></div><div class="mt-2 text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
    document.getElementById('lk_cri_rate_mcg').value = lidoRateMcg;
    
    document.getElementById('workflow_steps').innerHTML = `<div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 1: 🏥 내원 및 준비</h3><p class="text-sm text-gray-700">IV 장착 후, 준비된 클라바목스 IV를 투여하고 수액 처치를 시작합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 2: 💧 수액처치 & 산소 공급 (최소 10분)</h3><p class="text-sm text-gray-700">계산된 수액 펌프 속도로 수액을 맞추고, 산소를 공급합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 3: 💉 마취 전 투약 및 산소 공급 (3분)</h3><p class="text-sm text-gray-700">마스크로 100% 산소를 공급하며, 준비된 부토르파놀+미다졸람을 천천히 IV 주사합니다.</p></div><div class="warning-card p-4"><h3 class="font-bold text-lg text-amber-800">Step 4: ⚡ LK-CRI 부하 용량 (Loading Dose)</h3><p class="text-sm text-gray-700">마취 유도 직전, 준비된 리도카인과 케타민을 2분에 걸쳐 매우 천천히 IV 주사합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 5: 😴 마취 유도 (Induction)</h3><p class="text-sm text-gray-700">준비된 알팍산을 효과를 봐가며 천천히 주사하여 기관 삽관합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 6: 💨 마취 유지 (Maintenance)</h3><p class="text-sm text-gray-700">삽관 후 즉시 이소플루란 마취를 시작하고, LK-CRI 펌프를 작동시킵니다.</p></div>`;
}

function populateEmergencyTab(weight) {
    const dobutamineDose = parseFloat(document.getElementById('dobutamine_dose_select')?.value) || 5;
    const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * 12.5 / 30));
    document.getElementById('hypotension_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800">📉 저혈압 (MAP < 60)</h4><ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">호흡 마취제 농도 감소</span></li><li><span class="font-bold">환자 상태 확인:</span><ul class="list-disc list-inside ml-4 text-xs"><li><span class="font-semibold">✅ 건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg)</li><li><span class="font-semibold text-red-600">❌ 심장 질환 환자:</span> 수액 볼루스 금기!</li></ul></li></ol><div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2"><h5 class="font-semibold text-center text-sm">❤️ 도부타민 CRI</h5><p class="text-xs text-center mb-1">희석: 원액 0.5mL + N/S 29.5mL</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="dobutamine_dose_select" class="large-interactive-field !text-sm" onchange="calculateAll()"><option value="2">2</option><option value="5" selected>5</option><option value="10">10</option></select></div><p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div>`;
    document.getElementById('dobutamine_dose_select').value = dobutamineDose;
    
    const atropineLowMl = (0.02 * weight) / concentrations.atropine;
    const atropineHighMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('bradycardia_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800 mt-4">💓 서맥 (Bradycardia)</h4><p class="text-xs text-gray-600">저혈압 동반 시, HR < 60-80</p><div class="mt-2 p-3 rounded-lg bg-red-100 text-center"><h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p></div>`;
    
    const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
    const epiHighMl = (0.1 * weight) / concentrations.epinephrine;
    const atropineCpaMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('cpa_protocol').innerHTML = `<ol class="list-decimal list-inside mt-2 space-y-3 text-sm"><li><span class="font-bold">흉부압박 & 환기:</span> 100-120회/분, 6초에 1회 환기.</li><li><span class="font-bold">약물 투여:</span> 2분마다 교대하며 투여.</li></ol><div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center"><h5 class="font-semibold text-sm">💉 에피네프린 (Low dose)</h5><p class="text-xs mb-1 font-semibold">희석: 에피 원액 0.1mL + N/S 0.9mL</p><p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr class="my-2"><h5 class="font-semibold text-sm">💉 아트로핀</h5><p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL IV</p><hr class="my-2"><h5 class="font-semibold text-sm">💉 에피네프린 (High dose)</h5><p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p></div>`;
}

function populateEtco2Tab() {
    document.getElementById('etco2Tab').innerHTML = `<div class="card p-6 md:p-8"><div class="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-green-500"><div class="flex items-center"><svg class="w-8 h-8 text-green-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><h3 class="text-xl font-bold text-gray-800">EtCO2 정상 범위: 35 - 45 mmHg</h3></div></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-8"><div class="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg"><h2 class="text-xl font-bold text-blue-700 mb-2">EtCO2 저하 (&lt; 35 mmHg)</h2><ol class="list-decimal list-inside text-gray-700 space-y-2 text-sm"><li><strong>인공호흡기 조절</strong><ul class="list-disc list-inside ml-4"><li><strong>1순위: '호흡수(RR)'</strong> <span class="font-bold">▼낮춤</span></li><li><strong>2순위: '1회호흡량(VT)'</strong> <span class="font-bold">▼줄임</span></li></ul></li><li><strong>환자 상태 교정</strong><ul class="list-disc list-inside ml-4"><li><strong>저체온증:</strong> 보온 장비로 체온 상승</li><li><strong>과호흡:</strong> 진통/마취 심도 조절</li></ul></li></ol></div><div class="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"><h2 class="text-xl font-bold text-red-700 mb-2">EtCO2 상승 (&gt; 45 mmHg)</h2><ol class="list-decimal list-inside text-gray-700 space-y-2 text-sm"><li><strong>환기 개선 (가장 먼저!)</strong><ul class="list-disc list-inside ml-4"><li><strong>1순위: '호흡수(RR)'</strong> <span class="font-bold">▲높임</span></li><li><strong>2순위: '1회호흡량(VT)'</strong> <span class="font-bold">▲늘림</span></li></ul></li><li><strong>재호흡 원인 제거</strong><ul class="list-disc list-inside ml-4"><li><strong>CO2 흡수제:</strong> 색 변화 시 즉시 교체</li></ul></li></ol></div></div></div>`;
}

function populateDischargeTab(weight) {
    const status = getPatientStatus();
    const isKidney = status.kidney;
    
    const generalDays = parseInt(document.getElementById('prescription_days')?.value) || 7;
    let vetrocamDays = parseInt(document.getElementById('vetrocam_days')?.value);
    if(isNaN(vetrocamDays)) vetrocamDays = 3;

    const getPillCount = (mgPerDose, frequency, pillStrength, days) => { if (days <= 0) return "일수 입력 필요"; const pillsPerDose = mgPerDose / pillStrength; const totalPills = Math.ceil(pillsPerDose * frequency * days * 2) / 2; return `<strong>${totalPills.toFixed(1).replace('.0','')}정</strong> (${pillStrength}mg/정) | 1회 ${pillsPerDose.toFixed(2)}정, ${frequency}회/일`; };
    
    let totalVetrocamDoseMl = 0;
    if (vetrocamDays >= 1) { totalVetrocamDoseMl += weight * 0.2; if (vetrocamDays > 1) totalVetrocamDoseMl += (vetrocamDays - 1) * (weight * 0.1); }
    
    const goldStandardDiv = document.getElementById('discharge_gold');
    goldStandardDiv.className = `p-4 rounded-lg space-y-3 ${isKidney ? 'kidney-warning' : 'bg-green-50'}`;
    goldStandardDiv.innerHTML = `<h3 class="font-bold text-lg mb-2 ${isKidney ? 'text-red-800' : 'text-green-700'}">🥇 시나리오 1: 골드 스탠다드</h3>${isKidney ? '<p class="font-bold text-red-800 mb-2">🚨 신장수치 이상 환자에게 NSAID 처방 시 주의가 필요합니다!</p>' : ''}<div><label class="font-semibold text-sm">베트로캄 처방일:</label><input type="number" id="vetrocam_days" value="${vetrocamDays}" class="large-interactive-field !p-1 !text-base" oninput="calculateAll()"></div><p><strong>- 베트로캄(액상):</strong> 총 <span class="result-value">${totalVetrocamDoseMl.toFixed(2)} mL</span> (염증/통증 완화)</p><hr><p><strong>- 가바펜틴 (5mg/kg, BID):</strong></p><div class="text-sm p-2 bg-green-100 rounded">${getPillCount(5*weight, 2, pillStrengths.gabapentin, generalDays)}</div><hr><p class="font-semibold text-sm">- 기본 항생제: 아목시실린</p><div class="text-sm p-2 bg-green-100 rounded">${getPillCount(12.5*weight, 2, pillStrengths.amoxicillin_capsule, generalDays)}</div>`;
    
    document.getElementById('discharge_alt').innerHTML = `<h3 class="font-bold text-lg text-orange-700 mb-2 mt-6">🥈 시나리오 2: NSAID-Sparing</h3><div class="info-box mb-2 text-xs"><p>NSAIDs 금기 또는 위장관 부작용이 우려되는 환자에게 적용합니다.</p><p class="font-bold text-red-600">🚨 주의: 아세트아미노펜은 고양이에게 절대 금기!</p></div><div class="p-4 bg-orange-50 rounded-lg space-y-3"><p><strong>- 가바펜틴 (10mg/kg, BID):</strong></p><div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(10*weight, 2, pillStrengths.gabapentin, generalDays)}</div><hr><p><strong>- 아세트아미노펜 (15mg/kg, BID):</strong></p><div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(15*weight, 2, pillStrengths.acetaminophen, generalDays)}</div><hr><p class="font-semibold text-sm">- 위장관 보호제 (선택): 파모티딘</p><div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(0.5*weight, 2, pillStrengths.famotidine, generalDays)}</div></div>`;
}

function populateProtocolTab(weight) {
    const status = getPatientStatus();
    const protocolTab = document.getElementById('protocolTab');
    
    // 이전에 있던 경고 메시지 삭제
    const existingWarning = protocolTab.querySelector('.liver-warning-card');
    if (existingWarning) existingWarning.remove();
    
    // 간수치 이상 시 경고 메시지 추가
    if (status.liver) {
        const liverWarningHTML = `<div class="warning-card p-4 my-6 liver-warning-card"><h3 class="font-bold text-lg text-amber-800 flex items-center"><i class="fas fa-exclamation-triangle mr-3"></i>⚠️ 간수치 이상 환자 주의</h3><p class="text-amber-700 mt-2">부프레노르핀은 주로 간에서 대사됩니다. <strong>간 기능 저하 환자</strong>의 경우 약물 작용 시간이 길어지거나 부작용 위험이 증가할 수 있습니다. 패치 적용 시 용량 조절을 고려하고, 환자 상태를 더욱 면밀히 모니터링해야 합니다. (프로토콜 7번 항목 참조)</p></div>`;
        protocolTab.insertAdjacentHTML('afterbegin', liverWarningHTML);
    }
    updatePatchRecommendation(weight);
}

function populateEducationTab() {
    // 템플릿에서 내용을 가져와 삽입
    const educationTab = document.getElementById('educationTab');
    if(educationTab.children.length === 0) {
        educationTab.innerHTML = document.getElementById('보호자교육_템플릿').innerHTML;
    }
    
    const attachDateEl = document.getElementById('attachDate');
    if (attachDateEl && !attachDateEl.value) { // 값이 없을 때만 초기화
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('attachDate').value = `${yyyy}-${mm}-${dd}`;
        document.getElementById('attachTime').value = `${hh}:${min}`;
        calculateRemovalDate();
    }
}

// --- 저장 및 보조 기능 ---
function calculateRemovalDate() {
    const dateInput = document.getElementById('attachDate')?.value; const timeInput = document.getElementById('attachTime')?.value; const removalInfoDiv = document.getElementById('removalInfo');
    if (!dateInput || !timeInput || !removalInfoDiv) return;
    const attachDateTime = new Date(`${dateInput}T${timeInput}`);
    if (isNaN(attachDateTime.getTime())) { removalInfoDiv.innerHTML = '<p class="font-bold text-red-700">유효한 날짜와 시간을 입력해주세요.</p>'; return; }
    const removalDateStart = new Date(attachDateTime.getTime()); removalDateStart.setHours(attachDateTime.getHours() + 72);
    const removalDateEnd = new Date(attachDateTime.getTime()); removalDateEnd.setHours(attachDateTime.getHours() + 96);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    removalInfoDiv.innerHTML = `<h4 class="text-lg font-bold text-gray-800 mb-2">🗓️ 패치 제거 권장 기간</h4><p class="text-base text-gray-700"><strong class="text-blue-600">${new Intl.DateTimeFormat('ko-KR', options).format(removalDateStart)}</strong> 부터<br><strong class="text-blue-600">${new Intl.DateTimeFormat('ko-KR', options).format(removalDateEnd)}</strong> 사이에<br>패치를 제거해주세요.</p>`;
}

function saveAsPDF() { window.print(); }

function saveAsImage() {
    const captureElement = document.getElementById('captureArea'); const patientName = document.getElementById('patientName').value || '환자';
    html2canvas(captureElement, { useCORS: true, scale: 2 }).then(canvas => { const link = document.createElement('a'); link.download = `${patientName}_통증패치_안내문.png`; link.href = canvas.toDataURL('image/png'); link.click(); });
}

function exportPrepSheetAsImage() {
    const captureElement = document.getElementById('prepTab'); const weight = document.getElementById('weight').value;
    if (!weight) { alert('환자 체중을 입력해주세요.'); return; }
    html2canvas(captureElement, { useCORS: true, scale: 1.5, backgroundColor: '#f8f9fa' }).then(canvas => { const link = document.createElement('a'); link.download = `환자_${weight}kg_마취준비시트.png`; link.href = canvas.toDataURL('image/png'); link.click(); });
}

function savePrepSheetAsJSON() {
    const weight = parseFloat(document.getElementById('weight').value);
    if (!weight || weight <= 0) { alert('환자 체중을 입력 후 시도해주세요.'); return; }
    const patientName = document.getElementById('patientName_main')?.value || '환자';
    const status = getPatientStatus();
    const record = { meta: { patientName, recordDate: new Date().toISOString() }, patientInfo: { weightKg: weight, status: Object.keys(status).length ? Object.keys(status) : ['healthy'] }, finalEtTube: selectedTubeInfo, preAnestheticDrugs: { /* ... 약물 정보 ... */ } };
    const jsonString = JSON.stringify(record, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${patientName}_${weight}kg_마취기록.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// --- ET Tube 계산기 및 기록 ---
function populateEtTubeTab() {
    if(!document.getElementById('etTubeTab').innerHTML) {
      document.getElementById('etTubeTab').innerHTML = document.getElementById('et_tube_템플릿').innerHTML;
    }
}
function calculateWeightSize() {
    const weightInput = document.getElementById('weight-input'); const resultContainerWeight = document.getElementById('result-container-weight'); const resultTextWeight = document.getElementById('result-text-weight');
    if (!resultContainerWeight) return;
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) { resultContainerWeight.classList.add('hidden'); return; }
    let recommendedSize = '13.0 이상';
    for (let i = 0; i < weightSizeGuide.length; i++) { if (weight <= weightSizeGuide[i].weight) { recommendedSize = weightSizeGuide[i].size; break; } }
    resultTextWeight.textContent = recommendedSize; resultContainerWeight.classList.remove('hidden');
}
function calculateTracheaSize() {
    const tracheaInput = document.getElementById('trachea-input'); const resultContainerTrachea = document.getElementById('result-container-trachea'); const resultTextTrachea = document.getElementById('result-text-trachea');
    const diameter = parseFloat(tracheaInput.value);
    if (isNaN(diameter) || diameter <= 0) { resultContainerTrachea.classList.add('hidden'); return; }
    let recommendedId = '8.0 이상';
     for (let i = 0; i < tracheaSizeGuide.length; i++) { if (diameter <= tracheaSizeGuide[i].diameter) { recommendedId = tracheaSizeGuide[i].id; break; } }
    resultTextTrachea.textContent = recommendedId; resultContainerTrachea.classList.remove('hidden');
}
function saveAndDisplayTubeSelection() {
    const sizeInput = document.getElementById('selectedEtTubeSize'); const cuffInput = document.getElementById('selectedEtTubeCuff'); const notesInput = document.getElementById('selectedEtTubeNotes');
    if (!sizeInput.value) { alert('최종 ET Tube 사이즈를 입력해주세요.'); sizeInput.focus(); return; }
    selectedTubeInfo.size = parseFloat(sizeInput.value); selectedTubeInfo.cuff = cuffInput.checked; selectedTubeInfo.notes = notesInput.value;
    const saveButton = document.getElementById('saveEtTubeSelection'); saveButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>✅ 저장 완료!'; saveButton.classList.replace('bg-blue-600', 'bg-green-600');
    setTimeout(() => { saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>💾 기록 저장'; saveButton.classList.replace('bg-green-600', 'bg-blue-600'); }, 2000);
    updateTubeDisplay();
}
function updateTubeDisplay() {
    const displayDiv = document.getElementById('et_tube_selection_display'); if (!displayDiv) return;
    if (selectedTubeInfo.size) {
        const cuffStatus = selectedTubeInfo.cuff ? '<span class="text-green-600 font-semibold"><i class="fas fa-check-circle mr-1"></i>확인</span>' : '<span class="text-red-600 font-semibold"><i class="fas fa-times-circle mr-1"></i>미확인</span>';
        const notesText = selectedTubeInfo.notes ? `<p class="text-sm text-gray-600 mt-2"><strong>📝 메모:</strong> ${selectedTubeInfo.notes}</p>` : '';
        displayDiv.innerHTML = `<div class="text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4"><p class="text-lg"><strong>📏 선택된 Tube (ID):</strong> <span class="result-value text-2xl">${selectedTubeInfo.size}</span></p><p class="text-lg"><strong>💨 커프 확인:</strong> ${cuffStatus}</p></div>${notesText}`;
    } else { displayDiv.innerHTML = '<p class="text-gray-700">ET Tube가 아직 선택되지 않았습니다. \'📏 ET Tube 계산기\' 탭에서 기록해주세요.</p>'; }
}

// --- DOM 로드 후 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    // 템플릿 기반 탭들 초기화 (최초 1회)
    document.getElementById('protocolTab').innerHTML = document.getElementById('노스판_프로토콜_템플릿').innerHTML;
    document.getElementById('etTubeTab').innerHTML = document.getElementById('et_tube_템플릿').innerHTML;
    document.getElementById('educationTab').innerHTML = document.getElementById('보호자교육_템플릿').innerHTML;
    
    // 이벤트 리스너 연결
    document.getElementById('weight').addEventListener('input', calculateAll);
    document.querySelectorAll('.patient-status-group input').forEach(el => el.addEventListener('change', calculateAll));
    document.body.addEventListener('change', function(e) {
        if(e.target.matches('#prescription_days, #vetrocam_days')) {
            calculateAll();
        }
    });
    
    // ET Tube 탭 내부 이벤트 리스너
    document.getElementById('calculate-weight-btn').addEventListener('click', calculateWeightSize);
    document.getElementById('weight-input').addEventListener('input', calculateWeightSize);
    document.getElementById('calculate-trachea-btn').addEventListener('click', calculateTracheaSize);
    document.getElementById('trachea-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateTracheaSize(); });
    document.getElementById('saveEtTubeSelection').addEventListener('click', saveAndDisplayTubeSelection);
    
    // 보호자 교육 탭 이벤트 리스너
    document.getElementById('attachDate').addEventListener('change', calculateRemovalDate);
    document.getElementById('attachTime').addEventListener('change', calculateRemovalDate);
    
    // 초기 계산 실행
    calculateAll();
});
