document.addEventListener('DOMContentLoaded', () => {
    // --- 전역 변수 및 상수 ---
    const concentrations = { lidocaine: 20, ketamine: 50, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, clavamox_iv: 100, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, };
    let selectedTubeInfo = { size: null, cuff: false, notes: '' };
    let patientData = {
        visitDate: '',
        weight: 0,
        patientName: '',
        conditions: {
            cardiac: false,
            liver: false,
            kidney: false,
        }
    };

    // --- 탭 관리 함수 ---
    window.openTab = function(evt, tabName) {
        let i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
        tablinks = document.getElementsByClassName("tab-button");
        for (i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
        // 퇴원약 탭이 열릴 때 계산을 다시 실행하여 UI를 업데이트합니다.
        if (tabName === 'dischargeTab') {
            calculateDischargeTab();
        }
    }
    
    // --- 메인 계산 및 데이터 업데이트 함수 ---
    function updatePatientData() {
        patientData.weight = parseFloat(document.getElementById('weight').value) || 0;
        patientData.visitDate = document.getElementById('visitDate').value;
        patientData.patientName = document.getElementById('patientName').value;
        document.querySelectorAll('.condition-checkbox').forEach(checkbox => {
            patientData.conditions[checkbox.dataset.condition] = checkbox.checked;
        });

        // 간 질환 시 퇴원약 자동 선택 로직
        if (patientData.conditions.liver) {
            const liverMeds = ['udca', 'silymarin', 'same'];
            liverMeds.forEach(drugName => {
                const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`);
                if (row) {
                    row.querySelector('.med-checkbox').checked = true;
                    row.querySelector('.days').value = 7;
                }
            });
        }
    }

    function calculateAll() {
        updatePatientData();
        updateTubeDisplay(); 

        if (patientData.weight <= 0) {
            document.getElementById('weight-input-et').value = '';
            calculateWeightSize(); // 결과 숨기기
            return;
        }
        
        document.getElementById('weight-input-et').value = patientData.weight;
        calculateWeightSize();
        
        populatePrepTab();
        populateEmergencyTab();
        calculateDischargeTab(); // 퇴원약 탭 계산
        // 환자 정보 디스플레이 업데이트
        document.getElementById('discharge_patient_info_display').textContent = `체중: ${patientData.weight}kg, 상태: ${Object.keys(patientData.conditions).filter(k => patientData.conditions[k]).join(', ') || '정상'}`;
    }

    // --- 탭별 내용 채우기 ---
    function populatePrepTab() {
        const { weight, conditions } = patientData;
        const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
        const butorMl = (0.2 * weight) / concentrations.butorphanol;
        const midaMl = (0.2 * weight) / concentrations.midazolam;
        const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
        const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
        
        // 유도제 계산
        const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
        const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
        const propofolMlMin = (2 * weight) / concentrations.propofol;
        const propofolMlMax = (6 * weight) / concentrations.propofol;
        
        const fluidRate = conditions.cardiac ? 2 : 5;
        const pumpCorrectionFactor = 0.7;
        const fluidTarget = fluidRate * weight;
        const fluidCorrected = fluidTarget / pumpCorrectionFactor;

        // 노스판 패치 추천 로직
        let patchRecommendation = "";
        if (weight <= 3.0) { patchRecommendation = "5 mcg/h 1매"; } 
        else if (weight > 3.0 && weight <= 6.0) { patchRecommendation = "10 mcg/h 1매"; } 
        else { patchRecommendation = "20 mcg/h 1매"; }

        const alfaxanCard = `<div id="alfaxan_card" class="p-3 bg-indigo-50 rounded-lg ${conditions.cardiac ? 'highlight-recommend' : ''}"><h4 class="font-bold text-indigo-800">알팍산 ${conditions.cardiac ? '(추천)' : ''}</h4><p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span></p></div>`;
        const propofolCard = `<div class="p-3 bg-purple-50 rounded-lg"><h4 class="font-bold text-purple-800">프로포폴</h4><p><span class="result-value">${propofolMlMin.toFixed(2)}~${propofolMlMax.toFixed(2)} mL</span></p><p class="text-xs text-gray-500 mt-1">2-6 mg/kg</p></div>`;

        document.getElementById('pre_op_drugs_result').innerHTML = `
            <div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold text-teal-800">예방적 항생제</h4><p><span class="result-value">${clavaIvMl.toFixed(2)} mL</span> (클라바목스)</p></div>
            <div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold text-blue-800">마취 전 투약</h4><p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p></div>
            <div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold text-amber-800">LK 부하 용량</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p><p class="text-xs text-gray-600 font-semibold mt-1">※ 희석: 케타민(50주) 0.2mL + N/S 0.8mL</p></div>
            <div class="col-span-full grid grid-cols-2 gap-4"> ${alfaxanCard} ${propofolCard} </div>
            <div class="p-3 bg-cyan-50 rounded-lg"><h4 class="font-bold text-cyan-800">수액 펌프</h4><p><span class="result-value">${fluidCorrected.toFixed(1)} mL/hr</span></p><p class="text-xs text-gray-500 mt-1">(목표: ${fluidTarget.toFixed(1)}mL/hr)</p></div>
            <div class="p-3 bg-rose-50 rounded-lg"><h4 class="font-bold text-rose-800">노스판 패치</h4><p><span class="result-value">${patchRecommendation}</span></p></div>
        `;
        
        const sites = parseInt(document.getElementById('dog_block_sites')?.value) || 4;
        document.getElementById('dog_nerve_block_result').innerHTML = `<div class="space-y-2"><label for="dog_block_sites" class="font-semibold text-gray-700">마취 부위 수:</label><select id="dog_block_sites" class="large-interactive-field" onchange="calculateAll()"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select></div><div class="p-3 border rounded-lg bg-gray-50 mt-4 text-center"><h4 class="font-semibold text-gray-800">총 준비 용량 (${sites}군데)</h4><p class="text-lg"><span class="result-value">${((0.1 * weight * sites)*0.8).toFixed(2)}mL</span> (부피) + <span class="result-value">${((0.1 * weight * sites)*0.2).toFixed(2)}mL</span> (리도)</p><p class="text-xs text-gray-500 mt-1">부위당 약 ${((0.1 * weight * sites) / sites).toFixed(2)} mL 주입</p></div>`;
        document.getElementById('dog_block_sites').value = sites;

        const lidoRateMcg = parseInt(document.getElementById('lk_cri_rate_mcg')?.value) || 25;
        const pumpRate = (lidoRateMcg * weight * 60) / 2000;
        document.getElementById('lk_cri_calc_result').innerHTML = `<div class="p-4 border rounded-lg bg-gray-50 space-y-2"><h4 class="font-semibold text-gray-800">CRI 펌프 속도 설정</h4><p class="text-xs text-gray-600">희석: 리도카인 3mL + 케타민(50주) 0.24mL + N/S 26.76mL</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="lk_cri_rate_mcg" class="large-interactive-field" onchange="calculateAll()"><option value="25">25</option><option value="30">30</option><option value="50">50</option></select></div><div class="mt-2 text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
        document.getElementById('lk_cri_rate_mcg').value = lidoRateMcg;
        
        document.getElementById('workflow_steps').innerHTML = `<div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 1: 내원 및 준비</h3><p class="text-sm text-gray-700">보호자 동의서 작성. 환자는 즉시 IV 카테터 장착 후, 준비된 클라바목스 IV를 투여하고 수액 처치를 시작합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 2: 수액처치 & 산소 공급 (최소 10분)</h3><p class="text-sm text-gray-700">'약물 준비' 섹션에 계산된 수액 펌프 속도로 수액을 맞추고, 수술 준비 동안 입원장 안에서 산소를 공급합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 3: 마취 전 투약 및 산소 공급 (3분)</h3><p class="text-sm text-gray-700">마스크로 100% 산소를 공급하면서, 준비된 부토르파놀 + 미다졸람을 3분에 걸쳐 천천히 IV로 주사합니다.</p></div><div class="warning-card p-4"><h3 class="font-bold text-lg text-amber-800">Step 4: LK-CRI 부하 용량 (Loading Dose)</h3><p class="text-sm text-gray-700">마취 유도 직전, 준비된 리도카인과 케타민을 2분에 걸쳐 매우 천천히 IV로 주사합니다. 이는 통증 증폭을 막는 핵심 단계입니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 5: 마취 유도 (Induction)</h3><p class="text-sm text-gray-700">준비된 알팍산 또는 다른 유도제를 효과를 봐가며 천천히 주사하여 기관 삽관합니다.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg text-blue-800">Step 6: 마취 유지 (Maintenance)</h3><p class="text-sm text-gray-700">삽관 후 즉시 이소플루란 마취를 시작하고, 동시에 LK-CRI 펌프를 작동시키며 수액 펌프 속도를 '마취 중' 권장 설정값으로 변경합니다.</p></div>`;
    }

    function populateEmergencyTab() {
        const { weight } = patientData;
        const dobutamineDose = parseFloat(document.getElementById('dobutamine_dose_select')?.value) || 5;
        const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * 12.5 / 30));
        document.getElementById('hypotension_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800">저혈압 (MAP < 60)</h4><ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">호흡 마취제 농도 감소:</span> 가장 빠르고 중요한 첫 단계.</li><li><span class="font-bold">환자 상태 확인:</span> 심장병 유무에 따라 대처가 달라짐.<ul class="list-disc list-inside ml-4 text-xs"><li><span class="font-semibold">건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg over 10-15min)</li><li><span class="font-semibold text-red-600">심장 질환 환자:</span> 수액 볼루스 금기! 승압제 우선.</li></ul></li></ol><div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2"><h5 class="font-semibold text-center text-sm">도부타민 CRI (심장 수축력 강화)</h5><p class="text-xs text-center mb-1">희석: 원액 0.5mL + N/S 29.5mL (권장: 2-10 mcg/kg/min)</p><div><label class="text-sm font-semibold">목표 (mcg/kg/min):</label><select id="dobutamine_dose_select" class="large-interactive-field" oninput="calculateAll()"><option value="2">2</option><option value="5" selected>5</option><option value="10">10</option></select></div><p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div>`;
        if(document.getElementById('dobutamine_dose_select')) document.getElementById('dobutamine_dose_select').value = dobutamineDose;
        
        const atropineLowMl = (0.02 * weight) / concentrations.atropine;
        const atropineHighMl = (0.04 * weight) / concentrations.atropine;
        document.getElementById('bradycardia_protocol').innerHTML = `<h4 class="font-bold text-lg text-red-800 mt-4">서맥 (Bradycardia)</h4><p class="text-xs text-gray-600">저혈압 동반 시, 심박수 < 60-80 bpm 일 때 고려</p><div class="mt-2 p-3 rounded-lg bg-red-100 text-center"><h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p></div>`;
        
        const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
        const epiHighMl = (0.1 * weight) / concentrations.epinephrine;
        const atropineCpaMl = (0.04 * weight) / concentrations.atropine;
        document.getElementById('cpa_protocol').innerHTML = `<ol class="list-decimal list-inside mt-2 space-y-2 text-sm"><li><span class="font-bold">BLS (기본소생술):</span> 즉시 100-120회/분 흉부압박, 6초에 1회 환기 시작.</li><li><span class="font-bold">ALS (전문소생술):</span> 2분마다 흉부압박 교대하며 아래 약물 투여.</li></ol><div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center"><h5 class="font-semibold text-sm">에피네프린 (Low dose, 1차)</h5><p class="text-xs mb-1 font-semibold">희석법: 에피네프린 원액 0.1mL + N/S 0.9mL (총 1mL)</p><p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr><h5 class="font-semibold text-sm">아트로핀 (Asystole/PEA 시)</h5><p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL (${(atropineCpaMl*0.5).toFixed(2)} mg) IV</p><hr><h5 class="font-semibold text-sm">에피네프린 (High dose, 반응 없을 시)</h5><p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p></div>`;
    }

    // --- 퇴원약 탭 계산 함수 ---
    function calculateDischargeTab() {
        const { weight, conditions } = patientData;
        if (isNaN(weight) || weight <= 0) return;

        const summaryData = {};
        const dischargeTab = document.getElementById('dischargeTab');

        dischargeTab.querySelectorAll('.med-checkbox:checked').forEach(checkbox => {
            const row = checkbox.closest('tr');
            const drugName = row.querySelector('td:nth-child(2)').textContent;
            const days = parseInt(row.querySelector('.days').value);
            const unit = row.dataset.unit;
            let totalAmount = 0;
            let totalAmountText = '';
            let dailyMultiplier = 2; 

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
                 totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else {
                const dose = parseFloat(row.querySelector('.dose').value);
                const strength = parseFloat(row.dataset.strength);
                if (['udca', 'silymarin', 'itraconazole'].includes(row.dataset.drug)) { dailyMultiplier = 2; }
                totalAmount = (weight * dose * dailyMultiplier * days) / strength;
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            }
             
            row.querySelector('.total-amount').textContent = totalAmountText;

            if (!summaryData[days]) summaryData[days] = [];
            
            let summaryText = `${drugName.split(' (')[0]} ${totalAmountText}`;
            if (dailyMultiplier === 1) summaryText += ' (1일 1회)';
            
            const isLiverDanger = row.querySelector('.notes').dataset.liver === 'true' && conditions.liver;
            const isKidneyDanger = row.querySelector('.notes').dataset.kidney === 'true' && conditions.kidney;

            summaryData[days].push({ text: summaryText, isDanger: isLiverDanger || isKidneyDanger });
        });

        updateDischargeSummaryUI(summaryData);
        updateDischargeWarnings();
    }
    
    function updateDischargeSummaryUI(summaryData) {
        const summaryContainer = document.getElementById('summary');
        summaryContainer.innerHTML = '';
        const sortedDays = Object.keys(summaryData).sort((a, b) => a - b);
        if (sortedDays.length === 0) {
            summaryContainer.innerHTML = '<p>조제할 약물을 선택해주세요.</p>';
            return;
        }
        sortedDays.forEach(day => {
            const box = document.createElement('div');
            box.className = 'summary-box';
            const title = document.createElement('h3');
            title.textContent = `${day}일 처방`;
            box.appendChild(title);
            summaryData[day].forEach(item => {
                const p = document.createElement('p');
                p.className = 'summary-item';
                p.innerHTML = item.isDanger ? `<span class="danger">${item.text}</span>` : item.text;
                box.appendChild(p);
            });
            summaryContainer.appendChild(box);
        });
    }

    function updateDischargeWarnings() {
        const { conditions } = patientData;
        document.querySelectorAll('#dischargeTab .notes').forEach(noteCell => {
            noteCell.classList.remove('highlight-warning');
            if ((conditions.liver && noteCell.dataset.liver === 'true') || (conditions.kidney && noteCell.dataset.kidney === 'true')) {
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
        const removalDateStart = new Date(attachDateTime.getTime() + 72 * 3600 * 1000);
        const removalDateEnd = new Date(attachDateTime.getTime() + 96 * 3600 * 1000);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
        removalInfoDiv.innerHTML = `<h4 class="text-lg font-bold text-gray-800 mb-2">🗓️ 패치 제거 권장 기간</h4><p class="text-base text-gray-700"><strong class="text-blue-600">${new Intl.DateTimeFormat('ko-KR', options).format(removalDateStart)}</strong> 부터<br><strong class="text-blue-600">${new Intl.DateTimeFormat('ko-KR', options).format(removalDateEnd)}</strong> 사이에<br>패치를 제거해주세요.</p>`;
    }

    window.saveAsPDF = function() { window.print(); }
    window.saveAsImage = function() {
        const captureElement = document.getElementById('captureArea');
        const patientName = document.getElementById('patientName').value || '환자';
        html2canvas(captureElement, { useCORS: true, scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${patientName}_통증패치_안내문.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }
    
    window.exportPrepSheetAsImage = function() {
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
        const weightInput = document.getElementById('weight-input-et');
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
        if (!sizeInput.value) { alert('최종 ET Tube 사이즈를 입력해주세요.'); sizeInput.focus(); return; }
        selectedTubeInfo.size = parseFloat(sizeInput.value);
        selectedTubeInfo.cuff = document.getElementById('selectedEtTubeCuff').checked;
        selectedTubeInfo.notes = document.getElementById('selectedEtTubeNotes').value;
        const saveButton = document.getElementById('saveEtTubeSelection');
        saveButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>저장 완료!';
        saveButton.classList.replace('bg-blue-600', 'bg-green-600');
        setTimeout(() => { saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>기록 저장'; saveButton.classList.replace('bg-green-600', 'bg-blue-600'); }, 2000);
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

    // --- 기록 저장/불러오기 ---
    function saveRecord() {
        const dataToSave = {
            patientData: patientData,
            selectedTubeInfo: selectedTubeInfo,
            dischargeSelections: {}
        };
        document.querySelectorAll('#dischargeTab .med-checkbox').forEach(cb => {
            const drug = cb.closest('tr').dataset.drug;
            const days = cb.closest('tr').querySelector('.days').value;
            const dose = cb.closest('tr').querySelector('.dose')?.value;
            dataToSave.dischargeSelections[drug] = { checked: cb.checked, days: days, dose: dose };
        });
        localStorage.setItem('anesRecordV4', JSON.stringify(dataToSave));
        alert('현재 정보가 브라우저에 저장되었습니다.');
    }

    function loadRecord() {
        const savedData = localStorage.getItem('anesRecordV4');
        if (savedData) {
            const data = JSON.parse(savedData);
            patientData = data.patientData;
            selectedTubeInfo = data.selectedTubeInfo;

            document.getElementById('weight').value = patientData.weight;
            document.getElementById('visitDate').value = patientData.visitDate;
            document.getElementById('patientName').value = patientData.patientName;
            document.querySelectorAll('.condition-checkbox').forEach(cb => {
                cb.checked = patientData.conditions[cb.dataset.condition];
            });

            if (data.dischargeSelections) {
                Object.keys(data.dischargeSelections).forEach(drug => {
                    const row = document.querySelector(`#dischargeTab tr[data-drug="${drug}"]`);
                    if (row) {
                        const sel = data.dischargeSelections[drug];
                        row.querySelector('.med-checkbox').checked = sel.checked;
                        row.querySelector('.days').value = sel.days;
                        if(row.querySelector('.dose') && sel.dose) {
                           row.querySelector('.dose').value = sel.dose;
                        }
                    }
                });
            }

            alert('저장된 정보를 불러왔습니다.');
            calculateAll();
        } else {
            alert('저장된 정보가 없습니다.');
        }
    }
    
    // --- 이벤트 리스너 초기화 ---
    function initializeEventListeners() {
        // 메인 입력 필드
        document.querySelectorAll('#weight, #visitDate, .condition-checkbox, #patientName').forEach(el => el.addEventListener('input', calculateAll));
        
        // 탭 내부 상호작용 필드
        document.querySelectorAll('#dog_block_sites, #lk_cri_rate_mcg, #dobutamine_dose_select').forEach(el => el.addEventListener('input', calculateAll));

        // 퇴원약 탭
        const dischargeTab = document.getElementById('dischargeTab');
        dischargeTab.addEventListener('input', (e) => {
            if (e.target.matches('.med-checkbox, .days, .dose')) {
                calculateDischargeTab();
            }
        });

        // ET Tube 탭
        document.getElementById('calculate-weight-btn').addEventListener('click', calculateWeightSize);
        document.getElementById('weight-input-et').addEventListener('input', calculateWeightSize);
        document.getElementById('calculate-trachea-btn').addEventListener('click', calculateTracheaSize);
        document.getElementById('trachea-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') calculateTracheaSize(); });
        document.getElementById('saveEtTubeSelection').addEventListener('click', saveAndDisplayTubeSelection);

        // 상단 기능 버튼
        document.getElementById('saveRecordBtn').addEventListener('click', saveRecord);
        document.getElementById('loadRecordBtn').addEventListener('click', loadRecord);
        document.getElementById('saveImageBtn').addEventListener('click', () => {
             html2canvas(document.getElementById('dashboard-area')).then(canvas => {
                const link = document.createElement('a');
                const patientName = document.getElementById('patientName').value || '환자';
                link.download = `${patientName}_마취대시보드.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });

        // 보호자 교육 탭
        const eduTab = document.getElementById('educationTab');
        eduTab.addEventListener('input', (e) => {
            if (e.target.matches('#attachDate, #attachTime')) {
                calculateRemovalDate();
            }
        });
        document.getElementById('patientName').addEventListener('input', function() {
            document.getElementById('patientName').value = this.value; // 교육 탭 환자이름 동기화
        });
        
        // 퇴원약 기본 선택
        const defaultMeds = ['clindamycin', 'gabapentin', 'famotidine', 'almagel', 'vetrocam', 'misoprostol', 'acetaminophen'];
        defaultMeds.forEach(drugName => {
            const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`);
            if (row) row.querySelector('.med-checkbox').checked = true;
        });

    }

    // --- 페이지 로드 후 실행 ---
    initializeEventListeners();
    document.getElementById('visitDate').valueAsDate = new Date(); // 오늘 날짜 기본 설정
    calculateAll(); // 초기 계산 실행
    
    // 교육탭 날짜/시간 기본값
    const attachDateEl = document.getElementById('attachDate');
    if (attachDateEl) {
        const now = new Date();
        document.getElementById('attachDate').value = now.toISOString().substring(0, 10);
        document.getElementById('attachTime').value = now.toTimeString().substring(0, 5);
        calculateRemovalDate();
    }
});
