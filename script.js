document.addEventListener('DOMContentLoaded', function () {
    
    // --- 글로벌 상수 및 변수 ---
    const concentrations = { lidocaine: 20, ketamine: 100, ketamine_diluted: 10, bupivacaine: 5, butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10, clavamox_iv: 100, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1, };
    const pillStrengths = { gabapentin: 100, acetaminophen: 160, amoxicillin_capsule: 250, famotidine: 10, };
    let selectedTubeInfo = { size: null, cuff: false, notes: '' };

    // --- DOM 요소 캐싱 ---
    const weightInput = document.getElementById('weight');
    const globalNameInput = document.getElementById('globalPetName');
    
    // --- 탭 관리 ---
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            contents.forEach(item => item.classList.remove('active'));
            
            tab.classList.add('active');
            const activeTabContent = document.getElementById(tab.dataset.tab);
            if(activeTabContent) {
                activeTabContent.classList.add('active');
            }
        });
    });

    // --- 메인 이벤트 리스너 ---
    weightInput.addEventListener('input', calculateAll);
    globalNameInput.addEventListener('input', updateAllTitles);

    // --- 이름 종성 확인 함수 ---
    function hasFinalConsonant(name) {
        if (!name) return false;
        const lastChar = name.charCodeAt(name.length - 1);
        if (lastChar >= 0xAC00 && lastChar <= 0xD7A3) {
            return (lastChar - 0xAC00) % 28 !== 0;
        }
        return false;
    }
    
    // --- 모든 제목 업데이트 ---
    function updateAllTitles() {
        const name = globalNameInput.value.trim();
        const hasJongseong = hasFinalConsonant(name);

        const titles = {
            stomatitis: document.getElementById('stomatitisTitle'),
            cyclosporine: document.getElementById('cyclosporineTitle'),
            norspan: document.getElementById('norspanTitle'),
            gabapentin: document.getElementById('gabapentinTitle'),
        };

        if (name) {
            if (titles.stomatitis) titles.stomatitis.innerHTML = `우리 ${name}${hasJongseong ? "이를" : "를"} 위한<br>만성 구내염 및 전발치 안내서`;
            if (titles.cyclosporine) titles.cyclosporine.innerHTML = `✨ ${name}${hasJongseong ? '이의' : '의'} 사이클로스포린 복약 안내문 ✨`;
            if (titles.norspan) titles.norspan.innerText = `${name}${hasJongseong ? '이를' : '를'} 위한 통증 관리 패치 안내문`;
            if (titles.gabapentin) titles.gabapentin.innerHTML = `<span>${name}</span><span>${hasJongseong ? '을' : '를'}</span> 위한 편안한 진료 준비 안내서`;
        } else {
            if (titles.stomatitis) titles.stomatitis.innerHTML = `우리 아이를 위한<br>만성 구내염 및 전발치 안내서`;
            if (titles.cyclosporine) titles.cyclosporine.innerHTML = '✨ 사이클로스포린 복약 안내문 ✨';
            if (titles.norspan) titles.norspan.innerText = '우리 아이를 위한 통증 관리 패치 안내문';
            if (titles.gabapentin) titles.gabapentin.innerHTML = `<span>우리 아이</span><span>를</span> 위한 편안한 진료 준비 안내서`;
        }
    }

    // --- 메인 계산 함수 ---
    function calculateAll() {
        updateTubeDisplay();
        const weightValue = weightInput.value;

        if (!weightValue) {
            document.getElementById('patch_recommendation').innerHTML = '';
            const weightInputTube = document.getElementById('weight-input');
            if (weightInputTube) {
                weightInputTube.value = '';
                calculateWeightSize();
            }
            return;
        }
        
        const weight = parseFloat(weightValue);
        if (isNaN(weight) || weight <= 0) {
            document.getElementById('patch_recommendation').innerHTML = '';
            return;
        }

        const weightInputTube = document.getElementById('weight-input');
        if (weightInputTube) {
            weightInputTube.value = weight;
            calculateWeightSize();
        }
        
        const cycloWeightInput = document.getElementById('cycloPetWeight');
        if(cycloWeightInput) {
            cycloWeightInput.value = weight;
            calculateCycloDose();
        }

        populatePrepTab(weight);
        populateEmergencyTab(weight);
        populateDischargeTab(weight);
        updatePatchRecommendation(weight);
    }
    
    function updatePatchRecommendation(weight) {
        const recommendationDiv = document.getElementById('patch_recommendation');
        if (!recommendationDiv) return;
        let patchType = '', patchColor = 'gray';
        if (weight > 0 && weight <= 3) { patchType = '5 mcg/h'; patchColor = 'blue'; } 
        else if (weight > 3 && weight <= 6) { patchType = '10 mcg/h'; patchColor = 'green'; } 
        else if (weight > 6) { patchType = '20 mcg/h'; patchColor = 'red'; } 
        else { recommendationDiv.innerHTML = ''; return; }
        recommendationDiv.innerHTML = `<div class="p-4 rounded-lg bg-${patchColor}-100 border-l-4 border-${patchColor}-500"><h3 class="text-xl font-bold text-${patchColor}-800">환자 맞춤 패치 추천</h3><p class="mt-2"><strong>${weight}kg</strong> 환자에게는 <strong>${patchType} 노스판 패치</strong> 적용을 권장합니다.</p></div>`;
    }

    function populatePrepTab(weight) {
        const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
        const butorMl = (0.2 * weight) / concentrations.butorphanol;
        const midaMl = (0.2 * weight) / concentrations.midazolam;
        const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
        const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
        const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
        const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
        const fluidTarget = 5 * weight;
        const fluidCorrected = fluidTarget / 0.7;
        document.getElementById('pre_op_drugs_result').innerHTML = `<div class="p-3 bg-teal-50 rounded-lg"><h4 class="font-bold">항생제</h4><p><span class="result-value">${clavaIvMl.toFixed(2)} mL</span></p></div><div class="p-3 bg-blue-50 rounded-lg"><h4 class="font-bold">전투약</h4><p><span class="result-value">${butorMl.toFixed(2)}mL</span>(부토)+<span class="result-value">${midaMl.toFixed(2)}mL</span>(미다)</p></div><div class="p-3 bg-amber-50 rounded-lg"><h4 class="font-bold">LK 부하</h4><p><span class="result-value">${lidoLoadMl.toFixed(2)}mL</span>(리도)+<span class="result-value">${ketaLoadMl_diluted.toFixed(2)}mL</span>(케타민)</p></div><div class="p-3 bg-indigo-50 rounded-lg"><h4 class="font-bold">유도제</h4><p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)}mL</span></p></div><div class="p-3 bg-cyan-50 rounded-lg"><h4 class="font-bold">수액</h4><p><span class="result-value">${fluidCorrected.toFixed(1)}mL/hr</span></p></div>`;
        
        const sites = document.getElementById('dog_block_sites')?.value || 4;
        const nerveBlockVol = (0.1 * weight * sites);
        document.getElementById('dog_nerve_block_result').innerHTML = `<div class="space-y-2"><label class="font-semibold">마취 부위 수:</label><select id="dog_block_sites" class="large-interactive-field"><option value="4">4</option><option value="2">2</option></select></div><div class="p-3 mt-4 text-center"><h4 class="font-semibold">총 준비 용량 (${sites}군데)</h4><p><span class="result-value">${(nerveBlockVol*0.8).toFixed(2)}mL</span>(부피)+<span class="result-value">${(nerveBlockVol*0.2).toFixed(2)}mL</span>(리도)</p></div>`;
        document.getElementById('dog_block_sites').value = sites;
        
        const lidoRateMcg = document.getElementById('lk_cri_rate_mcg')?.value || 25;
        const pumpRate = (lidoRateMcg * weight * 60) / 2000;
        document.getElementById('lk_cri_calc_result').innerHTML = `<div class="p-4 space-y-2"><label class="font-semibold">목표(mcg/kg/min):</label><select id="lk_cri_rate_mcg" class="large-interactive-field"><option value="25">25</option><option value="50">50</option></select><div class="text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
        document.getElementById('lk_cri_rate_mcg').value = lidoRateMcg;
        
        document.getElementById('workflow_steps').innerHTML = `<div class="step-card p-4"><h3 class="font-bold text-lg">Step 1: 준비</h3><p>IV 장착, 항생제 투여, 수액 처치 시작.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg">Step 2: 전투약 (3분)</h3><p>산소 공급하며 부토르파놀+미다졸람 IV.</p></div><div class="warning-card p-4"><h3 class="font-bold text-lg">Step 3: LK-CRI 부하 (2분)</h3><p>리도카인+케타민을 매우 천천히 IV.</p></div><div class="step-card p-4"><h3 class="font-bold text-lg">Step 4: 유도 및 유지</h3><p>유도제 주사 후 삽관, 호흡마취 및 LK-CRI 펌프 시작.</p></div>`;
    }

    function populateEmergencyTab(weight) {
        const dobutamineDose = document.getElementById('dobutamine_dose_select')?.value || 5;
        const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * 12.5 / 30));
        document.getElementById('hypotension_protocol').innerHTML = `<h4 class="font-bold">저혈압 (MAP < 60)</h4><div class="mt-2 p-3 rounded-lg bg-red-100"><h5 class="font-semibold">도부타민 CRI</h5><select id="dobutamine_dose_select" class="large-interactive-field"><option value="5">5</option><option value="10">10</option></select><p class="font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p></div>`;
        document.getElementById('dobutamine_dose_select').value = dobutamineDose;
        
        const atropineLowMl = (0.02 * weight) / concentrations.atropine;
        const atropineHighMl = (0.04 * weight) / concentrations.atropine;
        document.getElementById('bradycardia_protocol').innerHTML = `<h4 class="font-bold mt-4">서맥</h4><div class="p-3 bg-red-100 text-center"><h5 class="font-semibold">아트로핀</h5><p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)}~${atropineHighMl.toFixed(2)}mL IV</p></div>`;

        const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
        document.getElementById('cpa_protocol').innerHTML = `<h4 class="font-bold">심정지 (CPA)</h4><div class="p-2 bg-red-100 text-center"><h5 class="font-semibold">에피네프린 (Low dose)</h5><p class="font-bold text-red-700">${epiLowMl.toFixed(2)}mL (희석액) IV</p></div>`;
    }
    
    function populateDischargeTab(weight) {
        const generalDays = document.getElementById('prescription_days').value || 0;
        const getPillCount = (mgPerDose, frequency, pillStrength, days) => {
            if (days <= 0) return "일수 입력";
            const pillsPerDose = mgPerDose / pillStrength;
            const totalPills = Math.ceil(pillsPerDose * frequency * days * 2) / 2;
            return `<strong>${totalPills.toFixed(1).replace('.0','')}정</strong> | 1회 ${pillsPerDose.toFixed(2)}정`;
        };
        document.getElementById('discharge_gold').innerHTML = `<h3 class="font-bold">골드 스탠다드</h3><div class="p-4 bg-green-50 rounded-lg space-y-2"><p><strong>가바펜틴:</strong> ${getPillCount(5*weight, 2, pillStrengths.gabapentin, generalDays)}</p><p><strong>아목시실린:</strong> ${getPillCount(12.5*weight, 2, pillStrengths.amoxicillin_capsule, generalDays)}</p></div>`;
        document.getElementById('discharge_alt').innerHTML = `<h3 class="font-bold mt-6">NSAID-Sparing</h3><div class="p-4 bg-orange-50 rounded-lg space-y-2"><p><strong>가바펜틴:</strong> ${getPillCount(10*weight, 2, pillStrengths.gabapentin, generalDays)}</p><p><strong>아세트아미노펜:</strong> ${getPillCount(15*weight, 2, pillStrengths.acetaminophen, generalDays)}</p></div>`;
    }

    const weightSizeGuide = [ { weight: 1, size: '3.0' }, { weight: 2, size: '3.5' }, { weight: 3.5, size: '4.0' }, { weight: 4, size: '4.5' }, { weight: 6, size: '5.5' }, { weight: 8, size: '6.0' }, { weight: 9, size: '7.0' }, { weight: 12, size: '7.0' }, { weight: 14, size: '7.5' }, { weight: 20, size: '9.0' }, { weight: 30, size: '11.0' }, { weight: 40, size: '13.0' } ];
    function calculateWeightSize() {
        const weightInputTube = document.getElementById('weight-input');
        const resultContainer = document.getElementById('result-container-weight');
        const resultText = document.getElementById('result-text-weight');
        if(!weightInputTube || !resultContainer || !resultText) return;

        const weight = parseFloat(weightInputTube.value);
        if (isNaN(weight) || weight <= 0) {
            resultContainer.classList.add('hidden'); return;
        }
        let recommendedSize = '13.0+';
        for (const guide of weightSizeGuide) {
            if (weight <= guide.weight) { recommendedSize = guide.size; break; }
        }
        resultText.textContent = recommendedSize;
        resultContainer.classList.remove('hidden');
    }

    function calculateTracheaSize() {
        const tracheaInput = document.getElementById('trachea-input');
        const resultContainer = document.getElementById('result-container-trachea');
        const resultText = document.getElementById('result-text-trachea');
        if(!tracheaInput || !resultContainer || !resultText) return;
        
        const diameter = parseFloat(tracheaInput.value);
        if (isNaN(diameter) || diameter <= 0) {
            resultContainer.classList.add('hidden'); return;
        }
        const recommendedId = (diameter / 1.5).toFixed(1); // Simplified formula
        resultText.textContent = recommendedId;
        resultContainer.classList.remove('hidden');
    }

    function saveAndDisplayTubeSelection() {
        const sizeInput = document.getElementById('selectedEtTubeSize');
        const cuffInput = document.getElementById('selectedEtTubeCuff');
        const notesInput = document.getElementById('selectedEtTubeNotes');

        if (!sizeInput.value) { alert('최종 ET Tube 사이즈를 입력해주세요.'); return; }

        selectedTubeInfo = {
            size: parseFloat(sizeInput.value),
            cuff: cuffInput.checked,
            notes: notesInput.value.trim()
        };
        
        const saveButton = document.getElementById('saveEtTubeSelection');
        saveButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>저장 완료!';
        saveButton.classList.replace('bg-blue-600','bg-green-600');
        setTimeout(() => {
            saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>기록 저장';
            saveButton.classList.replace('bg-green-600','bg-blue-600');
        }, 2000);
        
        updateTubeDisplay();
    }

    function updateTubeDisplay() {
        const displayDiv = document.getElementById('et_tube_selection_display');
        if (!displayDiv) return;
        if (selectedTubeInfo.size) {
            const cuffStatus = selectedTubeInfo.cuff ? '확인' : '미확인';
            displayDiv.innerHTML = `<p><strong>선택된 Tube:</strong> ID ${selectedTubeInfo.size}, 커프 ${cuffStatus}</p>${selectedTubeInfo.notes ? `<p><strong>메모:</strong> ${selectedTubeInfo.notes}</p>` : ''}`;
        } else {
            displayDiv.innerHTML = '<p>ET Tube가 선택되지 않았습니다.</p>';
        }
    }

    const ctx = document.getElementById('prognosisChart')?.getContext('2d');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut', data: { labels: ['완전 회복', '현저한 개선', '부분적 개선'], datasets: [{ data: [60, 30, 10], backgroundColor: ['#10B981','#F59E0B','#EF4444'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const attachDateInput = document.getElementById('attachDate');
    const attachTimeInput = document.getElementById('attachTime');
    function calculateRemovalDate() {
        const date = attachDateInput.value;
        const time = attachTimeInput.value;
        const removalInfoDiv = document.getElementById('removalInfo');
        if (!date || !time || !removalInfoDiv) return;
        
        const removalStart = new Date(`${date}T${time}`);
        removalStart.setHours(removalStart.getHours() + 72);
        
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        removalInfoDiv.innerHTML = `<h4 class="font-bold">🗓️ 패치 제거 권장 시간</h4><p><strong class="text-blue-600">${removalStart.toLocaleDateString('ko-KR', options)}</strong> 이후</p>`;
    }
    if (attachDateInput && attachTimeInput) {
        [attachDateInput, attachTimeInput].forEach(el => el.addEventListener('change', calculateRemovalDate));
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        attachDateInput.value = now.toISOString().slice(0,10);
        attachTimeInput.value = now.toISOString().slice(11,16);
        calculateRemovalDate();
    }
    
    const cycloWeightInput = document.getElementById('cycloPetWeight');
    const cycloDurationInput = document.getElementById('cycloDuration');
    function calculateCycloDose(){
        const doseResultDiv = document.getElementById('cycloDoseResult');
        if (!cycloWeightInput || !doseResultDiv) return;
        
        const weight = parseFloat(cycloWeightInput.value);
        if (isNaN(weight) || weight <= 0) {
            doseResultDiv.innerHTML = '<p>정보를 입력하면 자동 계산됩니다.</p>';
            return;
        }
        
        const doseInMl = (weight * 5) / 100;
        let htmlContent = `<p><strong>1일 권장 정량:</strong> <span class="text-2xl font-bold text-indigo-600">${doseInMl.toFixed(2)} mL</span></p>`;
        
        const duration = parseInt(cycloDurationInput.value);
        if (!isNaN(duration) && duration > 0) {
            htmlContent += `<p><strong>총 필요 용량 (${duration}일):</strong> <span class="text-2xl font-bold text-green-600">${(doseInMl * duration).toFixed(2)} mL</span></p>`;
        }
        doseResultDiv.innerHTML = htmlContent;
    }
    if(cycloWeightInput && cycloDurationInput) {
        [cycloWeightInput, cycloDurationInput].forEach(el => el.addEventListener('input', calculateCycloDose));
    }
    
    document.getElementById('saveTabButton')?.addEventListener('click', () => {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        const petName = globalNameInput.value.trim() || '환자';
        const tabName = document.querySelector('.tab-button.active')?.textContent.trim() || '안내문';
        
        html2canvas(activeTab, { scale: 1.5, backgroundColor: '#f1f5f9' }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `${petName}_${tabName}.png`;
            link.click();
        });
    });

    document.getElementById('calculate-weight-btn')?.addEventListener('click', calculateWeightSize);
    document.getElementById('calculate-trachea-btn')?.addEventListener('click', calculateTracheaSize);
    document.getElementById('saveEtTubeSelection')?.addEventListener('click', saveAndDisplayTubeSelection);

    // Initial load
    calculateAll();
    updateAllTitles();
});