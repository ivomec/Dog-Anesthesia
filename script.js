// --- 전역 변수 및 상수 ---
const concentrations = { lidocaine: 20, ketamine: 50, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, };
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

// --- 이름 동기화 ---
function syncPatientName() {
    const mainName = document.getElementById('patient_name_main').value;
    const handoutName = document.getElementById('patientName_handout');
    const dischargeName = document.getElementById('discharge_patient_name');

    if (handoutName) handoutName.value = mainName;
    if (dischargeName) dischargeName.textContent = mainName || '정보 없음';
}

// --- 메인 계산 함수 ---
function calculateAll() {
    syncPatientName();
    const weightInput = document.getElementById('weight');
    updateTubeDisplay();

    if (!weightInput || !weightInput.value) {
        const weightInputTube = document.getElementById('weight-input');
        if (weightInputTube) {
            weightInputTube.value = '';
            calculateWeightSize();
        }
        document.getElementById('discharge_patient_weight').textContent = '0';
        populatePrepTab(0); 
        calculateDischargeMeds();
        return;
    }
    
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) {
        document.getElementById('discharge_patient_weight').textContent = '유효하지 않은 체중';
        populatePrepTab(0);
        calculateDischargeMeds();
        return;
    }
    
    const weightInputTube = document.getElementById('weight-input');
    if (weightInputTube) {
        weightInputTube.value = weight;
        calculateWeightSize();
    }
    
    document.getElementById('discharge_patient_weight').textContent = weight;

    populatePrepTab(weight);
    populateEmergencyTab(weight);
    calculateDischargeMeds();
}

// --- 탭별 내용 채우기 ---
function populatePrepTab(weight) {
    const antibioticSelection = document.getElementById('antibiotic_selection')?.value || 'baytril50';
    const isCardiac = document.getElementById('status_cardiac').checked;

    let antibioticResultHTML = '';
    if (weight > 0) {
        switch (antibioticSelection) {
            case 'baytril50': antibioticResultHTML = `<p class="text-center"><span class="result-value">${(weight * 0.05).toFixed(2)} mL</span></p>`; break;
            case 'cephron7': antibioticResultHTML = `<p class="text-center"><span class="result-value">${(weight * 0.05).toFixed(2)} mL</span></p>`; break;
            case 'baytril25': antibioticResultHTML = `<p class="text-center"><span class="result-value">${(weight * 0.1).toFixed(2)} mL</span></p>`; break;
            case 'baytril50_dexa': antibioticResultHTML = `<div class="text-sm space-y-1"><div class="flex justify-between"><span>바이트릴 50주:</span><span class="result-value">${(weight * 0.05).toFixed(2)} mL</span></div><div class="flex justify-between"><span>덱사메타손:</span><span class="result-value">${(weight * 0.1).toFixed(2)} mL</span></div></div>`; break;
            case 'cephron7_dexa': antibioticResultHTML = `<div class="text-sm space-y-1"><div class="flex justify-between"><span>세프론세븐:</span><span class="result-value">${(weight * 0.05).toFixed(2)} mL</span></div><div class="flex justify-between"><span>덱사메타손:</span><span class="result-value">${(weight * 0.1).toFixed(2)} mL</span></div></div>`; break;
        }
    }
    const antibioticDivHTML = `<div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold text-teal-800 mb-2">예방적 항생제</h4><select id="antibiotic_selection" class="large-interactive-field !text-sm !p-2 w-full" onchange="calculateAll()"><option value="baytril50">바이트릴 50주</option><option value="cephron7">세프론세븐</option><option value="baytril25">바이트릴 25주</option><option value="baytril50_dexa">바이트릴50주 & 스테로이드</option><option value="cephron7_dexa">세프론세븐 & 스테로이드</option></select><div class="mt-2 p-2 bg-white rounded min-h-[40px] flex items-center justify-center">${antibioticResultHTML}</div></div>`;
    
    let patchRecText = '체중 입력 필요';
    if (weight > 0) {
        if (weight <= 3) patchRecText = '5 ug/h 패치 적용';
        else if (weight <= 6) patchRecText = '10 ug/h 패치 적용';
        else patchRecText = '20 ug/h 패치 적용';
    }
    const patchCardHTML = `<div class="p-3 bg-yellow-50 rounded-lg"><h4 class="font-bold text-yellow-800">노스판 패치</h4><p><span class="result-value">${patchRecText}</span></p></div>`;

    let butorMl = 0, midaMl = 0, lidoLoadMl = 0, ketaLoadMl_diluted = 0, alfaxanMlMin = 0, alfaxanMlMax = 0, propofolMlMin = 0, propofolMlMax = 0;
    if (weight > 0) {
        butorMl = (0.2 * weight) / concentrations.butorphanol;
        midaMl = (0.2 * weight) / concentrations.midazolam;
        lidoLoadMl = (1 * weight) / concentrations.lidocaine;
        ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
        alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
        alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
        propofolMlMin = (2 * weight) / concentrations.propofol;
        propofolMlMax = (6 * weight) / concentrations.propofol;
    }

    const alfaxanCard = `<div id="alfaxan_card" class="p-2 bg-indigo-50 rounded-lg transition-all duration-300"><h5 class="font-semibold text-indigo-800">알팍산</h5><p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span></p>${isCardiac ? '<p class="text-xs font-bold text-green-600 mt-1">❤️ 심장질환 추천</p>' : ''}</div>`;
    const propofolCard = `<div class="p-2 bg-purple-50 rounded-lg"><h5 class="font-semibold text-purple-800">프로포폴</h5><p><span class="result-value">${propofolMlMin.toFixed(2)}~${propofolMlMax.toFixed(2)} mL</span></p><p class="text-xs text-gray-500 mt-1">(2-6 mg/kg)</p></div>`;

    // --- 수액 속도 계산 로직 시작 (보정값 적용) ---
    let fluidCardHTML;
    if (weight > 0) {
        let rates;
        let patientStatusText;
        const isRenal = document.getElementById('status_renal').checked;
        const isLiver = document.getElementById('status_liver').checked;

        if (isCardiac) {
            patientStatusText = "심장 질환";
            rates = {
                pre: { low: 1.0, high: 2.0 },
                intra: { low: 1.0, high: 3.0 },
                post: { text: "< 2.0 또는 중단" }
            };
        } else if (isRenal || isLiver) {
            patientStatusText = isRenal ? "신장 질환" : "간 질환";
            rates = {
                pre: { low: 3.0, high: 4.0 },
                intra: { low: 3.0, high: 5.0 },
                post: { low: 3.0, high: 4.0 }
            };
        } else {
            patientStatusText = "정상 환자";
            rates = {
                pre: { low: 2.0, high: 4.0 },
                intra: { text: "5.0" },
                post: { text: "즉시 중단" }
            };
        }

        const getRatesHTML = (label, rate) => {
            const correctionFactor = 0.7;
            let targetText, pumpSetText;

            if (rate.low && rate.high) {
                const targetLow = rate.low * weight;
                const targetHigh = rate.high * weight;
                targetText = `${targetLow.toFixed(1)}~${targetHigh.toFixed(1)} mL/hr`;

                const pumpLow = targetLow / correctionFactor;
                const pumpHigh = targetHigh / correctionFactor;
                pumpSetText = `${pumpLow.toFixed(1)}~${pumpHigh.toFixed(1)} mL/hr`;
            } else if (rate.text === "5.0") {
                const target = parseFloat(rate.text) * weight;
                targetText = `${target.toFixed(1)} mL/hr`;
                const pumpSet = target / correctionFactor;
                pumpSetText = `${pumpSet.toFixed(1)} mL/hr (시작점)`;
            } else { // Handles text like "즉시 중단" or "< 2.0 또는 중단"
                targetText = rate.text;
                pumpSetText = rate.text; // No correction for text-based instructions
            }

            return `
                <div class="flex flex-col p-2 bg-white rounded-md border">
                    <span class="font-semibold text-gray-700 text-sm">${label}</span>
                    <span class="result-value text-xl font-extrabold text-cyan-700">${pumpSetText}</span>
                    <span class="text-xs text-gray-500 text-right">(목표: ${targetText})</span>
                </div>
            `;
        };
        
        fluidCardHTML = `
        <div class="p-3 bg-cyan-50 rounded-lg">
            <h4 class="font-bold text-cyan-800 mb-2">수액 펌프 설정 (보정값)</h4>
            <div class="space-y-2">
                ${getRatesHTML('마취 전', rates.pre)}
                ${getRatesHTML('마취 중', rates.intra)}
                ${getRatesHTML('마취 후', rates.post)}
            </div>
            <p class="text-xs text-cyan-900 mt-2 text-center font-semibold">(${patientStatusText} / 보정계수 0.7 적용)</p>
        </div>`;
    } else {
        fluidCardHTML = `
        <div class="p-3 bg-cyan-50 rounded-lg">
            <h4 class="font-bold text-cyan-800 mb-2">수액 펌프 설정</h4>
            <p class="text-gray-600 text-center p-4">체중을 입력해주세요.</p>
        </div>`;
    }
    // --- 수액 속도 계산 로직 끝 ---

    document.getElementById('pre_op_drugs_result').innerHTML = `${antibioticDivHTML}${patchCardHTML}<div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold text-blue-800">마취 전 투약</h4><p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p></div><div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold text-amber-800">LK 부하 용량</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p><p class="text-xs text-gray-600 font-semibold mt-1">※ 케타민(50주) 0.2mL + N/S 0.8mL</p></div><div class="p-3 bg-indigo-50 rounded-lg col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2"><h4 class="font-bold text-indigo-800">도입 마취</h4><div class="grid grid-cols-2 gap-2 mt-2">${alfaxanCard}${propofolCard}</div></div>${fluidCardHTML}`;
    
    document.getElementById('antibiotic_selection').value = antibioticSelection;
    const alfaxanElement = document.getElementById('alfaxan_card');
    if (alfaxanElement) alfaxanElement.classList.toggle('highlight-recommendation', isCardiac);
    
    const sites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;
    document.getElementById('dog_nerve_block_result').innerHTML = `<div class="space-y-2"><label for="dog_block_sites" class="font-semibold text-gray-700">마취 부위 수:</label><select id="dog_block_sites" class="large-interactive-field" onchange="calculateAll()"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select></div><div class="p-3 border rounded-lg bg-gray-50 mt-4 text-center"><h4 class="font-semibold text-gray-800">총 준비 용량 (${sites}군데)</h4><p class="text-lg"><span class="result-value">${((0.1 * weight * sites)*0.8).toFixed(2)}mL</span> (부피) + <span class="result-value">${((0.1 * weight * sites)*0.2).toFixed(2)}mL</span> (리도)</p><p class="text-xs text-gray-500 mt-1">부위당 약 ${((0.1 * weight * sites) / sites).toFixed(2)} mL 주입</p></div>`;
    document.getElementById('dog_block_sites').value = sites;
    const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
    const pumpRate = weight > 0 ? (lidoRateMcg * weight * 60) / 2000 : 0;
    document.getElementById('lk_cri_calc_result').innerHTML = `<div class="p-4 border rounded-lg bg-gray-50 space-y-2"><h4 class="font-semibold text-gray-800">CRI 펌프 속도 설정</h4><p class="text-xs text-gray-600">희석: 리도카인 3mL + 케타민(50주) 0.24mL + N/S 26.76mL</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="lk_cri_rate_mcg" class="large-interactive-field" onchange="calculateAll()"><option value="25">25</option><option value="30">30</option><option value="50">50</option></select></div><div class="mt-2 text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
    document.getElementById('lk_cri_rate_mcg').value = lidoRateMcg;
    
    let workflowHTML = `<div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 1: 내원 및 준비</h3><p class="text-sm text-gray-700">보호자 동의서 작성. 환자는 즉시 IV 카테터 장착 후, 준비된 예방적 항생제를 투여하고 수액 처치를 시작합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 2: 수액처치 & 산소 공급 (최소 10분)</h3><p class="text-sm text-gray-700">'약물 준비' 섹션에 계산된 수액 펌프 속도로 수액을 맞추고, 수술 준비 동안 입원장 안에서 산소를 공급합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 3: 마취 전 투약 및 산소 공급 (3분)</h3><p class="text-sm text-gray-700">마스크로 100% 산소를 공급하면서, 준비된 부토르파놀 + 미다졸람을 3분에 걸쳐 천천히 IV로 주사합니다.</p></div><div class="warning-card p-4"><h3 class="font-bold text-lg text-amber-800">Step 4: LK-CRI 부하 용량 (Loading Dose)</h3><p class="text-sm text-gray-700">마취 유도 직전, 준비된 리도카인과 케타민을 2분에 걸쳐 매우 천천히 IV로 주사합니다. 이는 통증 증폭을 막는 핵심 단계입니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 5: 마취 유도 (Induction)</h3><p class="text-sm text-gray-700">준비된 알팍산 또는 다른 유도제를 효과를 봐가며 천천히 주사하여 기관 삽관합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 6: 마취 유지 (Maintenance)</h3><p class="text-sm text-gray-700">삽관 후 즉시 이소플루란 마취를 시작하고, 동시에 LK-CRI 펌프를 작동시키며 수액 펌프 속도를 '마취 중' 권장 설정값으로 변경합니다.</p></div>`;
    document.getElementById('workflow_steps').innerHTML = workflowHTML;
}

function populateEmergencyTab(weight) {
    let dobutamineDose = 5, infusionRateMlPerHr = 0, atropineLowMl = 0, atropineHighMl = 0, epiLowMl = 0, epiHighMl = 0, atropineCpaMl = 0;
    if (weight > 0) {
        dobutamineDose = parseFloat(document.getElementById('dobutamine_dose_select')?.value) || 5;
        infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * 12.5 / 30));
        atropineLowMl = (0.02 * weight) / concentrations.atropine;
        atropineHighMl = (0.04 * weight) / concentrations.atropine;
        epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
        epiHighMl = (0.1 * weight) / concentrations.epinephrine;
        atropineCpaMl = (0.04 * weight) / concentrations.atropine;
    }
    document.getElementById('hypotension_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800">저혈압 (MAP < 60)</h4><ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">호흡 마취제 농도 감소:</span> 가장 빠르고 중요한 첫 단계.</li><li><span class="font-bold">환자 상태 확인:</span> 심장병 유무에 따라 대처가 달라짐.<ul class="list-disc list-inside ml-4 text-xs"><li><span class="font-semibold">건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg over 10-15min)</li><li><span class="font-semibold text-red-600">심장 질환 환자:</span> 수액 볼루스 금기! 승압제 우선.</li></ul></li></ol><div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2"><h5 class="font-semibold text-center text-sm">도부타민 CRI (심장 수축력 강화)</h5><p class="text-xs text-center mb-1">희석: 원액 0.5mL + N/S 29.5mL (권장: 2-10 mcg/kg/min)</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="dobutamine_dose_select" class="large-interactive-field" oninput="calculateAll()"><option value="2">2</option><option value="5" selected>5</option><option value="10">10</option></select></div><p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div>`;
    if(document.getElementById('dobutamine_dose_select')) document.getElementById('dobutamine_dose_select').value = dobutamineDose;
    document.getElementById('bradycardia_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800 mt-4">서맥 (Bradycardia)</h4><p class="text-xs text-gray-600">저혈압 동반 시, 심박수 < 60-80 bpm 일 때 고려</p><div class="mt-2 p-3 rounded-lg bg-red-100 text-center"><h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p></div>`;
    document.getElementById('cpa_protocol').innerHTML = `<ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">BLS (기본소생술):</span> 즉시 100-120회/분 흉부압박, 6초에 1회 환기 시작.</li><li><span class="font-bold">ALS (전문소생술):</span> 2분마다 흉부압박 교대하며 아래 약물 투여.</li></ol><div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center"><h5 class="font-semibold text-sm">에피네프린 (Low dose, 1차)</h5><p class="text-xs mb-1 font-semibold">희석법: 에피네프린 원액 0.1mL + N/S 0.9mL (총 1mL)</p><p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr><h5 class="font-semibold text-sm">아트로핀 (Asystole/PEA 시)</h5><p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL (${(atropineCpaMl*0.5).toFixed(2)} mg) IV</p><hr><h5 class="font-semibold text-sm">에피네프린 (High dose, 반응 없을 시)</h5><p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p></div>`;
}

// --- 퇴원약 조제 탭 (V2) 기능 ---
function initializeDischargeTabV2() {
    const defaultMeds = {'7day': ['clindamycin', 'gabapentin', 'famotidine', 'almagel'],'3day': ['vetrocam', 'misoprostol', 'acetaminophen']};
    defaultMeds['7day'].forEach(drugName => { const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`); if (row) { row.querySelector('.med-checkbox').checked = true; row.querySelector('.days').value = 7; } });
    defaultMeds['3day'].forEach(drugName => { const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`); if (row) { row.querySelector('.med-checkbox').checked = true; row.querySelector('.days').value = 3; } });
    const inputs = document.querySelectorAll('#dischargeTab .med-checkbox, #dischargeTab .days, #dischargeTab .dose');
    inputs.forEach(input => { input.addEventListener('change', calculateDischargeMeds); input.addEventListener('keyup', calculateDischargeMeds); });
    calculateDischargeMeds();
}

function calculateDischargeMeds() {
    const weight = parseFloat(document.getElementById('weight').value);
    const isLiverIssue = document.getElementById('status_liver').checked;
    const isKidneyIssue = document.getElementById('status_renal').checked;

    if (isLiverIssue) {
        ['udca', 'silymarin', 'same'].forEach(drugName => {
            const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`);
            if (row) { row.querySelector('.med-checkbox').checked = true; row.querySelector('.days').value = 7; }
        });
    }

    const summaryData = {};
    document.querySelectorAll('#dischargeTab .med-checkbox').forEach(checkbox => {
        const row = checkbox.closest('tr');
        const totalAmountCell = row.querySelector('.total-amount');
        if (totalAmountCell) totalAmountCell.textContent = '';

        if (checkbox.checked) {
            if (isNaN(weight) || weight <= 0) {
                updateDischargeSummaryUI({});
                updateDischargeWarnings();
                return;
            }

            const drugName = row.querySelector('td:nth-child(2)').textContent;
            const drugKey = row.dataset.drug;
            const days = parseInt(row.querySelector('.days').value);
            const unit = row.dataset.unit;
            let totalAmount = 0;
            let totalAmountText = '';
            let dailyMultiplier = 2; 

            if (row.dataset.special === 'vetrocam') {
                dailyMultiplier = 1;
                totalAmount = (weight * 0.2) + (weight * 0.1 * (days - 1));
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else if (row.dataset.special === 'same') {
                dailyMultiplier = 1;
                totalAmount = (weight / 2.5) * 0.25 * days;
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else if (row.dataset.special === 'marbofloxacin') {
                dailyMultiplier = 1;
                totalAmount = (weight * parseFloat(row.querySelector('.dose').value) * days) / parseFloat(row.dataset.strength);
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else if (row.dataset.special === 'paramel') {
                 dailyMultiplier = 2;
                 totalAmount = weight * 0.75 * dailyMultiplier * days;
                 totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else {
                if (['udca', 'silymarin', 'itraconazole'].includes(drugKey)) { dailyMultiplier = 2; }
                totalAmount = (weight * parseFloat(row.querySelector('.dose').value) * dailyMultiplier * days) / parseFloat(row.dataset.strength);
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            }
             
            if (totalAmountCell) totalAmountCell.textContent = totalAmountText;

            if (!summaryData[days]) { summaryData[days] = []; }
            
            let summaryText = `${drugName.split(' (')[0]} ${totalAmountText}`;
            if (dailyMultiplier === 1) {
                if (row.dataset.special === 'same') {
                    const dailyDoseFractionValue = Math.ceil(weight / 2.5) * 0.25;
                    let dailyDoseFractionText = '';
                    if (dailyDoseFractionValue <= 0.25) dailyDoseFractionText = '1/4정';
                    else if (dailyDoseFractionValue <= 0.5) dailyDoseFractionText = '1/2정';
                    else if (dailyDoseFractionValue <= 0.75) dailyDoseFractionText = '3/4정';
                    else dailyDoseFractionText = `${dailyDoseFractionValue.toFixed(2).replace('.00','')}정`;
                    summaryText += ` (1일 ${dailyDoseFractionText}씩)`;
                } else {
                    summaryText += ' (1일 1회)';
                }
            }
            
            const isGabapentin = drugKey === 'gabapentin';
            const isLiverDanger = row.querySelector('.notes').dataset.liver === 'true' && isLiverIssue;
            const isKidneyDanger = row.querySelector('.notes').dataset.kidney === 'true' && isKidneyIssue;

            summaryData[days].push({
                text: summaryText,
                isDanger: (isLiverDanger || isKidneyDanger) && !isGabapentin,
                isWarning: (isLiverDanger || isKidneyDanger) && isGabapentin
            });
        }
    });
    updateDischargeSummaryUI(summaryData);
    updateDischargeWarnings();
}

function updateDischargeSummaryUI(summaryData) {
    const summaryContainer = document.getElementById('discharge_summary');
    summaryContainer.innerHTML = '';
    const sortedDays = Object.keys(summaryData).sort((a, b) => a - b);
    if (sortedDays.length === 0) {
        summaryContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center">조제할 약물을 선택해주세요.</p>';
        return;
    }
    sortedDays.forEach(day => {
        const box = document.createElement('div');
        box.className = 'summary-box p-4 bg-blue-50 border border-blue-200 rounded-lg';
        const title = document.createElement('h3');
        title.className = 'font-bold text-blue-800 mb-2 text-lg';
        title.textContent = `${day}일 처방`;
        box.appendChild(title);
        const list = document.createElement('ul');
        list.className = 'space-y-1';
        summaryData[day].forEach(item => {
            const li = document.createElement('li');
            li.className = 'summary-item';
            if (item.isDanger) {
                li.innerHTML = `<span class="danger">${item.text}</span>`;
            } else if (item.isWarning) {
                li.innerHTML = `<span class="warning">${item.text}</span>`;
            } else {
                li.textContent = item.text;
            }
            list.appendChild(li);
        });
        box.appendChild(list);
        summaryContainer.appendChild(box);
    });
}

function updateDischargeWarnings() {
    const liverIssue = document.getElementById('status_liver').checked;
    const kidneyIssue = document.getElementById('status_renal').checked;
    document.querySelectorAll('#dischargeTab .notes').forEach(noteCell => {
        noteCell.classList.remove('highlight-warning');
        if ((liverIssue && noteCell.dataset.liver === 'true') || (kidneyIssue && noteCell.dataset.kidney === 'true')) {
            noteCell.classList.add('highlight-warning');
        }
    });
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

function saveHandoutAsPDF() { window.print(); }

function saveHandoutAsImage() {
    const captureElement = document.getElementById('captureArea');
    const patientName = document.getElementById('patientName_handout').value || '환자';
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
    { weight: 1, size: '2.0' }, { weight: 2, size: '2.5' }, { weight: 3.5, size: '3.0' }, { weight: 4, size: '3.5' },
    { weight: 5, size: '4.0' }, { weight: 6, size: '4.5' }, { weight: 7, size: '5.5' }, { weight: 8, size: '6.0' },
    { weight: 9, size: '6.5' }, { weight: 12, size: '7.0' }, { weight: 14, size: '7.5' }, { weight: 40, size: '9.0' }
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
    let recommendedSize = '9.0 이상';
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
    const tracheaSizeGuide = [
        { diameter: 5.13, id: '2.5' }, { diameter: 5.88, id: '3.0' }, { diameter: 6.63, id: '3.5' }, { diameter: 7.50, id: '4.0' },
        { diameter: 8.13, id: '4.5' }, { diameter: 8.38, id: '5.0' }, { diameter: 9.13, id: '5.5' }, { diameter: 10.00, id: '6.0' },
        { diameter: 11.38, id: '6.5' }, { diameter: 11.63, id: '7.0' }, { diameter: 12.50, id: '7.5' }, { diameter: 13.38, id: '8.0' }
    ];
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
        const cuffStatus = selectedTubeInfo.cuff ? '<span class="text-green-600 font-semibold"><i class="fas fa-check-circle mr-1"></i>확인 완료</span>' : '<span class="text-red-600 font-semibold"><i class="fas fa-times-circle mr-1"></i>미확인</span>';
        const notesText = selectedTubeInfo.notes ? `<p class="text-sm text-gray-600 mt-2"><strong>메모:</strong> ${selectedTubeInfo.notes}</p>` : '';
        displayDiv.innerHTML = `<div class="text-left grid grid-cols-1 sm:grid-cols-2 gap-x-4"><p class="text-lg"><strong>선택된 Tube 사이즈 (ID):</strong> <span class="result-value text-2xl">${selectedTubeInfo.size}</span></p><p class="text-lg"><strong>커프(Cuff) 확인:</strong> ${cuffStatus}</p></div>${notesText}`;
    } else {
        displayDiv.innerHTML = '<p class="text-gray-700">ET Tube가 아직 선택되지 않았습니다. \'ET Tube 계산기\' 탭에서 기록해주세요.</p>';
    }
}

// --- 데이터 저장/불러오기/이미지 저장 기능 ---
const a_input_ids = ['patient_name_main', 'surgery_date', 'weight', 'dog_block_sites', 'lk_cri_rate_mcg', 'dobutamine_dose_select', 'selectedEtTubeSize', 'selectedEtTubeNotes', 'patientName_handout', 'attachDate', 'attachTime', 'antibiotic_selection'];
const a_checkbox_ids = ['status_healthy', 'status_cardiac', 'status_liver', 'status_renal', 'selectedEtTubeCuff'];

function saveRecords() {
    const data = {};
    a_input_ids.forEach(id => { const element = document.getElementById(id); if (element) data[id] = element.value; });
    a_checkbox_ids.forEach(id => { const element = document.getElementById(id); if (element) data[id] = element.checked; });
    data.selectedTubeInfo = selectedTubeInfo;
    data.dischargeMedsV2 = [];
    document.querySelectorAll('#dischargeTab .med-checkbox').forEach(cb => {
        const row = cb.closest('tr');
        data.dischargeMedsV2.push({ drug: row.dataset.drug, checked: cb.checked, days: row.querySelector('.days').value, dose: row.querySelector('.dose')?.value });
    });
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const patientName = document.getElementById('patient_name_main').value || '환자';
    const surgeryDate = document.getElementById('surgery_date').value || new Date().toISOString().split('T');
    a.download = `마취기록_${patientName}_${surgeryDate}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
}

function loadRecords(event) {
    const file = event.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            a_input_ids.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) element.value = data[id]; });
            a_checkbox_ids.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) element.checked = data[id]; });
            if (data.selectedTubeInfo) selectedTubeInfo = data.selectedTubeInfo;
            if(data.dischargeMedsV2) {
                data.dischargeMedsV2.forEach(medData => {
                    const row = document.querySelector(`#dischargeTab tr[data-drug="${medData.drug}"]`);
                    if(row) {
                        row.querySelector('.med-checkbox').checked = medData.checked;
                        row.querySelector('.days').value = medData.days;
                        if(row.querySelector('.dose')) { row.querySelector('.dose').value = medData.dose; }
                    }
                });
            }
            calculateAll();
            calculateRemovalDate();
        } catch (error) { console.error("Failed to parse JSON", error); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function saveDashboardAsImage() {
    const captureElement = document.getElementById('dashboard-capture-area');
    const patientName = document.getElementById('patient_name_main').value || '환자';
    const surgeryDate = document.getElementById('surgery_date').value || new Date().toISOString().split('T');
    const filename = `마취대시보드_${patientName}_${surgeryDate}.png`;
    html2canvas(captureElement, { useCORS: true, scale: 1.5, backgroundColor: '#f0f4f8' }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// --- New Content Population Functions ---
function populateProtocolTab() {
    const container = document.querySelector('#protocolTab .card');
    container.innerHTML = `<header class="border-b-2 border-blue-600 pb-4 mb-8"><h1 class="text-3xl md:text-4xl font-bold text-blue-800">부프레노르핀 패치 임상 프로토콜 (SOP)</h1><p class="text-lg text-gray-600 mt-2">금호동물병원 | 최종 개정일: 2025-07-21</p></header><section class="mb-10"><h2 class="text-2xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">1. 목적 (Purpose)</h2><p class="text-gray-700">본 지침은 고양이 환자에게 중등도 이상의 수술 후 통증 또는 만성 통증 관리를 위해 부프레노르핀 경피 패치를 안전하고 효과적으로 사용하는 표준 절차를 확립하는 것을 목적으로 한다.</p></section><section class="mb-10"><h2 class="text-2xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">2. 적용 대상 및 금기</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="bg-green-50 p-4 rounded-lg border border-green-200"><h3 class="text-lg font-bold text-green-800 mb-2">✅ 적용 대상 (Indications)</h3><ul class="list-disc list-inside space-y-1 text-gray-700 pl-4"><li><strong>주 적용 동물:</strong> 고양이</li><li><strong>수술 후 통증 관리:</strong> 전발치, 정형외과 수술, 개복술 등</li><li><strong>만성 통증 관리:</strong> 퇴행성 관절 질환(DJD), 종양성 통증, 만성 구내염</li><li><strong>만성 신부전(CKD) 환자의 통증 관리</strong></li></ul></div><div class="bg-red-50 p-4 rounded-lg border border-red-200"><h3 class="text-lg font-bold text-red-800 mb-2">❌ 금기 및 주의 (Contraindications & Cautions)</h3><ul class="list-disc list-inside space-y-1 text-gray-700 pl-4"><li><strong>개:</strong> 흡수율의 예측 불가능성</li><li><strong>급성/중증 통증의 단독 치료</strong></li><li>체온 조절 이상(고체온/저체온) 환자</li><li>부착 부위 피부 질환 또는 상처</li><li><strong>심각한 간 기능 부전 환자</strong> (용량 조절 및 집중 모니터링 필요)</li></ul></div></div></section><section class="mb-10"><h2 class="text-2xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">3. 용량 계산 및 선택</h2><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr><th class="p-3 font-bold uppercase text-gray-600 border border-gray-300">체중 (kg)</th><th class="p-3 font-bold uppercase text-gray-600 border border-gray-300">추천 패치 (노스판®)</th></tr></thead><tbody><tr class="hover:bg-gray-50"><td class="p-3 text-gray-800 border border-gray-300">3kg 이하</td><td class="p-3 text-gray-800 border border-gray-300 font-semibold">5 ug/h 패치 적용</td></tr><tr class="hover:bg-gray-50"><td class="p-3 text-gray-800 border border-gray-300">3 ~ 6kg</td><td class="p-3 text-gray-800 border border-gray-300 font-semibold">10 ug/h 패치 적용</td></tr><tr class="hover:bg-gray-50"><td class="p-3 text-gray-800 border border-gray-300">6kg 이상</td><td class="p-3 text-gray-800 border border-gray-300 font-semibold">20 ug/h 패치 적용</td></tr></tbody></table></div><div class="bg-red-600 text-white text-center font-bold p-3 rounded-lg mt-6">🚨 경고: 패치는 절대 자르지 말 것 (NEVER CUT THE PATCH)! 약물 방출 조절막이 파괴되어 과용량(Dose Dumping) 위험이 있습니다.</div></section><section class="mb-10"><h2 class="text-2xl font-bold text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">4. 적용 절차 (Application Procedure)</h2><ol class="list-decimal list-inside space-y-3 text-gray-700 pl-4"><li><strong>타이밍:</strong> 진통 효과가 필요한 시점으로부터 <strong>최소 6~12시간 전</strong>에 부착 (수술 전날 저녁 또는 당일 아침 일찍).</li><li><strong>부위 선정:</strong> 털이 적고 환자가 핥기 어려운 곳 (<strong>측흉부</strong>가 가장 이상적).</li><li><strong>피부 준비:</strong><ul class="list-disc list-inside ml-6 mt-1"><li>#40 클리퍼로 피부 손상 없이 털을 제거.</li><li><strong>오직 물이나 생리식염수</strong>로만 닦아낸 후 완벽히 건조.</li><li class="font-bold text-red-600">알코올, 소독제 사용 절대 금지 (피부 장벽 손상).</li></ul></li><li><strong>부착:</strong> 시술자는 장갑을 착용. 패치 부착 후 손바닥으로 <strong>30~60초간 꾸준히 눌러</strong> 체온으로 밀착.</li><li><strong>기록:</strong> 차트에 부착 날짜, 시간, 부위, 패치 용량을 정확히 기재.</li></ol></section><footer class="text-center mt-10 pt-6 border-t border-gray-300"><p class="text-sm text-gray-500">본 프로토콜은 금호동물병원의 자산입니다.</p></footer>`;
}

function populateEducationTab() {
    const container = document.getElementById('captureArea');
    container.innerHTML = `<header class="text-center mb-10"><h1 class="text-3xl md:text-4xl font-bold text-blue-800">금호동물병원</h1><h2 class="text-xl md:text-2xl font-semibold text-gray-700 mt-3">우리 아이를 위한 통증 관리 패치 안내문</h2></header><div class="border-y border-gray-200 py-5 mb-10 space-y-4"><div class="flex items-center"><label for="patientName_handout" class="font-semibold text-gray-600 mr-3 w-24 text-right">환자 이름:</label><input type="text" id="patientName_handout" placeholder="아이 이름 입력" class="flex-grow p-2 border border-gray-300 rounded-md"></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="flex items-center"><label for="attachDate" class="font-semibold text-gray-600 mr-3 w-24 text-right">부착 날짜:</label><input type="date" id="attachDate" onchange="calculateRemovalDate()" class="flex-grow p-2 border border-gray-300 rounded-md cursor-pointer"></div><div class="flex items-center"><label for="attachTime" class="font-semibold text-gray-600 mr-3 w-24 text-right">부착 시간:</label><input type="time" id="attachTime" onchange="calculateRemovalDate()" class="flex-grow p-2 border border-gray-300 rounded-md cursor-pointer"></div></div><div id="removalInfo" class="mt-4 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg text-center transition-all duration-300"><p class="font-bold text-yellow-900">날짜와 시간을 입력하면 제거일이 계산됩니다.</p></div></div><p class="text-gray-700 text-base md:text-lg mb-10 text-center leading-relaxed">사랑하는 보호자님, 저희 병원을 믿고 소중한 아이를 맡겨주셔서 감사합니다.<br>우리 아이가 수술 후 통증 없이 편안하게 회복할 수 있도록, <strong>'부프레노르핀'이라는 성분의 진통 패치</strong>를 부착했습니다.<br>아래 내용을 잘 읽어보시고, 아이가 잘 회복할 수 있도록 함께 보살펴 주세요.</p><div class="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-md mb-10"><h3 class="text-xl font-bold text-blue-900 mb-2">✅ 이 패치는 어떤 역할을 하나요?</h3><ul class="list-disc list-inside text-gray-700 space-y-1 text-base pl-4"><li>약 3~4일 동안 진통제가 서서히 방출되어, 아이가 통증 없이 편안하게 지낼 수 있도록 돕는 <strong>'지속형 진통 패치'</strong>입니다.</li><li>잦은 주사나 약 복용의 스트레스를 줄여주는 장점이 있습니다.</li></ul></div><div class="mb-10"><h3 class="text-2xl font-bold text-gray-800 text-center mb-4">👀 우리 아이, 이렇게 관찰해주세요!</h3><p class="text-center text-gray-500 mb-6">아이의 행동 변화는 약효가 잘 나타나고 있다는 긍정적인 신호일 수 있습니다. 너무 걱정하지 마세요!</p><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="bg-green-50 rounded-lg p-5 border border-green-200"><h4 class="text-xl font-bold text-green-800 flex items-center mb-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>이런 모습은 괜찮아요</h4><ul class="list-disc list-inside space-y-3 text-gray-700 pl-4"><li><strong>잠이 늘거나 얌전해져요.</strong><br><span class="text-sm text-gray-500">몸이 편안하고 통증이 줄었다는 신호일 수 있습니다.</span></li><li><strong>평소보다 말이 많아지거나, 몸을 많이 비벼요.</strong><br><span class="text-sm text-gray-500">일부 고양이의 정상적인 약물 반응으로 보통 1~2일 내 사라져요.</span></li><li><strong>눈동자가 평소보다 커져 보여요.</strong><br><span class="text-sm text-gray-500">진통제의 일반적인 효과 중 하나입니다.</span></li><li><strong>식욕이 약간 줄어들어요.</strong><br><span class="text-sm text-gray-500">일시적일 수 있으니, 물을 잘 마시는지 확인해주세요.</span></li></ul></div><div class="bg-red-50 rounded-lg p-5 border border-red-200"><h4 class="text-xl font-bold text-red-800 flex items-center mb-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>이런 모습은 바로 연락주세요</h4><ul class="list-disc list-inside space-y-3 text-gray-700 pl-4"><li><strong>숨을 헐떡이거나 힘겹게 쉬어요.</strong><br><span class="text-sm text-gray-500">호흡이 분당 40회 이상으로 지속될 때</span></li><li><strong>몸을 전혀 움직이지 못하고 축 늘어져요.</strong><br><span class="text-sm text-gray-500">이름을 불러도 반응이 거의 없을 때</span></li><li><strong>구토나 설사를 3회 이상 반복해요.</strong><br><span class="text-sm text-gray-500">탈수나 다른 문제의 신호일 수 있습니다.</span></li><li><strong>패치가 떨어졌거나, 아이가 핥거나 씹고 있어요.</strong><br><span class="text-sm text-gray-500">과용량 위험이 있으니 즉시 연락주세요.</span></li></ul></div></div></div><div class="bg-yellow-50 border-l-4 border-yellow-500 p-5 rounded-md mb-10"><h3 class="text-xl font-bold text-yellow-900 mb-3">🔥 보호자님, 이것만은 꼭! 지켜주세요</h3><ol class="list-decimal list-inside text-gray-700 space-y-3 pl-4"><li><strong>가장 중요! 열 주의 🔥</strong><br><strong>전기장판, 핫팩, 온열 램프, 드라이기 등</strong> 패치 부위에 열이 가해지지 않도록 <strong>절대적으로</strong> 주의해주세요. 약물이 과다 흡수되어 위험할 수 있습니다.</li><li><strong>패치 보호</strong><br>아이가 패치를 핥거나, 긁거나, 떼어내지 않도록 지켜봐 주세요. 필요 시 넥카라나 환자복을 착용시켜 주세요.</li><li><strong>안전한 환경</strong><br>다른 반려동물이나 어린이가 패치를 만지거나 핥지 않도록 주의해주세요.</li><li><strong>안전한 폐기</strong><br>패치를 제거할 때는 접착면끼리 마주 보게 반으로 접어, 아이의 손이 닿지 않는 곳에 안전하게 버려주세요.</li></ol></div><footer class="border-t border-gray-200 pt-8 text-center"><h3 class="text-xl font-semibold text-gray-800">궁금하거나 걱정되는 점이 있다면?</h3><p class="text-gray-600 mt-2">사소한 걱정이라도 괜찮으니, 주저 말고 아래 연락처로 문의해 주세요.</p><div class="mt-4 bg-gray-50 rounded-lg p-4 inline-block"><p class="font-bold text-lg text-blue-800">금호동물병원</p><p class="text-gray-700 mt-1">📞 <a href="tel:062-383-7572" class="hover:underline">062-383-7572</a></p><div class="text-sm text-gray-500 mt-2"><p>평일: 오전 9시 30분 ~ 오후 6시</p><p>토요일: 오전 9시 30분 ~ 오후 3시</p><p>일요일: 휴무</p></div><a href="https://pf.kakao.com/_jiICK/chat" target="_blank" class="mt-4 inline-block w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.582 0 0 3.582 0 7.994c0 2.446 1.065 4.635 2.803 6.147L.775 16l2.16-2.053a7.95 7.95 0 0 0 5.059 1.85c4.412 0 7.994-3.582 7.994-7.994a7.85 7.85 0 0 0-2.387-5.614z"/></svg>카카오톡 문의</a></div><p class="text-xs text-gray-400 mt-8">저희는 항상 아이가 편안하게 회복할 수 있도록 곁에서 최선을 다하겠습니다.</p></footer>`;
    document.getElementById('patientName_handout').addEventListener('input', () => {
        document.getElementById('patient_name_main').value = document.getElementById('patientName_handout').value;
    });
}

// --- DOM 로드 후 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    populateProtocolTab();
    populateEducationTab();

    initializeDischargeTabV2(); 
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

    // Event Listeners
    document.getElementById('save-record-btn').addEventListener('click', saveRecords);
    document.getElementById('load-record-input').addEventListener('change', loadRecords);
    document.getElementById('save-image-btn').addEventListener('click', saveDashboardAsImage);
    document.getElementById('calculate-weight-btn').addEventListener('click', calculateWeightSize);
    document.getElementById('calculate-trachea-btn').addEventListener('click', calculateTracheaSize);
    document.getElementById('trachea-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateTracheaSize(); });
    document.getElementById('saveEtTubeSelection').addEventListener('click', saveAndDisplayTubeSelection);
});
