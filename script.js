// --- 전역 변수 및 상수 ---
const concentrations = { lidocaine: 20, ketamine: 50, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, clavamox_iv: 100, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, };
let selectedTubeInfo = { size: null, cuff: false, notes: '' };

// --- 퇴원약 데이터 ---
const dischargeMedications = {
    clavamox: { name: '클라바목스', dose: 12.5, freq: 2, strength: 250, defaultChecked: true, note: '항생제' },
    meloxicam: { name: '멜록시캄(액)', dose: 0.1, freq: 1, strength: 1.5, unit: 'mL', defaultChecked: true, warning: 'renal', note: 'NSAID 소염진통제' },
    gabapentin: { name: '가바펜틴', dose: 10, freq: 2, strength: 100, defaultChecked: true, note: '신경병증성 통증' },
    tramadol: { name: '트라마돌', dose: 3, freq: 2, strength: 50, defaultChecked: false, note: '보조 진통제' },
    famotidine: { name: '파모티딘', dose: 1, freq: 2, strength: 10, defaultChecked: false, note: '위장관 보호제' },
    maropitant: { name: '마로피itant', dose: 2, freq: 1, strength: 16, defaultChecked: false, note: '진토제' },
    ursa: { name: '우루사 (UDCA)', dose: 15, freq: 2, strength: 100, defaultChecked: false, warning: 'liver_support', note: '간 보조제' },
    silymarin: { name: '실리마린', dose: 10, freq: 1, strength: 140, defaultChecked: false, warning: 'liver_support', note: '간 보조제' },
    same: { name: 'SAMe', dose: 20, freq: 1, strength: 200, defaultChecked: false, warning: 'liver_support', note: '간 보조제' },
};

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

// --- 이름 동기화 ---
function syncPatientName() {
    const mainName = document.getElementById('patient_name_main').value;
    const handoutName = document.getElementById('patientName');
    const dischargeName = document.getElementById('discharge_patient_name');
    if (handoutName) handoutName.value = mainName;
    if (dischargeName) dischargeName.textContent = mainName || '정보 없음';
}

// --- 메인 계산 함수 ---
function calculateAll() {
    syncPatientName();
    const weightInput = document.getElementById('weight');
    const recommendationDiv = document.getElementById('patch_recommendation');
    updateTubeDisplay();

    if (!weightInput || !weightInput.value) {
        if(recommendationDiv) recommendationDiv.innerHTML = '';
        const weightInputTube = document.getElementById('weight-input');
        if (weightInputTube) {
            weightInputTube.value = '';
            calculateWeightSize();
        }
        document.getElementById('discharge_patient_weight').textContent = '체중 입력 필요';
        return;
    }
    
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) {
        if(recommendationDiv) recommendationDiv.innerHTML = '';
        document.getElementById('discharge_patient_weight').textContent = '유효한 체중 아님';
        return;
    }
    
    const weightInputTube = document.getElementById('weight-input');
    if (weightInputTube) {
        weightInputTube.value = weight;
        calculateWeightSize();
    }
    
    populatePrepTab(weight);
    populateEmergencyTab(weight);
    populateDischargeTab(weight);
    updatePatchRecommendation(weight);
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
    recommendationDiv.innerHTML = `<div class="p-4 rounded-lg bg-${patchColor}-100 border-l-4 border-${patchColor}-500"><h3 class="text-xl font-bold text-${patchColor}-800 flex items-center"><i class="fas fa-syringe mr-3"></i>환자 맞춤 패치 추천</h3><p class="text-lg text-gray-800 mt-2">현재 체중 <strong>${weight}kg</strong> 환자에게는 <strong>${patchType} 노스판 패치</strong> 적용을 권장합니다.</p></div>`;
}

function populatePrepTab(weight) {
    const isCardiac = document.getElementById('status_cardiac').checked;
    const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
    const butorMl = (0.2 * weight) / concentrations.butorphanol;
    const midaMl = (0.2 * weight) / concentrations.midazolam;
    const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
    const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;

    const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
    const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
    
    let fluidRate = 5;
    if (isCardiac) fluidRate = 2;
    
    const pumpCorrectionFactor = 0.7;
    const fluidTarget = fluidRate * weight;
    const fluidCorrected = fluidTarget / pumpCorrectionFactor;

    const alfaxanCard = `
        <div id="alfaxan_card" class="p-2 bg-indigo-50 rounded-lg transition-all duration-300">
            <h5 class="font-semibold text-indigo-800">알팍산</h5>
            <p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span></p>
            ${isCardiac ? '<p class="text-xs font-bold text-green-600 mt-1">❤️ 심장질환 추천</p>' : ''}
        </div>`;
    
    const propofolCard = `
        <div class="p-2 bg-purple-50 rounded-lg">
            <h5 class="font-semibold text-purple-800">프로포폴</h5>
            <p><span class="result-value">2 ~ 6</span> mg/kg</p>
            <p class="text-xs text-gray-500 mt-1">(효과 보며 분할 주입)</p>
        </div>`;

    document.getElementById('pre_op_drugs_result').innerHTML = `
        <div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold text-teal-800">예방적 항생제</h4><p><span class="result-value">${clavaIvMl.toFixed(2)} mL</span> (클라바목스)</p></div>
        <div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold text-blue-800">마취 전 투약</h4><p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p></div>
        <div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold text-amber-800">LK 부하 용량</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p><p class="text-xs text-gray-600 font-semibold mt-1">※ 희석: 케타민(50주) 0.2mL + N/S 0.8mL</p></div>
        <div class="p-3 bg-indigo-50 rounded-lg col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2"><h4 class="font-bold text-indigo-800">도입 마취</h4><div class="grid grid-cols-2 gap-2 mt-2">${alfaxanCard}${propofolCard}</div></div>
        <div class="p-3 bg-cyan-50 rounded-lg"><h4 class="font-bold text-cyan-800">수액 펌프</h4><p><span class="result-value">${fluidCorrected.toFixed(1)} mL/hr</span></p><p class="text-xs text-gray-500 mt-1">(목표: ${fluidTarget.toFixed(1)}mL/hr)</p></div>`;
    
    const alfaxanElement = document.getElementById('alfaxan_card');
    if (alfaxanElement) {
        alfaxanElement.classList.toggle('highlight-recommendation', isCardiac);
    }

    const sites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;
    document.getElementById('dog_nerve_block_result').innerHTML = `<div class="space-y-2"><label for="dog_block_sites" class="font-semibold text-gray-700">마취 부위 수:</label><select id="dog_block_sites" class="large-interactive-field" onchange="calculateAll()"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select></div><div class="p-3 border rounded-lg bg-gray-50 mt-4 text-center"><h4 class="font-semibold text-gray-800">총 준비 용량 (${sites}군데)</h4><p class="text-lg"><span class="result-value">${((0.1 * weight * sites)*0.8).toFixed(2)}mL</span> (부피) + <span class="result-value">${((0.1 * weight * sites)*0.2).toFixed(2)}mL</span> (리도)</p><p class="text-xs text-gray-500 mt-1">부위당 약 ${((0.1 * weight * sites) / sites).toFixed(2)} mL 주입</p></div>`;
    document.getElementById('dog_block_sites').value = sites;
    const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
    const pumpRate = (lidoRateMcg * weight * 60) / 2000;
    document.getElementById('lk_cri_calc_result').innerHTML = `<div class="p-4 border rounded-lg bg-gray-50 space-y-2"><h4 class="font-semibold text-gray-800">CRI 펌프 속도 설정</h4><p class="text-xs text-gray-600">희석: 리도카인 3mL + 케타민(50주) 0.24mL + N/S 26.76mL</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="lk_cri_rate_mcg" class="large-interactive-field" onchange="calculateAll()"><option value="25">25</option><option value="30">30</option><option value="50">50</option></select></div><div class="mt-2 text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
    document.getElementById('lk_cri_rate_mcg').value = lidoRateMcg;
    document.getElementById('workflow_steps').innerHTML = `<div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 1: 내원 및 준비</h3><p class="text-sm text-gray-700">보호자 동의서 작성. 환자는 즉시 IV 카테터 장착 후, 준비된 클라바목스 IV를 투여하고 수액 처치를 시작합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 2: 수액처치 & 산소 공급 (최소 10분)</h3><p class="text-sm text-gray-700">'약물 준비' 섹션에 계산된 수액 펌프 속도로 수액을 맞추고, 수술 준비 동안 입원장 안에서 산소를 공급합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 3: 마취 전 투약 및 산소 공급 (3분)</h3><p class="text-sm text-gray-700">마스크로 100% 산소를 공급하면서, 준비된 부토르파놀 + 미다졸람을 3분에 걸쳐 천천히 IV로 주사합니다.</p></div><div class="warning-card p-4"><h3 class="font-bold text-lg text-amber-800">Step 4: LK-CRI 부하 용량 (Loading Dose)</h3><p class="text-sm text-gray-700">마취 유도 직전, 준비된 리도카인과 케타민을 2분에 걸쳐 매우 천천히 IV로 주사합니다. 이는 통증 증폭을 막는 핵심 단계입니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 5: 마취 유도 (Induction)</h3><p class="text-sm text-gray-700">준비된 알팍산 또는 다른 유도제를 효과를 봐가며 천천히 주사하여 기관 삽관합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 6: 마취 유지 (Maintenance)</h3><p class="text-sm text-gray-700">삽관 후 즉시 이소플루란 마취를 시작하고, 동시에 LK-CRI 펌프를 작동시키며 수액 펌프 속도를 '마취 중' 권장 설정값으로 변경합니다.</p></div>`;
}

function populateEmergencyTab(weight) {
    const dobutamineDose = parseFloat(document.getElementById('dobutamine_dose_select')?.value) || 5;
    const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * 12.5 / 30));
    document.getElementById('hypotension_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800">저혈압 (MAP < 60)</h4><ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">호흡 마취제 농도 감소:</span> 가장 빠르고 중요한 첫 단계.</li><li><span class="font-bold">환자 상태 확인:</span> 심장병 유무에 따라 대처가 달라짐.<ul class="list-disc list-inside ml-4 text-xs"><li><span class="font-semibold">건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg over 10-15min)</li><li><span class="font-semibold text-red-600">심장 질환 환자:</span> 수액 볼루스 금기! 승압제 우선.</li></ul></li></ol><div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2"><h5 class="font-semibold text-center text-sm">도부타민 CRI (심장 수축력 강화)</h5><p class="text-xs text-center mb-1">희석: 원액 0.5mL + N/S 29.5mL (권장: 2-10 mcg/kg/min)</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="dobutamine_dose_select" class="large-interactive-field" oninput="calculateAll()"><option value="2">2</option><option value="5" selected>5</option><option value="10">10</option></select></div><p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div>`;
    document.getElementById('dobutamine_dose_select').value = dobutamineDose;
    const atropineLowMl = (0.02 * weight) / concentrations.atropine;
    const atropineHighMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('bradycardia_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800 mt-4">서맥 (Bradycardia)</h4><p class="text-xs text-gray-600">저혈압 동반 시, 심박수 < 60-80 bpm 일 때 고려</p><div class="mt-2 p-3 rounded-lg bg-red-100 text-center"><h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p></div>`;
    const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
    const epiHighMl = (0.1 * weight) / concentrations.epinephrine;
    const atropineCpaMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('cpa_protocol').innerHTML = `<ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">BLS (기본소생술):</span> 즉시 100-120회/분 흉부압박, 6초에 1회 환기 시작.</li><li><span class="font-bold">ALS (전문소생술):</span> 2분마다 흉부압박 교대하며 아래 약물 투여.</li></ol><div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center"><h5 class="font-semibold text-sm">에피네프린 (Low dose, 1차)</h5><p class="text-xs mb-1 font-semibold">희석법: 에피네프린 원액 0.1mL + N/S 0.9mL (총 1mL)</p><p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr><h5 class="font-semibold text-sm">아트로핀 (Asystole/PEA 시)</h5><p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL (${(atropineCpaMl*0.5).toFixed(2)} mg) IV</p><hr><h5 class="font-semibold text-sm">에피네프린 (High dose, 반응 없을 시)</h5><p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p></div>`;
}

// --- 퇴원약 조제 탭 기능 ---
function initializeDischargeTab() {
    const container = document.getElementById('medication_selection_list');
    let html = '';
    for (const key in dischargeMedications) {
        const med = dischargeMedications[key];
        const isChecked = med.defaultChecked ? 'checked' : '';
        html += `
            <div id="med_card_${key}" class="p-3 border rounded-lg bg-white transition-all hover:shadow-md">
                <div class="flex items-center justify-between">
                    <label for="med_cb_${key}" class="flex items-center cursor-pointer">
                        <input type="checkbox" id="med_cb_${key}" onchange="calculateAll()" class="h-5 w-5 rounded" ${isChecked}>
                        <span class="ml-3 font-bold text-gray-800">${med.name}</span>
                        <span class="ml-2 text-xs text-gray-500">(${med.note})</span>
                    </label>
                </div>
                <div class="mt-2 flex items-center gap-2 text-sm pl-8">
                    <input type="number" id="med_dose_${key}" value="${med.dose}" oninput="calculateAll()" class="w-16 p-1 border rounded text-center">
                    <span class="text-gray-600">mg/kg</span>
                    <input type="number" id="med_freq_${key}" value="${med.freq}" oninput="calculateAll()" class="w-12 p-1 border rounded text-center">
                    <span class="text-gray-600">회/일</span>
                </div>
            </div>`;
    }
    container.innerHTML = html;
}

function populateDischargeTab(weight) {
    document.getElementById('discharge_patient_weight').textContent = `${weight}`;
    
    const isRenal = document.getElementById('status_renal').checked;
    const isLiver = document.getElementById('status_liver').checked;

    // 간 이상 시 간 보조제 자동 선택
    if (isLiver) {
        document.getElementById('med_cb_ursa').checked = true;
        document.getElementById('med_cb_silymarin').checked = true;
        document.getElementById('med_cb_same').checked = true;
    }

    let summary3dayHTML = '';
    let summary7dayHTML = '';

    const calculatePills = (days, dose, freq, strength, unit = '정') => {
        const pillsPerDose = dose * weight / strength;
        if (unit === 'mL') {
            const totalMl = pillsPerDose * freq * days;
            return `총 <strong class="text-blue-600">${totalMl.toFixed(2)} mL</strong> (1회 ${pillsPerDose.toFixed(2)} mL, ${freq}회/일)`;
        }
        const totalPills = Math.ceil(pillsPerDose * freq * days * 2) / 2;
        return `총 <strong class="text-blue-600">${totalPills.toFixed(1).replace('.0', '')} ${unit}</strong> (1회 ${pillsPerDose.toFixed(2)} ${unit}, ${freq}회/일)`;
    };

    for (const key in dischargeMedications) {
        const med = dischargeMedications[key];
        const isChecked = document.getElementById(`med_cb_${key}`).checked;
        const medCard = document.getElementById(`med_card_${key}`);
        
        // 하이라이트 클래스 초기화
        medCard.classList.remove('highlight-renal', 'highlight-liver');

        if (med.warning === 'renal' && isRenal) {
            medCard.classList.add('highlight-renal');
        }
        if ((med.note.includes('간') || med.warning === 'liver') && isLiver) {
            medCard.classList.add('highlight-liver');
        }

        if (isChecked) {
            const dose = parseFloat(document.getElementById(`med_dose_${key}`).value) || med.dose;
            const freq = parseInt(document.getElementById(`med_freq_${key}`).value) || med.freq;
            
            summary3dayHTML += `<li><strong>${med.name}:</strong> ${calculatePills(3, dose, freq, med.strength, med.unit)}</li>`;
            summary7dayHTML += `<li><strong>${med.name}:</strong> ${calculatePills(7, dose, freq, med.strength, med.unit)}</li>`;
        }
    }

    document.getElementById('summary_3_day').innerHTML = summary3dayHTML || '<li class="text-gray-500">선택된 약물이 없습니다.</li>';
    document.getElementById('summary_7_day').innerHTML = summary7dayHTML || '<li class="text-gray-500">선택된 약물이 없습니다.</li>';
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

function saveHandoutAsImage() {
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
    const patientName = document.getElementById('patient_name_main').value || '환자';
    const filename = `${patientName}_${weight}kg_마취준비시트.png`;
    html2canvas(captureElement, { useCORS: true, scale: 1.5, backgroundColor: '#f0f4f8' }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
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
    const resultTextWeight = document.getElementById('result-text-weight');
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) {
        resultContainerWeight.classList.add('hidden');
        return;
    }
    let recommendedSize = '13.0 이상';
    for (let i = 0; i < weightSizeGuide.length; i++) {
        if (weight <= weightSizeGuide[i].weight) {
            recommendedSize = weightSizeGuide[i].size;
            break;
        }
    }
    resultTextWeight.textContent = recommendedSize;
    resultContainerWeight.classList.remove('hidden');
}

function calculateTracheaSize() {
    const tracheaInput = document.getElementById('trachea-input');
    const resultContainerTrachea = document.getElementById('result-container-trachea');
    const resultTextTrachea = document.getElementById('result-text-trachea');
    const diameter = parseFloat(tracheaInput.value);
    if (isNaN(diameter) || diameter <= 0) {
        resultContainerTrachea.classList.add('hidden');
        return;
    }
    let recommendedId = '8.0 이상';
     for (let i = 0; i < tracheaSizeGuide.length; i++) {
        if (diameter <= tracheaSizeGuide[i].diameter) {
            recommendedId = tracheaSizeGuide[i].id;
            break;
        }
    }
    resultTextTrachea.textContent = recommendedId;
    resultContainerTrachea.classList.remove('hidden');
}

function saveAndDisplayTubeSelection() {
    const sizeInput = document.getElementById('selectedEtTubeSize');
    const cuffInput = document.getElementById('selectedEtTubeCuff');
    const notesInput = document.getElementById('selectedEtTubeNotes');

    if (!sizeInput.value) {
        alert('최종 ET Tube 사이즈를 입력해주세요.');
        sizeInput.focus();
        return;
    }

    selectedTubeInfo.size = parseFloat(sizeInput.value);
    selectedTubeInfo.cuff = cuffInput.checked;
    selectedTubeInfo.notes = notesInput.value;
    
    const saveButton = document.getElementById('saveEtTubeSelection');
    saveButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>저장 완료!';
    saveButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    saveButton.classList.add('bg-green-600');

    setTimeout(() => {
        saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>기록 저장';
        saveButton.classList.remove('bg-green-600');
        saveButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }, 2000);
    
    updateTubeDisplay();
}

function updateTubeDisplay() {
    const displayDiv = document.getElementById('et_tube_selection_display');
    if (!displayDiv) return;

    if (selectedTubeInfo.size) {
        const cuffStatus = selectedTubeInfo.cuff 
            ? '<span class="text-green-600 font-semibold"><i class="fas fa-check-circle mr-1"></i>확인 완료</span>' 
            : '<span class="text-red-600 font-semibold"><i class="fas fa-times-circle mr-1"></i>미확인</span>';
        const notesText = selectedTubeInfo.notes ? `<p class="text-sm text-gray-600 mt-2"><strong>메모:</strong> ${selectedTubeInfo.notes}</p>` : '';

        displayDiv.innerHTML = `
            <div class="text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <p class="text-lg"><strong>선택된 Tube 사이즈 (ID):</strong> <span class="result-value text-2xl">${selectedTubeInfo.size}</span></p>
                <p class="text-lg"><strong>커프(Cuff) 확인:</strong> ${cuffStatus}</p>
            </div>
            ${notesText}
        `;
    } else {
        displayDiv.innerHTML = '<p class="text-gray-700">ET Tube가 아직 선택되지 않았습니다. \'ET Tube 계산기\' 탭에서 기록해주세요.</p>';
    }
}

// --- 데이터 저장/불러오기/이미지 저장 기능 ---
const a_input_ids = ['patient_name_main', 'surgery_date', 'weight', 'dog_block_sites', 'lk_cri_rate_mcg', 'dobutamine_dose_select', 'selectedEtTubeSize', 'selectedEtTubeNotes', 'patientName', 'attachDate', 'attachTime'];
const a_checkbox_ids = ['status_healthy', 'status_cardiac', 'status_liver', 'status_renal', 'selectedEtTubeCuff'];

function saveRecords() {
    const data = {};
    a_input_ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) data[id] = element.value;
    });
    a_checkbox_ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) data[id] = element.checked;
    });
    // 퇴원약 정보 저장
    data.dischargeMeds = {};
    for (const key in dischargeMedications) {
        data.dischargeMeds[key] = {
            checked: document.getElementById(`med_cb_${key}`)?.checked,
            dose: document.getElementById(`med_dose_${key}`)?.value,
            freq: document.getElementById(`med_freq_${key}`)?.value,
        };
    }
    data.selectedTubeInfo = selectedTubeInfo;

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const patientName = document.getElementById('patient_name_main').value || '환자';
    const surgeryDate = document.getElementById('surgery_date').value || new Date().toISOString().split('T')[0];
    a.download = `마취기록_${patientName}_${surgeryDate}.json`;
    
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    alert('기록이 JSON 파일로 저장되었습니다.');
}

function loadRecords(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            a_input_ids.forEach(id => {
                const element = document.getElementById(id);
                if (element && data[id] !== undefined) element.value = data[id];
            });
            a_checkbox_ids.forEach(id => {
                const element = document.getElementById(id);
                if (element && data[id] !== undefined) element.checked = data[id];
            });
            // 퇴원약 정보 불러오기
            if (data.dischargeMeds) {
                for (const key in data.dischargeMeds) {
                    const medData = data.dischargeMeds[key];
                    if (document.getElementById(`med_cb_${key}`)){
                        document.getElementById(`med_cb_${key}`).checked = medData.checked;
                        document.getElementById(`med_dose_${key}`).value = medData.dose;
                        document.getElementById(`med_freq_${key}`).value = medData.freq;
                    }
                }
            }
            if (data.selectedTubeInfo) selectedTubeInfo = data.selectedTubeInfo;
            
            alert('기록을 성공적으로 불러왔습니다.');
            calculateAll();
            calculateRemovalDate();
        } catch (error) {
            alert('오류: 유효하지 않은 JSON 파일입니다.');
            console.error("Failed to parse JSON", error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function saveDashboardAsImage() {
    const captureElement = document.getElementById('dashboard-capture-area');
    const patientName = document.getElementById('patient_name_main').value || '환자';
    const surgeryDate = document.getElementById('surgery_date').value || new Date().toISOString().split('T')[0];
    const filename = `마취대시보드_${patientName}_${surgeryDate}.png`;

    alert('대시보드 이미지를 생성합니다. 잠시만 기다려주세요...');

    html2canvas(captureElement, {
        useCORS: true,
        scale: 1.5,
        backgroundColor: '#f0f4f8'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// --- DOM 로드 후 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDischargeTab();
    calculateAll();
    
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
        document.getElementById('surgery_date').value = `${yyyy}-${mm}-${dd}`;
        calculateRemovalDate();
    }

    // --- 이벤트 리스너 설정 ---
    document.getElementById('save-record-btn').addEventListener('click', saveRecords);
    document.getElementById('load-record-input').addEventListener('change', loadRecords);
    document.getElementById('save-image-btn').addEventListener('click', saveDashboardAsImage);
    document.getElementById('calculate-weight-btn').addEventListener('click', calculateWeightSize);
    document.getElementById('calculate-trachea-btn').addEventListener('click', calculateTracheaSize);
    document.getElementById('trachea-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateTracheaSize(); });
    document.getElementById('saveEtTubeSelection').addEventListener('click', saveAndDisplayTubeSelection);
});
