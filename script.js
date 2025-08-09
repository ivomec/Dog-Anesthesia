// --- 전역 변수 및 상수 ---
const concentrations = { lidocaine: 20, ketamine: 50, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, clavamox_iv: 100, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, };
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

// --- 환자 상태 체크박스 관리 ---
function handleHealthyCheck(checkbox) {
    if (checkbox.checked) {
        document.querySelectorAll('.status-check').forEach(cb => cb.checked = false);
    }
    calculateAll();
}

function getPatientStatus() {
    const isHealthy = document.getElementById('status_healthy').checked;
    if (isHealthy) return { healthy: true, cardiac: false, liver: false, kidney: false };
    
    return {
        healthy: false,
        cardiac: document.getElementById('status_cardiac').checked,
        liver: document.getElementById('status_liver').checked,
        kidney: document.getElementById('status_kidney').checked,
    };
}

// --- 메인 계산 함수 ---
function calculateAll() {
    updateTubeDisplay(); 

    const weightInput = document.getElementById('weight');
    if (!weightInput || !weightInput.value) {
        const weightInputTube = document.getElementById('weight-input');
        if (weightInputTube) {
            weightInputTube.value = '';
            calculateWeightSize(); // 결과 숨기기
        }
        return;
    }
    
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) return;

    const weightInputTube = document.getElementById('weight-input');
    if (weightInputTube) {
        weightInputTube.value = weight;
        calculateWeightSize();
    }
    
    populatePrepTab(weight);
    populateEmergencyTab(weight);
    populateDischargeTab(); // 이제 자체적으로 체중을 읽음
}

// --- 탭별 내용 채우기 ---
function populatePrepTab(weight) {
    const patientStatus = getPatientStatus();
    
    // 약물 계산
    const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
    const butorMl = (0.2 * weight) / concentrations.butorphanol;
    const midaMl = (0.2 * weight) / concentrations.midazolam;
    const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
    const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
    const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
    const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
    const propofolMlMin = (2 * weight) / concentrations.propofol;
    const propofolMlMax = (6 * weight) / concentrations.propofol;
    
    // 수액 계산
    let fluidRate = 5; // 기본
    if (patientStatus.cardiac || patientStatus.kidney) fluidRate = 2; // 심장/신장 이상시
    const pumpCorrectionFactor = 0.7;
    const fluidTarget = fluidRate * weight;
    const fluidCorrected = fluidTarget / pumpCorrectionFactor;

    // 노스판 패치 추천
    let patchRecommendation = "";
    if (weight <= 3) { patchRecommendation = "5 mcg/h 1매"; } 
    else if (weight > 3 && weight <= 6) { patchRecommendation = "10 mcg/h 1매"; }
    else { patchRecommendation = "20 mcg/h 1매"; }

    // DOM 업데이트
    const alfaxanCard = `<div class="p-3 bg-indigo-50 rounded-lg ${patientStatus.cardiac ? 'highlight-recommend' : ''}"><h4 class="font-bold text-indigo-800">알팍산</h4><p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span></p>${patientStatus.cardiac ? '<p class="text-xs font-bold text-green-700">심질환 추천</p>' : ''}</div>`;
    const propofolCard = `<div class="p-3 bg-purple-50 rounded-lg"><h4 class="font-bold text-purple-800">프로포폴</h4><p><span class="result-value">${propofolMlMin.toFixed(2)}~${propofolMlMax.toFixed(2)} mL</span></p><p class="text-xs text-gray-500">(2-6mg/kg)</p></div>`;

    document.getElementById('pre_op_drugs_result').innerHTML = `
        <div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold text-teal-800">예방적 항생제</h4><p><span class="result-value">${clavaIvMl.toFixed(2)} mL</span> (클라바목스)</p></div>
        <div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold text-blue-800">마취 전 투약</h4><p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p></div>
        <div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold text-amber-800">LK 부하 용량</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p></div>
        <div class="p-3 bg-cyan-50 rounded-lg"><h4 class="font-bold text-cyan-800">수액 펌프</h4><p><span class="result-value">${fluidCorrected.toFixed(1)} mL/hr</span></p><p class="text-xs text-gray-500 mt-1">(목표: ${fluidTarget.toFixed(1)}mL/hr)</p></div>
        <div class="p-3 bg-rose-50 rounded-lg"><h4 class="font-bold text-rose-800">노스판 패치</h4><p><span class="result-value">${patchRecommendation}</span></p></div>
        <div class="p-3 bg-gray-50 rounded-lg col-span-full"><h4 class="font-bold text-gray-800 mb-2">도입마취</h4><div class="grid grid-cols-2 gap-2">${alfaxanCard}${propofolCard}</div></div>
    `;
    
    // 너브 블락 및 CRI 계산 (기존 로직 유지)
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
    const patientStatus = getPatientStatus();
    const dobutamineDose = parseFloat(document.getElementById('dobutamine_dose_select')?.value) || 5;
    const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * 12.5 / 30));
    document.getElementById('hypotension_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800">저혈압 (MAP < 60)</h4><ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">호흡 마취제 농도 감소:</span> 가장 빠르고 중요한 첫 단계.</li><li><span class="font-bold">환자 상태 확인:</span> 심장병 유무에 따라 대처가 달라짐.<ul class="list-disc list-inside ml-4 text-xs"><li><span class="font-semibold">건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg over 10-15min)</li><li><span class="font-semibold text-red-600">심장/신장 질환 환자:</span> 수액 볼루스 금기! 승압제 우선.</li></ul></li></ol><div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2"><h5 class="font-semibold text-center text-sm">도부타민 CRI (심장 수축력 강화)</h5><p class="text-xs text-center mb-1">희석: 원액 0.5mL + N/S 29.5mL (권장: 2-10 mcg/kg/min)</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="dobutamine_dose_select" class="large-interactive-field" oninput="calculateAll()"><option value="2">2</option><option value="5" selected>5</option><option value="10">10</option></select></div><p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div>`;
    document.getElementById('dobutamine_dose_select').value = dobutamineDose;
    const atropineLowMl = (0.02 * weight) / concentrations.atropine;
    const atropineHighMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('bradycardia_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800 mt-4">서맥 (Bradycardia)</h4><p class="text-xs text-gray-600">저혈압 동반 시, 심박수 < 60-80 bpm 일 때 고려</p><div class="mt-2 p-3 rounded-lg bg-red-100 text-center"><h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p></div>`;
    const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
    const epiHighMl = (0.1 * weight) / concentrations.epinephrine;
    const atropineCpaMl = (0.04 * weight) / concentrations.atropine;
    document.getElementById('cpa_protocol').innerHTML = `<ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">BLS (기본소생술):</span> 즉시 100-120회/분 흉부압박, 6초에 1회 환기 시작.</li><li><span class="font-bold">ALS (전문소생술):</span> 2분마다 흉부압박 교대하며 아래 약물 투여.</li></ol><div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center"><h5 class="font-semibold text-sm">에피네프린 (Low dose, 1차)</h5><p class="text-xs mb-1 font-semibold">희석법: 에피네프린 원액 0.1mL + N/S 0.9mL (총 1mL)</p><p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr><h5 class="font-semibold text-sm">아트로핀 (Asystole/PEA 시)</h5><p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL (${(atropineCpaMl*0.5).toFixed(2)} mg) IV</p><hr><h5 class="font-semibold text-sm">에피네프린 (High dose, 반응 없을 시)</h5><p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p></div>`;
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

function saveAsImage(captureId) {
    const captureElement = document.getElementById(captureId);
    const patientName = document.getElementById('patientName').value || '환자';
    html2canvas(captureElement, { useCORS: true, scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${patientName}_${captureId}_안내문.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function exportPrepSheetAsImage() {
    const captureElement = document.getElementById('prepTab');
    const weight = document.getElementById('weight').value || '체중미입력';
    const patientName = document.getElementById('patientName').value || '환자';
    const filename = `${patientName}_${weight}kg_마취준비시트.png`;
    
    html2canvas(captureElement, { useCORS: true, scale: 1.5, backgroundColor: '#f0f4f8' }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// --- ET Tube 계산기 및 기록 관련 함수 ---
const weightSizeGuide = [ { weight: 1, size: '3.0' }, { weight: 2, size: '3.5' }, { weight: 3.5, size: '4.0' }, { weight: 4, size: '4.5' }, { weight: 6, size: '5.5' }, { weight: 8, size: '6.0' }, { weight: 9, size: '7.0' }, { weight: 12, size: '7.0' }, { weight: 14, size: '7.5' }, { weight: 20, size: '9.0' }, { weight: 30, size: '11.0' }, { weight: 40, size: '13.0' } ];
const tracheaSizeGuide = [ { diameter: 5.13, id: '2.5' }, { diameter: 5.88, id: '3.0' }, { diameter: 6.63, id: '3.5' }, { diameter: 7.50, id: '4.0' }, { diameter: 8.13, id: '4.5' }, { diameter: 8.38, id: '5.0' }, { diameter: 9.13, id: '5.5' }, { diameter: 10.00, id: '6.0' }, { diameter: 11.38, id: '6.5' }, { diameter: 11.63, id: '7.0' }, { diameter: 12.50, id: '7.5' }, { diameter: 13.38, id: '8.0' } ];

function calculateWeightSize() {
    const weightInput = document.getElementById('weight-input');
    const resultContainerWeight = document.getElementById('result-container-weight');
    const resultTextWeight = document.getElementById('result-text-weight');
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) { resultContainerWeight.classList.add('hidden'); return; }
    let recommendedSize = '13.0 이상';
    for (let i = 0; i < weightSizeGuide.length; i++) { if (weight <= weightSizeGuide[i].weight) { recommendedSize = weightSizeGuide[i].size; break; } }
    resultTextWeight.textContent = recommendedSize;
    resultContainerWeight.classList.remove('hidden');
}

function calculateTracheaSize() {
    const tracheaInput = document.getElementById('trachea-input');
    const resultContainerTrachea = document.getElementById('result-container-trachea');
    const resultTextTrachea = document.getElementById('result-text-trachea');
    const diameter = parseFloat(tracheaInput.value);
    if (isNaN(diameter) || diameter <= 0) { resultContainerTrachea.classList.add('hidden'); return; }
    let recommendedId = '8.0 이상';
     for (let i = 0; i < tracheaSizeGuide.length; i++) { if (diameter <= tracheaSizeGuide[i].diameter) { recommendedId = tracheaSizeGuide[i].id; break; } }
    resultTextTrachea.textContent = recommendedId;
    resultContainerTrachea.classList.remove('hidden');
}

function saveAndDisplayTubeSelection() {
    const sizeInput = document.getElementById('selectedEtTubeSize');
    const cuffInput = document.getElementById('selectedEtTubeCuff');
    const notesInput = document.getElementById('selectedEtTubeNotes');

    if (!sizeInput.value) { alert('최종 ET Tube 사이즈를 입력해주세요.'); sizeInput.focus(); return; }
    selectedTubeInfo.size = parseFloat(sizeInput.value);
    selectedTubeInfo.cuff = cuffInput.checked;
    selectedTubeInfo.notes = notesInput.value;
    const saveButton = document.getElementById('saveEtTubeSelection');
    saveButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>저장 완료!';
    saveButton.classList.replace('bg-blue-600', 'bg-green-600');
    setTimeout(() => {
        saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>기록 저장';
        saveButton.classList.replace('bg-green-600', 'bg-blue-600');
    }, 2000);
    updateTubeDisplay();
}

function updateTubeDisplay() {
    const displayDiv = document.getElementById('et_tube_selection_display');
    if (!displayDiv) return;
    if (selectedTubeInfo.size) {
        const cuffStatus = selectedTubeInfo.cuff ? `<span class="text-green-600 font-semibold"><i class="fas fa-check-circle mr-1"></i>확인 완료</span>` : `<span class="text-red-600 font-semibold"><i class="fas fa-times-circle mr-1"></i>미확인</span>`;
        const notesText = selectedTubeInfo.notes ? `<p class="text-sm text-gray-600 mt-2"><strong>메모:</strong> ${selectedTubeInfo.notes}</p>` : '';
        displayDiv.innerHTML = `<div class="text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4"><p class="text-lg"><strong>선택된 Tube 사이즈 (ID):</strong> <span class="result-value text-2xl">${selectedTubeInfo.size}</span></p><p class="text-lg"><strong>커프(Cuff) 확인:</strong> ${cuffStatus}</p></div>${notesText}`;
    } else {
        displayDiv.innerHTML = '<p class="text-gray-700">ET Tube가 아직 선택되지 않았습니다. \'ET Tube 계산기\' 탭에서 기록해주세요.</p>';
    }
}

// --- 기록 저장/불러오기 기능 ---
function saveState() {
    const state = {
        patientName: document.getElementById('patientName').value,
        surgeryDate: document.getElementById('surgeryDate').value,
        weight: document.getElementById('weight').value,
        status: {
            healthy: document.getElementById('status_healthy').checked,
            cardiac: document.getElementById('status_cardiac').checked,
            liver: document.getElementById('status_liver').checked,
            kidney: document.getElementById('status_kidney').checked,
        },
        etTube: selectedTubeInfo,
        education: {
            attachDate: document.getElementById('attachDate').value,
            attachTime: document.getElementById('attachTime').value,
        },
        dischargeMeds: []
    };

    document.querySelectorAll('#dischargeTab .med-checkbox:checked').forEach(cb => {
        const row = cb.closest('tr');
        state.dischargeMeds.push({
            drug: row.dataset.drug,
            days: row.querySelector('.days').value,
            dose: row.querySelector('.dose')?.value
        });
    });

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `${state.patientName || '환자'}_마취기록_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadState(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const state = JSON.parse(e.target.result);
        
        document.getElementById('patientName').value = state.patientName || '';
        document.getElementById('surgeryDate').value = state.surgeryDate || '';
        document.getElementById('weight').value = state.weight || '';

        document.getElementById('status_healthy').checked = state.status?.healthy ?? true;
        document.getElementById('status_cardiac').checked = state.status?.cardiac ?? false;
        document.getElementById('status_liver').checked = state.status?.liver ?? false;
        document.getElementById('status_kidney').checked = state.status?.kidney ?? false;
        
        selectedTubeInfo = state.etTube || { size: null, cuff: false, notes: '' };
        document.getElementById('selectedEtTubeSize').value = selectedTubeInfo.size;
        document.getElementById('selectedEtTubeCuff').checked = selectedTubeInfo.cuff;
        document.getElementById('selectedEtTubeNotes').value = selectedTubeInfo.notes;
        
        document.getElementById('attachDate').value = state.education?.attachDate || '';
        document.getElementById('attachTime').value = state.education?.attachTime || '';

        // 퇴원약 로드
        document.querySelectorAll('#dischargeTab .med-checkbox').forEach(cb => cb.checked = false);
        state.dischargeMeds?.forEach(med => {
            const row = document.querySelector(`#dischargeTab tr[data-drug="${med.drug}"]`);
            if (row) {
                row.querySelector('.med-checkbox').checked = true;
                row.querySelector('.days').value = med.days;
                if(row.querySelector('.dose')) row.querySelector('.dose').value = med.dose;
            }
        });

        syncPatientName();
        calculateAll();
        calculateRemovalDate();
    };
    reader.readAsText(file);
}

function saveDashboardImage() {
    const captureElement = document.getElementById('dashboard-capture-area');
    const patientName = document.getElementById('patientName').value || '환자';
    html2canvas(captureElement, { useCORS: true, scale: 1.5 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${patientName}_마취대시보드.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function syncPatientName() {
    const name = document.getElementById('patientName').value;
    document.getElementById('educationPatientName').value = name;
    document.getElementById('dischargePatientName').textContent = name || '정보 없음';
}

// --- 퇴원약 조제 (강아지) 탭 로직 ---
const dogMedications = {
    antibiotics: [
        { drug: 'amoxicillin', strength: 500, unit: 'cap', dose: 20, doseRange: '(20-40)', notes: '신장 주의.', kidney: true },
        { drug: 'clindamycin', strength: 150, unit: 'cap', dose: 11, doseRange: '(11-22)', notes: '뼈, 치과 감염에 탁월.' },
        { drug: 'doxycycline', strength: 100, unit: 'T', dose: 5, doseRange: '(5-10)', notes: '간/신장 주의.', liver: true, kidney: true },
        { drug: 'metronidazole', strength: 250, unit: 'T', dose: 15, doseRange: '(15-30)', notes: '<span class="caution">간 기능 저하 시 신경독성 위험!</span>', liver: true },
        { drug: 'enrofloxacin', strength: 50, unit: 'T', dose: 5, doseRange: '(5-20)', notes: '간/신장 주의.', liver: true, kidney: true },
        { drug: 'marbofloxacin', strength: 20, unit: 'T', special: 'marbofloxacin', dose: 2, doseRange: 'mg/kg (1일 1회)', notes: '간/신장 주의.', liver: true, kidney: true },
        { drug: 'cefixime', strength: 100, unit: 'T', dose: 5, doseRange: '(5-10)', notes: '간/신장 주의.', liver: true, kidney: true },
    ],
    analgesics: [
        { drug: 'vetrocam', special: 'vetrocam', unit: 'ml', days: 3, doseRange: '첫날: 체중*0.2ml<br>이후: 체중*0.1ml', notes: '<span class="caution">5일 이상 금기, 신장 이상시 금기</span>', kidney: true },
        { drug: 'gabapentin', strength: 100, unit: 'T', dose: 10, doseRange: '(15-30+) mg/kg', notes: '<span class="caution">신부전 시 용량/간격 조절 필수.</span> 간/신장 주의.', kidney: true, liver: true },
        { drug: 'tramadol', strength: 50, unit: 'T', dose: 4, doseRange: '(4-10) mg/kg', notes: '효과 논란 많음. 간/신장 주의.', liver: true, kidney: true },
        { drug: 'acetaminophen', strength: 500, unit: 'T', days: 3, dose: 16, doseRange: '(단기) mg/kg', notes: '<span class="caution">간독성 위험! 3일 이내 단기 사용만 고려.</span> 식후 투여.', liver: true },
    ],
    gi: [
        { drug: 'famotidine', strength: 20, unit: 'T', dose: 0.5, doseRange: '(1-2)', notes: '신부전 시 용량 조절 필요.', kidney: true },
        { drug: 'misoprostol', strength: 200, unit: 'T', days: 3, dose: 3, doseRange: '(3-5) mcg/kg', notes: '<span class="caution">단위가 mcg임에 반드시 주의!</span>' },
        { drug: 'almagel', strength: 500, unit: 'T', dose: 10, doseRange: '(경험적)', notes: '다른 약물 흡수 방해. 신부전 시 장기 투여 주의.', kidney: true },
    ],
    liver: [
        { drug: 'udca', strength: 200, unit: 'T', dose: 5, doseRange: '(10-15 mg/kg/day)', notes: '담즙 정체성 간질환에 핵심적. <strong>식후 투여.</strong>' },
        { drug: 'silymarin', strength: 140, unit: 'T', dose: 10, doseRange: '(20-50 mg/kg/day)', notes: '항산화/간세포 보호. 갈아서 투여 가능.' },
        { drug: 'same', strength: 200, special: 'same', unit: 'T', doseRange: '2.5kg당 1/4정 (1일 1회)', notes: '<span class="caution">장용코팅정. 절대 갈지 말고, 공복에 통째로 투여.</span>' },
        { drug: 'paramel', special: 'paramel', unit: 'ml', doseRange: '0.75 ml/kg', notes: '15g 원액 2배 희석 기준 용량.' },
    ],
    antifungals: [
        { drug: 'itraconazole', strength: 100, unit: 'cap', dose: 2.5, doseRange: '(5-10 mg/kg/day)', notes: '대표적인 <span class="caution">간 독성 유발 약물. 반드시 음식과 함께 투여.</span>', liver: true },
    ]
};

function createMedicationTable(medList, containerId) {
    const tbody = document.getElementById(containerId);
    tbody.innerHTML = '';
    medList.forEach(med => {
        const tr = document.createElement('tr');
        tr.dataset.drug = med.drug;
        if (med.strength) tr.dataset.strength = med.strength;
        if (med.unit) tr.dataset.unit = med.unit;
        if (med.special) tr.dataset.special = med.special;
        
        const notesData = `${med.liver ? `data-liver="true"`:''} ${med.kidney ? `data-kidney="true"`:''}`;
        
        tr.innerHTML = `
            <td class="p-2 border text-center"><input type="checkbox" class="med-checkbox h-5 w-5"></td>
            <td class="p-2 border">${med.drug} (${med.strength || ''}${med.unit || ''})</td>
            <td class="p-2 border text-center"><input type="number" class="days w-16 p-1 text-center border rounded" value="${med.days || 7}" min="1"></td>
            <td class="p-2 border">${med.special ? med.doseRange : `<input type="number" class="dose w-20 p-1 text-center border rounded" value="${med.dose}" step="0.1"> ${med.doseRange || ''}`}</td>
            <td class="total-amount p-2 border font-bold"></td>
            <td class="notes p-2 border" ${notesData}>${med.notes}</td>
        `;
        tbody.appendChild(tr);
    });
}

function populateDischargeTab() {
    const weight = parseFloat(document.getElementById('weight').value);
    const patientStatus = getPatientStatus();
    document.getElementById('dischargeWeight').textContent = isNaN(weight) ? '미입력' : weight;

    if (isNaN(weight) || weight <= 0) {
        document.getElementById('summary').innerHTML = '<p>체중을 입력해주세요.</p>';
        return;
    }

    const summaryData = {};

    document.querySelectorAll('#dischargeTab .med-checkbox:checked').forEach(checkbox => {
        const row = checkbox.closest('tr');
        const drugName = row.querySelector('td:nth-child(2)').textContent;
        const days = parseInt(row.querySelector('.days').value);
        const unit = row.dataset.unit;
        let totalAmount = 0;
        let totalAmountText = '';
        let dailyMultiplier = 2; // BID 기본

        if (row.dataset.special === 'vetrocam') {
            dailyMultiplier = 1;
            const day1Dose = weight * 0.2;
            const otherDaysDose = weight * 0.1 * (days - 1);
            totalAmount = day1Dose + (days > 1 ? otherDaysDose : 0);
            totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
        } else if (row.dataset.special === 'same') {
            dailyMultiplier = 1;
            totalAmount = (weight / 2.5) * 0.25 * days;
            totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
        } else if (row.dataset.special === 'marbofloxacin') {
            dailyMultiplier = 1;
            const dose = parseFloat(row.querySelector('.dose').value);
            const strength = parseFloat(row.dataset.strength);
            totalAmount = (weight * dose * dailyMultiplier * days) / strength;
            totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
        } else if (row.dataset.special === 'paramel') {
             dailyMultiplier = 2;
             const dose = 0.75;
             totalAmount = weight * dose * dailyMultiplier * days;
             totalAmo
