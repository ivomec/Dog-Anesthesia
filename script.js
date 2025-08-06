// --- 전역 변수 및 상수 ---
const concentrations = { lidocaine: 20, ketamine: 100, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, clavamox_iv: 100, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, cerenia: 10, cephron: 50, baytril25: 25, baytril50: 50 };
const pillStrengths = { gabapentin: 100, acetaminophen: 160, amoxicillin_capsule: 250, famotidine: 10, misoprostol: 100 }; // misoprostol 단위는 mcg
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
    const recommendationDiv = document.getElementById('patch_recommendation');
    updateTubeDisplay();

    if (!weightInput || !weightInput.value || parseFloat(weightInput.value) <= 0) {
        if(recommendationDiv) recommendationDiv.innerHTML = '';
        const weightInputTube = document.getElementById('weight-input');
        if (weightInputTube) {
            weightInputTube.value = '';
            calculateWeightSize();
        }
        // 체중 미입력 시 모든 탭 초기화
        document.querySelectorAll('.tab-content').forEach(tab => {
            if(tab.id !== 'etTubeTab' && tab.id !== 'educationTab' && tab.id !== 'protocolTab') {
                 tab.innerHTML = '<p class="text-gray-500 p-8 text-center text-xl">메인 화면에서 환자 체중을 먼저 입력해주세요.</p>';
            }
        });
        return;
    }
    
    const weight = parseFloat(weightInput.value);
    
    // ★★★★★ ET Tube 계산기 자동화 ★★★★★
    const weightInputTube = document.getElementById('weight-input');
    if (weightInputTube) {
        weightInputTube.value = weight;
        calculateWeightSize();
    }
    
    populateAllTabs(weight);
}

// --- 모든 탭 내용 채우기 (마스터 함수) ---
function populateAllTabs(weight) {
    populatePrepTab(weight);
    populateEmergencyTab(weight);
    populateEtco2Tab(); // 신규 추가
    populateDischargeTab(weight);
    updatePatchRecommendation(weight);
    // ET Tube, Protocol, Education 탭은 체중과 무관하게 내용이 표시되거나 자체 로직을 가지므로 여기서는 제외
}


// --- 탭별 내용 채우기 ---
function updatePatchRecommendation(weight) {
    const recommendationDiv = document.getElementById('patch_recommendation');
    if (!recommendationDiv) return;
    let patchType = '', patchColor = 'gray';
    if (weight > 0 && weight <= 3) { patchType = '5 mcg/h'; patchColor = 'blue'; } 
    else if (weight > 3 && weight <= 6) { patchType = '10 mcg/h'; patchColor = 'green'; } 
    else if (weight > 6) { patchType = '20 mcg/h'; patchColor = 'red'; } 
    else { recommendationDiv.innerHTML = ''; return; }
    recommendationDiv.innerHTML = `<div class="p-4 rounded-lg bg-${patchColor}-100 border-l-4 border-${patchColor}-500"><h3 class="text-xl font-bold text-${patchColor}-800 flex items-center"><i class="fas fa-syringe mr-3"></i>🩹 환자 맞춤 패치 추천</h3><p class="text-lg text-gray-800 mt-2">현재 체중 <strong>${weight}kg</strong> 환자에게는 <strong>${patchType} 노스판 패치</strong> 적용을 권장합니다.</p></div>`;
}

function populatePrepTab(weight) {
    const isCardiac = document.querySelector('input[value="cardiac"]').checked;
    
    const cereniaMl = (1.0 * weight) / concentrations.cerenia;
    const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
    const butorMl = (0.2 * weight) / concentrations.butorphanol;
    const midaMl = (0.2 * weight) / concentrations.midazolam;
    const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
    const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
    const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
    const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
    const propofolMlMin = (1 * weight) / concentrations.propofol;
    const propofolMlMax = (4 * weight) / concentrations.propofol;
    
    const fluidRate = isCardiac ? 2 : 5; // 심장병 환자는 수액 속도 감소
    const fluidTarget = fluidRate * weight;
    const pumpCorrectionFactor = 0.7; // 펌프 보정 계수
    const fluidCorrected = fluidTarget / pumpCorrectionFactor;
    
    document.getElementById('pre_op_drugs_result').innerHTML = `
        <div class="p-3 bg-green-50 rounded-lg"><h4 class="font-bold text-green-800">🤮 구토 예방/진통보조</h4><p><span class="result-value">${cereniaMl.toFixed(2)} mL</span> (세레니아)</p></div>
        <div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold text-teal-800">🛡️ 예방적 항생제</h4><p><span class="result-value">${clavaIvMl.toFixed(2)} mL</span> (클라바목스)</p></div>
        <div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold text-blue-800">😌 마취 전 투약</h4><p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p></div>
        <div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold text-amber-800">⚡ LK 부하 용량</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p><p class="text-xs text-gray-600 font-semibold mt-1">※ 희석: 케타민 0.1mL + N/S 0.9mL</p></div>
        <div class="p-3 bg-indigo-50 rounded-lg"><h4 class="font-bold text-indigo-800">💤 마취 유도제 ${isCardiac ? '<span class="text-red-500">(추천)</span>' : ''}</h4><p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span> 알팍산</p></div>
        <div class="p-3 bg-purple-50 rounded-lg"><h4 class="font-bold text-purple-800">💤 마취 유도제 (대체)</h4><p><span class="result-value">${propofolMlMin.toFixed(2)}~${propofolMlMax.toFixed(2)} mL</span> 프로포폴</p></div>
        <div class="p-3 bg-cyan-50 rounded-lg"><h4 class="font-bold text-cyan-800">💧 수액 펌프</h4><p><span class="result-value">${fluidCorrected.toFixed(1)} mL/hr</span></p><p class="text-xs text-gray-500 mt-1">(목표: ${fluidTarget.toFixed(1)}mL/hr)</p></div>
        ${isCardiac ? '<div class="p-3 bg-red-100 rounded-lg col-span-full text-sm"><p class="font-bold text-red-700">🚨 심장질환 환자는 혈압 변동성이 적은 알팍산 사용을 우선적으로 권장하며, 수액 속도를 보수적으로 설정합니다.</p></div>' : ''}
    `;

    const sites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;
    document.getElementById('dog_nerve_block_result').innerHTML = `<div class="space-y-2"><label for="dog_block_sites" class="font-semibold text-gray-700">📍 마취 부위 수:</label><select id="dog_block_sites" class="large-interactive-field" onchange="calculateAll()"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select></div><div class="p-3 border rounded-lg bg-gray-50 mt-4 text-center"><h4 class="font-semibold text-gray-800">총 준비 용량 (${sites}군데)</h4><p class="text-lg"><span class="result-value">${((0.1 * weight * sites)*0.8).toFixed(2)}mL</span> (부피) + <span class="result-value">${((0.1 * weight * sites)*0.2).toFixed(2)}mL</span> (리도)</p><p class="text-xs text-gray-500 mt-1">부위당 약 ${((0.1 * weight * sites) / sites).toFixed(2)} mL 주입</p></div>`;
    document.getElementById('dog_block_sites').value = sites;

    const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
    const pumpRate = (lidoRateMcg * weight * 60) / 2000;
    document.getElementById('lk_cri_calc_result').innerHTML = `<div class="p-4 border rounded-lg bg-gray-50 space-y-2"><h4 class="font-semibold text-gray-800">CRI 펌프 속도 설정</h4><p class="text-xs text-gray-600">🧪 희석: 리도카인 3mL + 케타민 0.12mL + N/S 26.88mL</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="lk_cri_rate_mcg" class="large-interactive-field" onchange="calculateAll()"><option value="25">25</option><option value="30">30</option><option value="50">50</option></select></div><div class="mt-2 text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
    document.getElementById('lk_cri_rate_mcg').value = lidoRateMcg;

    document.getElementById('workflow_steps').innerHTML = `<div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 1: 🏥 내원 및 준비</h3><p class="text-sm text-gray-700">보호자 동의서 작성. 환자는 즉시 IV 카테터 장착 후, 준비된 세레니아, 항생제를 투여하고 수액 처치를 시작합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 2: 💧 수액처치 & 산소 공급 (최소 10분)</h3><p class="text-sm text-gray-700">'약물 준비' 섹션에 계산된 수액 펌프 속도로 수액을 맞추고, 수술 준비 동안 입원장 안에서 산소를 공급합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 3: 💉 마취 전 투약 및 산소 공급 (3분)</h3><p class="text-sm text-gray-700">마스크로 100% 산소를 공급하면서, 준비된 부토르파놀 + 미다졸람을 3분에 걸쳐 천천히 IV로 주사합니다.</p></div><div class="warning-card p-4"><h3 class="font-bold text-lg text-amber-800">Step 4: ⚡ LK-CRI 부하 용량 (Loading Dose)</h3><p class="text-sm text-gray-700">마취 유도 직전, 준비된 리도카인과 케타민을 2분에 걸쳐 매우 천천히 IV로 주사합니다. 이는 통증 증폭을 막는 핵심 단계입니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 5: 😴 마취 유도 (Induction)</h3><p class="text-sm text-gray-700">준비된 알팍산 또는 다른 유도제를 효과를 봐가며 천천히 주사하여 기관 삽관합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 6: 💨 마취 유지 (Maintenance)</h3><p class="text-sm text-gray-700">삽관 후 즉시 이소플루란 마취를 시작하고, 동시에 LK-CRI 펌프를 작동시키며 수액 펌프 속도를 '마취 중' 권장 설정값으로 변경합니다.</p></div>`;
}

function populateEmergencyTab(weight) {
    const isCardiac = document.querySelector('input[value="cardiac"]').checked;
    const dobutamineDose = parseFloat(document.getElementById('dobutamine_dose_select')?.value) || 5;
    const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * concentrations.dobutamine_raw / 30));
    document.getElementById('hypotension_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800">📉 저혈압 (MAP < 60)</h4><ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">1️⃣ 호흡 마취제 농도 감소:</span> 가장 빠르고 중요한 첫 단계. (1.0% 이하로)</li><li><span class="font-bold">2️⃣ EtCO2 확인:</span> 45mmHg 초과 시 Veta5 인공호흡기 가동하여 환기 개선.</li><li><span class="font-bold">3️⃣ 환자 상태 확인:</span> 심장병 유무에 따라 대처가 달라짐.<ul class="list-disc list-inside ml-4 text-xs"><li><span class="font-semibold">✅ 건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg over 10-15min)</li><li><span class="font-semibold text-red-600">❌ 심장 질환 환자:</span> 수액 볼루스 금기! 승압제 우선.</li></ul></li></ol><div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2"><h5 class="font-semibold text-center text-sm">❤️ 도부타민 CRI (심장 수축력 강화)</h5><p class="text-xs text-center mb-1">희석: 원액 0.5mL + N/S 29.5mL (권장: 2-10 mcg/kg/min)</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="dobutamine_dose_select" class="large-interactive-field" oninput="calculateAll()"><option value="2">2</option><option value="5" selected>5</option><option value="10">10</option></select></div><p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div>`;
    document.getElementById('dobutamine_dose_select').value = dobutamineDose;

    const atropineLowMl = (0.02 * weight) / concentrations.atropine;
    const atropineHighMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('bradycardia_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800 mt-4">💓 서맥 (Bradycardia)</h4><p class="text-xs text-gray-600">저혈압 동반 시, 심박수 < 60-80 bpm 일 때 고려</p><div class="mt-2 p-3 rounded-lg bg-red-100 text-center"><h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p></div>`;

    const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
    const epiHighMl = (0.1 * weight) / concentrations.epinephrine;
    const atropineCpaMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('cpa_protocol').innerHTML = `<ol class="list-decimal list-inside mt-2 space-y-3 text-sm"><li><span class="font-bold">흉부압박 & 환기:</span> 즉시 100-120회/분 흉부압박, 6초에 1회 환기 시작.</li><li><span class="font-bold">약물 투여:</span> 2분마다 흉부압박 교대하며 아래 약물 투여.</li></ol><div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center"><h5 class="font-semibold text-sm">💉 에피네프린 (Low dose, 1차)</h5><p class="text-xs mb-1 font-semibold">희석: 에피네프린 원액 0.1mL + N/S 0.9mL (총 1mL)</p><p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr class="my-2"><h5 class="font-semibold text-sm">💉 아트로핀 (Asystole/PEA 시)</h5><p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL (${(atropineCpaMl*0.5).toFixed(2)} mg) IV</p><hr class="my-2"><h5 class="font-semibold text-sm">💉 에피네프린 (High dose, 반응 없을 시)</h5><p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p></div>`;
}

// ★★★★★ 신규 추가 ★★★★★
function populateEtco2Tab() {
    document.getElementById('etco2Tab').innerHTML = `
    <div class="card p-6 md:p-8">
        <div class="bg-white p-6 rounded-lg shadow-md mb-8 border-l-8 border-green-500">
            <div class="flex items-center">
                <svg class="w-12 h-12 text-green-500 mr-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                    <h3 class="text-2xl font-bold text-gray-800">EtCO2 정상 범위: 35 - 45 mmHg</h3>
                    <p class="text-gray-600">환기 상태를 평가하는 가장 중요한 지표 중 하나입니다.</p>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="p-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow">
                <h2 class="text-2xl font-bold text-blue-700 mb-3">EtCO2 저하 (&lt; 35 mmHg): 과환기</h2>
                <h3 class="font-semibold text-gray-800 mb-2 text-lg">🛠️ 원인 및 대처법</h3>
                <ol class="list-decimal list-inside text-gray-700 space-y-3">
                    <li><strong>인공호흡기 조절 (Veta5)</strong>
                        <ul class="list-disc list-inside ml-5 mt-1 text-sm">
                            <li><strong>1순위: '호흡수(RR)'</strong>를 <span class="font-bold text-blue-800">▼낮춥니다.</span></li>
                            <li><strong>2순위: '1회호흡량(VT)'</strong>을 <span class="font-bold text-blue-800">▼줄입니다.</span></li>
                        </ul>
                    </li>
                    <li><strong>환자 상태 교정</strong>
                         <ul class="list-disc list-inside ml-5 mt-1 text-sm">
                            <li><strong>저체온증:</strong> 보온 장비로 체온을 적극적으로 올립니다.</li>
                            <li><strong>과도한 통증/자극:</strong> 진통/마취 심도를 조절합니다.</li>
                        </ul>
                    </li>
                </ol>
            </div>
            <div class="p-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow">
                <h2 class="text-2xl font-bold text-red-700 mb-3">EtCO2 상승 (&gt; 45 mmHg): 환기저하</h2>
                 <h3 class="font-semibold text-gray-800 mb-2 text-lg">🛠️ 원인 및 대처법</h3>
                <ol class="list-decimal list-inside text-gray-700 space-y-3">
                    <li><strong>환기 개선 (가장 먼저!)</strong>
                        <ul class="list-disc list-inside ml-5 mt-1 text-sm">
                            <li><strong>1순위: '호흡수(RR)'</strong>를 <span class="font-bold text-red-800">▲높입니다.</span></li>
                             <li><strong>2순위: '1회호흡량(VT)'</strong>을 <span class="font-bold text-red-800">▲늘립니다.</span></li>
                        </ul>
                    </li>
                    <li><strong>장비 문제 확인</strong>
                        <ul class="list-disc list-inside ml-5 mt-1 text-sm">
                            <li><strong>CO2 흡수제:</strong> 색이 변했으면 즉시 교체합니다.</li>
                            <li><strong>Dead space:</strong> 과도한 회로 길이를 줄입니다.</li>
                             <li><strong>ET Tube 막힘:</strong> 분비물 등을 확인하고 필요시 석션합니다.</li>
                        </ul>
                    </li>
                </ol>
            </div>
        </div>
    </div>`;
}

function populateDischargeTab(weight) {
    const isKidney = document.querySelector('input[value="kidney"]').checked;
    const generalDays = parseInt(document.getElementById('prescription_days').value) || 0;
    
    // 알약 개수 계산 함수 (mg 단위)
    const getPillCount = (mgPerDose, frequency, pillStrength, days) => {
        if (days <= 0) return "일수 입력 필요";
        const pillsPerDose = mgPerDose / pillStrength;
        const totalPills = Math.ceil(pillsPerDose * frequency * days * 2) / 2; // 0.5알 단위 올림
        return `<strong>${totalPills.toFixed(1).replace('.0','')}정</strong> (${pillStrength}mg/정) | 1회 ${pillsPerDose.toFixed(2)}정, ${frequency}회/일`;
    };

    // 알약 개수 계산 함수 (mcg 단위)
    const getPillCountMcg = (mcgPerDose, frequency, pillStrengthMcg, days) => {
        if (days <= 0) return "일수 입력 필요";
        const pillsPerDose = mcgPerDose / pillStrengthMcg;
        const totalPills = Math.ceil(pillsPerDose * frequency * days * 2) / 2;
        return `<strong>${totalPills.toFixed(1).replace('.0','')}정</strong> (${pillStrengthMcg}mcg/정) | 1회 ${pillsPerDose.toFixed(2)}정, ${frequency}회/일`;
    };
    
    let vetrocamDays = parseInt(document.getElementById('vetrocam_days')?.value);
    if(isNaN(vetrocamDays)) vetrocamDays = 3;

    let totalVetrocamDoseMl = 0;
    if (vetrocamDays >= 1) { 
        totalVetrocamDoseMl += weight * 0.2; // 첫날 용량
        if (vetrocamDays > 1) {
            totalVetrocamDoseMl += (vetrocamDays - 1) * (weight * 0.1); // 둘째날 이후 용량
        }
    }

    const goldStandardDiv = document.getElementById('discharge_gold');
    goldStandardDiv.className = `p-4 rounded-lg space-y-3 ${isKidney ? 'kidney-warning' : 'bg-green-50'}`;
    goldStandardDiv.innerHTML = `
        <h3 class="font-bold text-lg ${isKidney ? 'text-red-800' : 'text-green-700'} mb-2">🥇 시나리오 1: 골드 스탠다드 (NSAID 기반)</h3>
        ${isKidney ? '<p class="font-bold text-red-800 mb-2">🚨 신장수치 이상 환자에게 NSAID 처방 시 신독성 위험을 반드시 고려해야 합니다!</p>' : ''}
        <div>
            <label class="font-semibold text-sm">베트로캄 처방일:</label>
            <input type="number" id="vetrocam_days" value="${vetrocamDays}" class="large-interactive-field" oninput="calculateAll()">
        </div>
        <p><strong>- 베트로캄(액상):</strong> 총 <span class="result-value">${totalVetrocamDoseMl.toFixed(2)} mL</span> (염증/통증 완화)</p><hr>
        <p><strong>- 가바펜틴 (5mg/kg, BID):</strong></p>
        <div class="text-sm p-2 bg-white rounded">${getPillCount(5*weight, 2, pillStrengths.gabapentin, generalDays)}</div><hr>
        <p class="font-semibold text-sm">- 위장관 보호제 (NSAID 사용 시): 미소프로스톨 (3mcg/kg, BID)</p>
        <div class="text-sm p-2 bg-white rounded">${getPillCountMcg(3*weight, 2, pillStrengths.misoprostol, generalDays)}</div><hr>
        <p class="font-semibold text-sm">- 기본 항생제: 아목시실린</p>
        <div class="text-sm p-2 bg-white rounded">${getPillCount(12.5*weight, 2, pillStrengths.amoxicillin_capsule, generalDays)}</div>
    `;

    document.getElementById('discharge_alt').innerHTML = `
        <h3 class="font-bold text-lg text-orange-700 mb-2 mt-6">🥈 시나리오 2: NSAID-Sparing</h3>
        <div class="info-box mb-2 text-xs">
            <p>NSAIDs 금기(신부전, 간부전 등) 또는 위장관 부작용이 우려되는 환자에게 적용합니다.</p>
            <p class="font-bold text-red-600">🚨 주의: 아세트아미노펜은 고양이에게 절대 금기!</p>
        </div>
        <div class="p-4 bg-orange-50 rounded-lg space-y-3">
            <p><strong>- 가바펜틴 (10mg/kg, BID):</strong></p>
            <div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(10*weight, 2, pillStrengths.gabapentin, generalDays)}</div><hr>
            <p><strong>- 아세트아미노펜 (15mg/kg, BID):</strong></p>
            <div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(15*weight, 2, pillStrengths.acetaminophen, generalDays)}</div><hr>
            <p class="font-semibold text-sm">- 기본 항생제: 아목시실린</p>
            <div class="text-sm p-2 bg-orange-100 rounded">${getPillCount(12.5*weight, 2, pillStrengths.amoxicillin_capsule, generalDays)}</div>
        </div>
    `;
}

// --- 보호자 교육 및 저장 기능 ---
function calculateRemovalDate() {
    const dateInput = document.getElementById('attachDate')?.value;
    const timeInput = document.getElementById('attachTime')?.value;
    const removalInfoDiv = document.getElementById('removalInfo');
    if (!dateInput || !timeInput || !removalInfoDiv) return;
    const attachDateTime = new Date(`${dateInput}T${timeInput}`);
    if (isNaN(attachDateTime.getTime())) {
        removalInfoDiv.innerHTML = '<p class="font-bold text-red-700">유효한 날짜와 시간을 입력해주세요.</p>';
        return;
    }
    const removalDateStart = new Date(attachDateTime.getTime());
    removalDateStart.setHours(attachDateTime.getHours() + 72);
    const removalDateEnd = new Date(attachDateTime.getTime());
    removalDateEnd.setHours(attachDateTime.getHours() + 96);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    const removalStartString = new Intl.DateTimeFormat('ko-KR', options).format(removalDateStart);
    const removalEndString = new Intl.DateTimeFormat('ko-KR', options).format(removalDateEnd);
    removalInfoDiv.innerHTML = `<h4 class="text-lg font-bold text-gray-800 mb-2">🗓️ 패치 제거 권장 기간</h4><p class="text-base text-gray-700"><strong class="text-blue-600">${removalStartString}</strong> 부터<br><strong class="text-blue-600">${removalEndString}</strong> 사이에<br>패치를 제거해주세요.</p>`;
}

function saveAsPDF() { window.print(); }

function saveAsImage() {
    const captureElement = document.getElementById('captureArea');
    const patientName = document.getElementById('patientName').value || '환자';
    html2canvas(captureElement, { useCORS: true, scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${patientName}_통증패치_안내문.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function exportPrepSheetAsImage() {
    const captureElement = document.getElementById('prepTab');
    const weight = document.getElementById('weight').value || '체중미입력';
    const patientName = document.getElementById('patientName').value || '환자';
    const filename = `${patientName}_${weight}kg_마취준비시트.png`;
    html2canvas(captureElement, {
        useCORS: true,
        scale: 1.5,
        backgroundColor: '#f8f9fa'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// ★★★★★ 신규 추가: JSON으로 저장 기능 ★★★★★
function savePrepSheetAsJSON() {
    const weightInput = document.getElementById('weight');
    if (!weightInput || !weightInput.value || parseFloat(weightInput.value) <= 0) {
        alert('환자 체중을 먼저 입력해주세요.');
        return;
    }
    const weight = parseFloat(weightInput.value);
    const patientName = document.getElementById('patientName').value || '환자';
    
    // 환자 상태 수집
    const statuses = [];
    document.querySelectorAll('input[name="patient_status"]:checked').forEach(checkbox => {
        statuses.push(checkbox.value);
    });

    // 마취 준비 약물 데이터 수집 (재계산)
    const cereniaMl = (1.0 * weight) / concentrations.cerenia;
    const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
    const butorMl = (0.2 * weight) / concentrations.butorphanol;
    const midaMl = (0.2 * weight) / concentrations.midazolam;
    const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
    const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
    const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
    const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
    const propofolMlMin = (1 * weight) / concentrations.propofol;
    const propofolMlMax = (4 * weight) / concentrations.propofol;
    
    const fluidRate = statuses.includes('cardiac') ? 2 : 5;
    const fluidTarget = fluidRate * weight;
    const fluidCorrected = fluidTarget / 0.7;

    const blockSites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;
    const blockBupi = (0.1 * weight * blockSites) * 0.8;
    const blockLido = (0.1 * weight * blockSites) * 0.2;
    
    const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
    const lkCriPumpRate = (lidoRateMcg * weight * 60) / 2000;

    // JSON 객체 생성
    const anesthesiaData = {
        patientInfo: {
            name: patientName,
            weightKg: weight,
            status: statuses,
            recordDate: new Date().toISOString()
        },
        prepDrugs: {
            cerenia: { doseMl: parseFloat(cereniaMl.toFixed(2)), unit: "mL" },
            clavamoxIV: { doseMl: parseFloat(clavaIvMl.toFixed(2)), unit: "mL" },
            premedication: {
                butorphanol: { doseMl: parseFloat(butorMl.toFixed(2)), unit: "mL" },
                midazolam: { doseMl: parseFloat(midaMl.toFixed(2)), unit: "mL" }
            },
            lkLoading: {
                lidocaine: { doseMl: parseFloat(lidoLoadMl.toFixed(2)), unit: "mL" },
                ketamineDiluted: { doseMl: parseFloat(ketaLoadMl_diluted.toFixed(2)), unit: "mL" },
            },
            induction: {
                alfaxalone: { minMl: parseFloat(alfaxanMlMin.toFixed(2)), maxMl: parseFloat(alfaxanMlMax.toFixed(2)), unit: "mL" },
                propofol: { minMl: parseFloat(propofolMlMin.toFixed(2)), maxMl: parseFloat(propofolMlMax.toFixed(2)), unit: "mL" }
            },
            fluid: {
                targetRate: { value: parseFloat(fluidTarget.toFixed(1)), unit: "mL/hr" },
                pumpSetting: { value: parseFloat(fluidCorrected.toFixed(1)), unit: "mL/hr" }
            }
        },
        nerveBlock: {
            sites: blockSites,
            bupivacaineMl: parseFloat(blockBupi.toFixed(2)),
            lidocaineMl: parseFloat(blockLido.toFixed(2))
        },
        lkCri: {
            targetMcgKgMin: lidoRateMcg,
            pumpRateMlHr: parseFloat(lkCriPumpRate.toFixed(2))
        },
        etTube: selectedTubeInfo
    };

    // JSON 파일 생성 및 다운로드
    const dataStr = JSON.stringify(anesthesiaData, null, 4); // 예쁘게 포맷
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.download = `${patientName}_${weight}kg_마취데이터.json`;
    link.href = url;
    link.click();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}


// --- ET Tube 계산기 및 기록 관련 함수 ---
const weightSizeGuide = [
    { weight: 1, size: '3.0' }, { weight: 2, size: '3.5' },
    { weight: 3.5, size: '4.0' }, { weight: 4, size: '4.5' },
    { weight: 6, size: '5.5' }, { weight: 8, size: '6.0' },
    { weight: 9, size: '7.0' }, { weight: 12, size: '7.0' },
    { weight: 14, size: '7.5' }, { weight: 20, size: '9.0' },
    { weight: 30, size: '11.0' }, { weight: 40, size: '13.0' }
];
const tracheaSizeGuide = [
    { diameter: 5.13, id: '2.5' }, { diameter: 5.88, id: '3.0' },
    { diameter: 6.63, id: '3.5' }, { diameter: 7.50, id: '4.0' },
    { diameter: 8.13, id: '4.5' }, { diameter: 8.38, id: '5.0' },
    { diameter: 9.13, id: '5.5' }, { diameter: 10.00, id: '6.0' },
    { diameter: 11.38, id: '6.5' }, { diameter: 11.63, id: '7.0' },
    { diameter: 12.50, id: '7.5' }, { diameter: 13.38, id: '8.0' }
];

function calculateWeightSize() {
    const weightInput = document.getElementById('weight-input');
    const resultContainerWeight = document.getElementById('result-container-weight');
    const resultTextWeight = do
