// --- 전역 변수 및 상수 ---
const concentrations = { lidocaine: 20, ketamine: 100, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, cerenia: 10, cephron: 50, baytril25: 25, baytril50: 50 };
const pillStrengths = { gabapentin: 100, acetaminophen: 160, amoxicillin_capsule: 250, famotidine: 10, misoprostol: 100 };
let selectedTubeInfo = { size: null, cuff: false, notes: '' };

// --- 탭 관리 함수 ---
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// --- 메인 계산 함수 ---
function calculateAll() {
    const weightInput = document.getElementById('weight');
    const weight = parseFloat(weightInput.value);

    if (!weight || weight <= 0) {
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            if (tab.id === 'etTubeTab' || tab.id === 'protocolTab' || tab.id === 'educationTab') {
                 // 이 탭들은 구조를 유지해야 하므로 비우지 않음
            } else {
                 tab.innerHTML = '<p class="text-gray-500 p-8 text-center text-xl">상단에서 환자 체중을 먼저 입력해주세요.</p>';
            }
        });
        const weightInputTube = document.getElementById('weight-input');
        if (weightInputTube) {
            weightInputTube.value = '';
            calculateWeightSize();
        }
        document.getElementById('patch_recommendation').innerHTML = '';
        return;
    }
    
    populatePrepTab(weight);
    populateEmergencyTab(weight);
    populateEtco2Tab();
    populateEtTubeTab();
    populateDischargeTab(weight);
    populateProtocolTab(weight);
    populateEducationTab();

    const weightInputTube = document.getElementById('weight-input');
    if (weightInputTube) {
        weightInputTube.value = weight;
        calculateWeightSize();
    }
    updatePatchRecommendation(weight);
}

function getPatientStatus() {
    const statuses = {};
    document.querySelectorAll('input[name="patient_status"]:checked').forEach((checkbox) => {
        statuses[checkbox.value] = true;
    });
    return statuses;
}

// --- 탭별 내용 채우기 ---
function updatePatchRecommendation(weight) {
    const recommendationDiv = document.getElementById('patch_recommendation');
    if (!recommendationDiv) return;
    let patchType = '', patchColor = 'gray';
    // *** 요청사항 반영: 추천 용량 기준 변경 ***
    if (weight > 0 && weight <= 3) { patchType = '5 mcg/h'; patchColor = 'blue'; } 
    else if (weight > 3 && weight <= 6) { patchType = '10 mcg/h'; patchColor = 'green'; } 
    else if (weight > 6) { patchType = '20 mcg/h'; patchColor = 'red'; } 
    else { recommendationDiv.innerHTML = ''; return; }
    recommendationDiv.innerHTML = `<div class="p-4 rounded-lg bg-${patchColor}-100 border-l-4 border-${patchColor}-500"><h3 class="text-xl font-bold text-${patchColor}-800 flex items-center"><i class="fas fa-syringe mr-3"></i>🩹 환자 맞춤 패치 추천</h3><p class="text-lg text-gray-800 mt-2">현재 체중 <strong>${weight}kg</strong> 환자에게는 <strong>${patchType} 노스판 패치</strong> 적용을 권장합니다.</p></div>`;
}

function populatePrepTab(weight) {
    const prepTab = document.getElementById('prepTab');
    const status = getPatientStatus();
    
    const cereniaMl = (1.0 * weight) / concentrations.cerenia;
    const butorMl = (0.2 * weight) / concentrations.butorphanol;
    const midaMl = (0.2 * weight) / concentrations.midazolam;
    const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
    const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
    const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
    const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
    const propofolMlMin = (1 * weight) / concentrations.propofol;
    const propofolMlMax = (4 * weight) / concentrations.propofol;
    
    const fluidRate = (status.cardiac || status.kidney) ? 2 : 5;
    const fluidTarget = fluidRate * weight;
    const pumpCorrectionFactor = 0.7;
    const fluidCorrected = fluidTarget / pumpCorrectionFactor;
    
    const selectedAbxKey = document.getElementById('antibiotic_choice')?.value || 'baytril50';
    let abxMl = 0, abxDoseText = '';
    if (selectedAbxKey.includes('baytril')) { abxDoseText = "2.5mg/kg"; abxMl = (2.5 * weight) / concentrations[selectedAbxKey]; } 
    else if (selectedAbxKey === 'cephron') { abxDoseText = "2.2mg/kg"; abxMl = (2.2 * weight) / concentrations[selectedAbxKey]; }

    prepTab.innerHTML = `
        <div class="no-print p-4 mb-4 bg-gray-100 rounded-lg flex flex-wrap justify-center gap-4">
            <button onclick="exportPrepSheetAsImage()" class="bg-green-600 hover:bg-green-700 text-white action-button flex items-center justify-center">
                <i class="fas fa-camera mr-2"></i> 📸 이미지로 저장
            </button>
            <button onclick="savePrepSheetAsJSON()" class="bg-indigo-600 hover:bg-indigo-700 text-white action-button flex items-center justify-center">
                <i class="fas fa-file-code mr-2"></i> 💾 JSON으로 기록 저장
            </button>
        </div>
        <div class="card p-6 md:p-8">
            <h2 class="section-title">📌 최종 선택 ET Tube</h2>
            <div id="et_tube_selection_display" class="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg mb-6 text-center"></div>
            <h2 class="section-title">🧪 수술 전 약물 준비 (Pre-Anesthetic Drug Prep)</h2>
            <div class="info-box mb-6"><p><strong>🎯 목표:</strong> 마취에 필요한 모든 주사 약물과 수액을 미리 정확한 용량으로 준비하여, 마취 과정 중 실수를 방지하고 신속하게 대처합니다.</p></div>
            <div id="pre_op_drugs_result" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-center">
                 <div class="p-3 bg-green-50 rounded-lg"><h4 class="font-bold text-green-800">구토 예방/진통보조</h4><p><span class="result-value">${cereniaMl.toFixed(2)} mL</span> (세레니아)</p></div>
                 <div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold text-teal-800">예방적 항생제</h4><select id="antibiotic_choice" class="w-full border rounded p-1 mt-1 text-sm bg-white" onchange="calculateAll()"><option value="baytril50">바이트릴 50주</option><option value="baytril25">바이트릴 25주</option><option value="cephron">세프론 세븐</option></select><p class="mt-1"><span class="result-value">${abxMl.toFixed(2)} mL</span> <span class="text-xs">(${abxDoseText})</span></p></div>
                 <div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold text-blue-800">😌 마취 전 투약</h4><p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p></div>
                 <div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold text-amber-800">⚡ LK 부하 용량</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p><p class="text-xs text-gray-600 font-semibold mt-1">※ 희석: 케타민 0.1mL + N/S 0.9mL</p></div>
                 <div class="p-3 bg-indigo-50 rounded-lg"><h4 class="font-bold text-indigo-800">💤 마취 유도제 ${status.cardiac ? '<span class="text-red-500">(추천)</span>' : ''}</h4><p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span> 알팍산</p></div>
                 <div class="p-3 bg-purple-50 rounded-lg"><h4 class="font-bold text-purple-800">💤 마취 유도제</h4><p><span class="result-value">${propofolMlMin.toFixed(2)}~${propofolMlMax.toFixed(2)} mL</span> 프로포폴</p></div>
                 <div class="p-3 bg-cyan-50 rounded-lg"><h4 class="font-bold text-cyan-800">💧 수액 펌프</h4><p><span class="result-value">${fluidCorrected.toFixed(1)} mL/hr</span></p><p class="text-xs text-gray-500 mt-1">(목표: ${fluidTarget.toFixed(1)}mL/hr)</p></div>
                 ${status.cardiac ? '<div class="p-3 bg-red-50 rounded-lg col-span-full text-sm"><p class="font-bold text-red-700">❤️ 심장질환 환자는 혈압 변동성이 적은 알팍산 사용을 우선적으로 권장합니다.</p></div>' : ''}
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="card p-6 md:p-8"><h2 class="section-title">💉 국소마취 (너브 블락)</h2><div id="dog_nerve_block_result" class="space-y-4"></div></div>
            <div class="card p-6 md:p-8"><h2 class="section-title">💧 LK-CRI 계산기</h2><div id="lk_cri_calc_result" class="space-y-4"></div></div>
        </div>
        <div class="card p-6 md:p-8"><h2 class="section-title">🗺️ 마취 워크플로우</h2><div id="workflow_steps" class="space-y-4"></div></div>
    `;

    if(document.getElementById('antibiotic_choice')) document.getElementById('antibiotic_choice').value = selectedAbxKey;
    updateTubeDisplay();

    const sites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;
    document.getElementById('dog_nerve_block_result').innerHTML = `<div class="info-box mb-4"><p><strong>🎯 목표:</strong> 수술 부위의 통증 신호를 원천적으로 차단하여 호흡마취제 요구량을 줄이고, 수술 후 통증을 최소화합니다.</p></div><div class="space-y-2"><label for="dog_block_sites" class="font-semibold text-gray-700">📍 마취 부위 수:</label><select id="dog_block_sites" class="large-interactive-field" onchange="calculateAll()"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select></div><div class="p-3 border rounded-lg bg-gray-50 mt-4 text-center"><h4 class="font-semibold text-gray-800">총 준비 용량 (${sites}군데)</h4><p class="text-lg"><span class="result-value">${((0.1 * weight * sites)*0.8).toFixed(2)}mL</span> (부피) + <span class="result-value">${((0.1 * weight * sites)*0.2).toFixed(2)}mL</span> (리도)</p><p class="text-xs text-gray-500 mt-1">부위당 약 ${((0.1 * weight * sites) / sites).toFixed(2)} mL 주입</p></div>`;
    document.getElementById('dog_block_sites').value = sites;
    const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
    const pumpRate = (lidoRateMcg * weight * 60) / 2000;
    document.getElementById('lk_cri_calc_result').innerHTML = `<div class="info-box mb-4"><p><strong>🎯 목표:</strong> 리도카인(L)과 케타민(K)을 지속적으로 정맥 주입(CRI)하여, 마취 중 통증 자극을 억제하고 마취를 안정적으로 유지합니다.</p></div><div class="p-4 border rounded-lg bg-gray-50 space-y-2"><h4 class="font-semibold text-gray-800">CRI 펌프 속도 설정</h4><p class="text-xs text-gray-600">🧪 희석: 리도카인 3mL + 케타민 0.12mL + N/S 26.88mL</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="lk_cri_rate_mcg" class="large-interactive-field" onchange="calculateAll()"><option value="25">25</option><option value="30">30</option><option value="50">50</option></select></div><div class="mt-2 text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
    document.getElementById('lk_cri_rate_mcg').value = lidoRateMcg;
    document.getElementById('workflow_steps').innerHTML = `<div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 1: 🏥 내원 및 준비</h3><p class="text-sm text-gray-700">보호자 동의서 작성. 환자는 즉시 IV 카테터 장착 후, 준비된 항생제/세레니아를 투여하고 수액 처치를 시작합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 2: 💧 수액처치 & 산소 공급 (최소 10분)</h3><p class="text-sm text-gray-700">'약물 준비' 섹션에 계산된 수액 펌프 속도로 수액을 맞추고, 수술 준비 동안 입원장 안에서 산소를 공급합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 3: 💉 마취 전 투약 및 산소 공급 (3분)</h3><p class="text-sm text-gray-700">마스크로 100% 산소를 공급하면서, 준비된 부토르파놀 + 미다졸람을 3분에 걸쳐 천천히 IV로 주사합니다.</p></div><div class="warning-card p-4"><h3 class="font-bold text-lg text-amber-800">Step 4: ⚡ LK-CRI 부하 용량 (Loading Dose)</h3><p class="text-sm text-gray-700">마취 유도 직전, 준비된 리도카인과 케타민을 2분에 걸쳐 매우 천천히 IV로 주사합니다. 이는 통증 증폭을 막는 핵심 단계입니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 5: 😴 마취 유도 (Induction)</h3><p class="text-sm text-gray-700">준비된 알팍산 또는 다른 유도제를 효과를 봐가며 천천히 주사하여 기관 삽관합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 6: 💨 마취 유지 (Maintenance)</h3><p class="text-sm text-gray-700">삽관 후 즉시 이소플루란 마취를 시작하고, 동시에 LK-CRI 펌프를 작동시키며 수액 펌프 속도를 '마취 중' 권장 설정값으로 변경합니다.</p></div>`;
}

function populateEmergencyTab(weight) {
    const emergencyTab = document.getElementById('emergencyTab');
    const dobutamineDose = parseFloat(document.getElementById('dobutamine_dose_select')?.value) || 2;
    const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (concentrations.dobutamine_raw * 0.5 / 30));
    const atropineLowMl = (0.02 * weight) / concentrations.atropine;
    const atropineHighMl = (0.04 * weight) / concentrations.atropine;
    const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
    const epiHighMl = (0.1 * weight) / concentrations.epinephrine;
    const atropineCpaMl = (0.04 * weight) / concentrations.atropine;

    emergencyTab.innerHTML = `<div class="card p-6 md:p-8"><h2 class="section-title text-red-600"><i class="fas fa-triangle-exclamation mr-3"></i>🚨 마취 중 문제 해결 (Troubleshooting)</h2><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="emergency-card p-6 rounded-lg"><h3 class="font-bold text-xl text-red-800">📉 저혈압 & 서맥</h3><div id="hypotension_protocol"><h4 class="font-bold text-lg text-red-800">📉 저혈압 (MAP < 60)</h4><ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">1️⃣ 호흡 마취제 농도 감소</span></li><li><span class="font-bold">2️⃣ 환자 상태 확인:</span><ul class="list-disc list-inside ml-4 text-xs"><li><span class="font-semibold">✅ 건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg over 10-15min)</li><li><span class="font-semibold text-red-600">❌ 심장 질환 환자:</span> 수액 볼루스 금기! 승압제 우선.</li></ul></li><li><span class="font-bold">3️⃣ 약물 고려:</span><div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2"><h5 class="font-semibold text-center text-sm">❤️ 도부타민 CRI</h5><p class="text-xs text-center mb-1">희석: 원액 0.5mL + N/S 29.5mL</p><div><label class="text-sm font-semibold">목표(mcg/kg/min):</label><select id="dobutamine_dose_select" class="large-interactive-field !text-sm !py-1" onchange="calculateAll()"><option value="2">2</option><option value="5">5</option><option value="10">10</option></select></div><p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div></li></ol></div><div id="bradycardia_protocol" class="mt-4"><h4 class="font-bold text-lg text-red-800 mt-4">💓 서맥 (Bradycardia)</h4><p class="text-xs text-gray-600">저혈압 동반 시, 심박수 < 60-80 bpm 고려</p><div class="mt-2 p-3 rounded-lg bg-red-100 text-center"><h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p></div></div></div><div class="emergency-card p-6 rounded-lg"><h3 class="font-bold text-xl text-red-800">💔 심정지 (CPA) 프로토콜</h3><div id="cpa_protocol"><ol class="list-decimal list-inside mt-2 space-y-3 text-sm"><li><span class="font-bold">흉부압박 & 환기:</span> 100-120회/분 압박, 6초에 1회 환기.</li><li><span class="font-bold">약물 투여:</span> 2분마다 교대하며 투여.</li></ol><div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center"><h5 class="font-semibold text-sm">💉 에피네프린 (Low dose)</h5><p class="text-xs mb-1 font-semibold">희석: 원액 0.1mL + N/S 0.9mL</p><p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr class="my-2"><h5 class="font-semibold text-sm">💉 아트로핀</h5><p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL IV</p><hr class="my-2"><h5 class="font-semibold text-sm">💉 에피네프린 (High dose)</h5><p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p></div></div></div></div></div>`;
    if(document.getElementById('dobutamine_dose_select')) document.getElementById('dobutamine_dose_select').value = dobutamineDose;
}

function populateEtco2Tab() {
    document.getElementById('etco2Tab').innerHTML = `<div class="card p-6 md:p-8"><div class="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-green-500"><div class="flex items-center"><svg class="w-8 h-8 text-green-500 mr-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><h3 class="text-xl font-bold text-gray-800">EtCO2 정상 범위: 35 - 45 mmHg</h3></div></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-8"><div class="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg"><h2 class="text-xl font-bold text-blue-700 mb-2">EtCO2 저하 (&lt; 35 mmHg)</h2><h3 class="font-semibold text-gray-800 mb-1">🛠️ 대처법</h3><ol class="list-decimal list-inside text-gray-700 space-y-2 text-sm"><li><strong>인공호흡기 조절</strong><ul class="list-disc list-inside ml-4"><li><strong>1순위: '호흡수(RR)'</strong>를 <span class="font-bold">▼낮춥니다.</span></li><li><strong>2순위: '1회호흡량(VT)'</strong>을 <span class="font-bold">▼줄입니다.</span></li></ul></li><li><strong>환자 상태 교정</strong><ul class="list-disc list-inside ml-4"><li><strong>저체온증:</strong> 보온 장비로 체온을 올립니다.</li><li><strong>과호흡:</strong> 진통/마취 심도를 조절합니다.</li></ul></li></ol></div><div class="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"><h2 class="text-xl font-bold text-red-700 mb-2">EtCO2 상승 (&gt; 45 mmHg)</h2><h3 class="font-semibold text-gray-800 mb-1">🛠️ 대처법</h3><ol class="list-decimal list-inside text-gray-700 space-y-2 text-sm"><li><strong>환기 개선 (가장 먼저!)</strong><ul class="list-disc list-inside ml-4"><li><strong>1순위: '호흡수(RR)'</strong>를 <span class="font-bold">▲높입니다.</span></li><li><strong>2순위: '1회호흡량(VT)'</strong>을 <span class="font-bold">▲늘립니다.</span></li></ul></li><li><strong>재호흡 원인 제거</strong><ul class="list-disc list-inside ml-4"><li><strong>CO2 흡수제:</strong> 색이 변했으면 즉시 교체합니다.</li></ul></li></ol></div></div></div>`;
}

function populateDischargeTab(weight) {
    const dischargeTab = document.getElementById('dischargeTab');
    const status = getPatientStatus();
    const isKidney = status.kidney;

    const generalDays = parseInt(document.getElementById('prescription_days')?.value) || 7;
    let vetrocamDays = parseInt(document.getElementById('vetrocam_days')?.value);
    if(isNaN(vetrocamDays)) vetrocamDays = 3;

    const getPillCount = (mgPerDose, frequency, pillStrength, days) => { if (days <= 0) return "일수 입력 필요"; const pillsPerDose = mgPerDose / pillStrength; const totalPills = Math.ceil(pillsPerDose * frequency * days * 2) / 2; return `<strong>${totalPills.toFixed(1).replace('.0','')}정</strong> (${pillStrength}mg/정) | 1회 ${pillsPerDose.toFixed(2)}정, ${frequency}회/일`; };
    const getPillCountMcg = (mcgPerDose, frequency, pillStrengthMcg, days) => { if (days <= 0) return "일수 입력 필요"; const pillsPerDose = mcgPerDose / pillStrengthMcg; const totalPills = Math.ceil(pillsPerDose * frequency * days * 2) / 2; return `<strong>${totalPills.toFixed(1).replace('.0','')}정</strong> (${pillStrengthMcg}mcg/정) | 1회 ${pillsPerDose.toFixed(2)}정, ${frequency}회/일`; };
    
    let totalVetrocamDoseMl = 0;
    if (vetrocamDays >= 1) { totalVetrocamDoseMl += weight * 0.2; if (vetrocamDays > 1) totalVetrocamDoseMl += (vetrocamDays - 1) * (weight * 0.1); }
    
    const goldStandardClass = isKidney ? 'p-4 rounded-lg kidney-warning' : 'p-4 bg-green-50 rounded-lg';
    const goldStandardTitleClass = isKidney ? 'text-red-800' : 'text-green-700';

    dischargeTab.innerHTML = `<div class="card p-6 md:p-8"><h2 class="section-title">🏡 수술 후 퇴원약 조제</h2><div class="info-box mb-6"><p><strong>🎯 목표:</strong> 환자가 집으로 돌아간 후에도 통증 없이 편안하게 회복할 수 있도록, 환자 상태에 맞는 최적의 약물을 정확한 용량으로 조제합니다.</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"><div><label for="prescription_days" class="block text-center text-xl font-semibold text-gray-700 mb-2">🗓️ 총 처방일수</label><input type="number" id="prescription_days" value="${generalDays}" class="input-field" oninput="calculateAll()"></div><div id="discharge_gold" class="${goldStandardClass}"><h3 class="font-bold text-lg ${goldStandardTitleClass} mb-2">🥇 시나리오 1: 골드 스탠다드</h3>${isKidney ? '<p class="font-bold text-red-800 mb-2">🚨 신장수치 이상 환자에게 NSAID 처방 시 주의가 필요합니다!</p>' : ''}<div class="space-y-3"><div><label class="font-semibold text-sm">베트로캄 처방일:</label><input type="number" id="vetrocam_days" value="${vetrocamDays}" class="large-interactive-field !p-1 !text-base" oninput="calculateAll()"></div><p><strong>- 베트로캄(액상):</strong> 총 <span class="result-value">${totalVetrocamDoseMl.toFixed(2)} mL</span></p><hr><p><strong>- 가바펜틴 (5mg/kg):</strong></p><div class="text-sm p-2 bg-white rounded">${getPillCount(5*weight, 2, pillStrengths.gabapentin, generalDays)}</div><hr><p><strong>- 미소프로스톨 (3mcg/kg):</strong></p><div class="text-sm p-2 bg-white rounded">${getPillCountMcg(3*weight, 2, pillStrengths.misoprostol, generalDays)}</div><hr><p class="font-semibold text-sm">- 항생제: 아목시실린</p><div class="text-sm p-2 bg-white rounded">${getPillCount(12.5*weight, 2, pillStrengths.amoxicillin_capsule, generalDays)}</div></div></div></div><div id="discharge_alt" class="mt-6"><h3 class="font-bold text-lg text-orange-700 mb-2 mt-6">🥈 시나리오 2: NSAID-Sparing</h3><div class="info-box mb-2 text-xs"><p>NSAIDs 금기 또는 위장관 부작용이 우려되는 환자에게 적용합니다.</p><p class="font-bold text-red-600">🚨 주의: 아세트아미노펜은 고양이에게 절대 금기!</p></div><div class="p-4 bg-orange-50 rounded-lg space-y-3"><p><strong>- 가바펜틴 (10mg/kg):</strong></p><div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(10*weight, 2, pillStrengths.gabapentin, generalDays)}</div><hr><p><strong>- 아세트아미노펜 (15mg/kg):</strong></p><div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(15*weight, 2, pillStrengths.acetaminophen, generalDays)}</div></div></div></div>`;
}

function populateProtocolTab(weight) {
    const protocolTab = document.getElementById('protocolTab');
    protocolTab.innerHTML = document.getElementById('노스판_프로토콜_템플릿').innerHTML;
    updatePatchRecommendation(weight);
}

function populateEducationTab() {
    const educationTab = document.getElementById('educationTab');
    educationTab.innerHTML = document.getElementById('보호자교육_템플릿').innerHTML;
    const attachDateEl = document.getElementById('attachDate');
    if (attachDateEl) {
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

// --- 저장 기능 ---
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
    const captureElement = document.getElementById('prepTab'); const weight = document.getElementById('weight').value; const patientName = document.getElementById('patientName')?.value || '환자';
    if (!weight) { alert('환자 체중을 입력해주세요.'); return; }
    html2canvas(captureElement, { useCORS: true, scale: 1.5, backgroundColor: '#f8f9fa' }).then(canvas => { const link = document.createElement('a'); link.download = `${patientName}_${weight}kg_마취준비시트.png`; link.href = canvas.toDataURL('image/png'); link.click(); });
}

// *** 신규 추가: JSON으로 기록 저장 ***
function savePrepSheetAsJSON() {
    const weight = parseFloat(document.getElementById('weight').value);
    if (!weight || weight <= 0) { alert('환자 체중을 입력 후 시도해주세요.'); return; }
    
    const patientName = document.getElementById('patientName')?.value || '환자_이름_미입력';
    const status = getPatientStatus();
    const fluidRate = (status.cardiac || status.kidney) ? 2 : 5;
    const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
    const sites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;

    const record = {
        meta: {
            patientName: patientName,
            recordDate: new Date().toISOString(),
            version: "5.2"
        },
        patientInfo: {
            weightKg: weight,
            status: Object.keys(status).length > 0 ? Object.keys(status) : ['healthy']
        },
        finalEtTube: selectedTubeInfo,
        preAnestheticDrugs: {
            cerenia: { doseMl: ((1.0 * weight) / concentrations.cerenia).toFixed(2) },
            antibiotic: { type: document.getElementById('antibiotic_choice')?.value || 'baytril50', doseMl: (((document.getElementById('antibiotic_choice')?.value.includes('baytril') ? 2.5 : 2.2) * weight) / concentrations[document.getElementById('antibiotic_choice')?.value || 'baytril50']).toFixed(2) },
            premedication: {
                butorphanolMl: ((0.2 * weight) / concentrations.butorphanol).toFixed(2),
                midazolamMl: ((0.2 * weight) / concentrations.midazolam).toFixed(2)
            },
            lkLoading: {
                lidocaineMl: ((1 * weight) / concentrations.lidocaine).toFixed(2),
                ketamineDilutedMl: ((0.5 * weight) / concentrations.ketamine_diluted).toFixed(2)
            },
            induction: {
                alfaxaloneRangeMl: `${((1 * weight) / concentrations.alfaxalone).toFixed(2)}~${((2 * weight) / concentrations.alfaxalone).toFixed(2)}`,
                propofolRangeMl: `${((1 * weight) / concentrations.propofol).toFixed(2)}~${((4 * weight) / concentrations.propofol).toFixed(2)}`
            }
        },
        fluidTherapy: {
            targetRateMlHr: (fluidRate * weight).toFixed(1),
            pumpSettingMlHr: ((fluidRate * weight) / 0.7).toFixed(1)
        },
        localAnesthesia: {
            sites: sites,
            totalVolumeBupivacaineMl: ((0.1 * weight * sites)*0.8).toFixed(2),
            totalVolumeLidocaineMl: ((0.1 * weight * sites)*0.2).toFixed(2),
            volumePerSiteMl: ((0.1 * weight * sites) / sites).toFixed(2)
        },
        cri: {
            lkCRI: {
                targetMcgKgMin: lidoRateMcg,
                pumpSettingMlHr: ((lidoRateMcg * weight * 60) / 2000).toFixed(2)
            }
        }
    };

    const jsonString = JSON.stringify(record, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${patientName}_${weight}kg_마취기록.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}


// --- ET Tube 계산기 및 기록 관련 함수 ---
const weightSizeGuide = [{ weight: 1, size: '3.0' }, { weight: 2, size: '3.5' },{ weight: 3.5, size: '4.0' }, { weight: 4, size: '4.5' }, { weight: 6, size: '5.5' }, { weight: 8, size: '6.0' }, { weight: 9, size: '7.0' }, { weight: 12, size: '7.0' }, { weight: 14, size: '7.5' }, { weight: 20, size: '9.0' }, { weight: 30, size: '11.0' }, { weight: 40, size: '13.0' }];
const tracheaSizeGuide = [{ diameter: 5.13, id: '2.5' }, { diameter: 5.88, id: '3.0' }, { diameter: 6.63, id: '3.5' }, { diameter: 7.50, id: '4.0' }, { diameter: 8.13, id: '4.5' }, { diameter: 8.38, id: '5.0' }, { diameter: 9.13, id: '5.5' }, { diameter: 10.00, id: '6.0' }, { diameter: 11.38, id: '6.5' }, { diameter: 11.63, id: '7.0' }, { diameter: 12.50, id: '7.5' }, { diameter: 13.38, id: '8.0' }];

function populateEtTubeTab() {
    document.getElementById('etTubeTab').innerHTML = document.getElementById('et_tube_템플릿').innerHTML;
    document.getElementById('calculate-weight-btn').addEventListener('click', calculateWeightSize);
    document.getElementById('calculate-trachea-btn').addEventListener('click', calculateTracheaSize);
    document.getElementById('trachea-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateTracheaSize(); });
    document.getElementById('saveEtTubeSelection').addEventListener('click', saveAndDisplayTubeSelection);
    document.getElementById('weight-input').addEventListener('input', calculateWeightSize);
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
        const cuffStatus = selectedTubeInfo.cuff ? '<span class="text-green-600 font-semibold"><i class="fas fa-check-circle mr-1"></i>확인 완료</span>' : '<span class="text-red-600 font-semibold"><i class="fas fa-times-circle mr-1"></i>미확인</span>';
        const notesText = selectedTubeInfo.notes ? `<p class="text-sm text-gray-600 mt-2"><strong>📝 메모:</strong> ${selectedTubeInfo.notes}</p>` : '';
        displayDiv.innerHTML = `<div class="text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4"><p class="text-lg"><strong>📏 선택된 Tube 사이즈 (ID):</strong> <span class="result-value text-2xl">${selectedTubeInfo.size}</span></p><p class="text-lg"><strong>💨 커프(Cuff) 확인:</strong> ${cuffStatus}</p></div>${notesText}`;
    } else { displayDiv.innerHTML = '<p class="text-gray-700">ET Tube가 아직 선택되지 않았습니다. \'📏 ET Tube 계산기\' 탭에서 기록해주세요.</p>'; }
}

// --- DOM 로드 후 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input, select').forEach(el => {
        if(!el.closest('#etTubeTab') && !el.closest('#educationTab')) {
             el.addEventListener('input', calculateAll);
        }
    });
    calculateAll();
});
