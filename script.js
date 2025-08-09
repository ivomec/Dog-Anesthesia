document.addEventListener('DOMContentLoaded', () => {
    // --- 전역 변수 및 상수 ---
    const concentrations = {
        lidocaine: 20, ketamine: 50, ketamine_diluted: 10, bupivacaine: 5,
        butorphanol: 10, midazolam: 5, alfaxalone: 10, propofol: 10,
        clavamox_iv: 100, atropine: 0.5, dobutamine_raw: 12.5, epinephrine: 1,
    };

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

    // --- DOM 요소 ---
    const allInputs = document.querySelectorAll('input, select');
    const weightInput = document.getElementById('weight');
    const patientNameInput = document.getElementById('patient-name-main');
    const surgeryDateInput = document.getElementById('surgery-date');
    const statusCheckboxes = document.querySelectorAll('#patient-status-group input[type="checkbox"]');
    
    // --- 탭 관리 함수 ---
    window.openTab = function(evt, tabName) {
        let i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tab-button");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }

    // --- 메인 계산 함수 ---
    function calculateAll() {
        const weight = parseFloat(weightInput.value);
        const patientName = patientNameInput.value;
        const surgeryDate = surgeryDateInput.value;
        const patientStatus = Array.from(statusCheckboxes)
                                   .filter(cb => cb.checked)
                                   .map(cb => cb.value);

        // 연동되는 정보 업데이트
        document.getElementById('patientName_handout').value = patientName;
        document.getElementById('patientName_discharge').value = patientName;
        document.getElementById('surgery-date').value = surgeryDate;
        document.getElementById('visitDate').value = surgeryDate;
        document.getElementById('weight_discharge').value = weight || '';

        if (isNaN(weight) || weight <= 0) {
            // 값이 유효하지 않으면 초기화
            clearResults();
            return;
        }

        populatePrepTab(weight, patientStatus);
        populateEtTubeTab(weight);
        populateEmergencyTab(weight, patientStatus);
        calculateDischargeMeds(); // 퇴원약 탭 계산
    }
    
    function clearResults() {
        const resultDivs = ['clavamox_result', 'premed_result', 'lk_load_result', 'fluid_result', 'alfaxan_result', 'propofol_result', 'norspan_prep_result', 'dog_nerve_block_result', 'lk_cri_calc_result', 'result-text-weight', 'emergency_protocol_result'];
        resultDivs.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = '...';
        });
        document.getElementById('alfaxan_result_card').classList.remove('highlight-recommend');
        document.getElementById('result-container-trachea').classList.add('hidden');
    }

    // --- 탭별 내용 채우기 ---
    function populatePrepTab(weight, statuses) {
        const clavaIvMl = (20 * weight) / concentrations.clavamox_iv;
        document.getElementById('clavamox_result').innerHTML = `<p><span class="result-value">${clavaIvMl.toFixed(2)} mL</span> (클라바목스)</p>`;

        const butorMl = (0.2 * weight) / concentrations.butorphanol;
        const midaMl = (0.2 * weight) / concentrations.midazolam;
        document.getElementById('premed_result').innerHTML = `<p><span class="result-value">${butorMl.toFixed(2)} mL</span> 부토르파놀</p><p><span class="result-value">${midaMl.toFixed(2)} mL</span> 미다졸람</p>`;

        const lidoLoadMl = (1 * weight) / concentrations.lidocaine;
        const ketaLoadMl_diluted = (0.5 * weight) / concentrations.ketamine_diluted;
        document.getElementById('lk_load_result').innerHTML = `<p><span class="result-value">${lidoLoadMl.toFixed(2)} mL</span> 리도카인</p><p><span class="result-value">${ketaLoadMl_diluted.toFixed(2)} mL</span> 케타민(희석)</p><p class="text-xs font-semibold mt-1">※ 희석: 케타민(50) 0.2mL + N/S 0.8mL</p>`;
        
        const fluidRate = statuses.includes('cardiac') || statuses.includes('renal') ? 2 : 5;
        const pumpCorrectionFactor = 0.7;
        const fluidTarget = fluidRate * weight;
        const fluidCorrected = fluidTarget / pumpCorrectionFactor;
        document.getElementById('fluid_result').innerHTML = `<p><span class="result-value">${fluidCorrected.toFixed(1)} mL/hr</span></p><p class="text-xs mt-1">(목표: ${fluidTarget.toFixed(1)}mL/hr)</p>`;

        const alfaxanMlMin = (1 * weight) / concentrations.alfaxalone;
        const alfaxanMlMax = (2 * weight) / concentrations.alfaxalone;
        document.getElementById('alfaxan_result').innerHTML = `<p><span class="result-value">${alfaxanMlMin.toFixed(2)}~${alfaxanMlMax.toFixed(2)} mL</span></p>`;
        
        const propofolMin = (2 * weight) / concentrations.propofol;
        const propofolMax = (6 * weight) / concentrations.propofol;
        document.getElementById('propofol_result').innerHTML = `<p><span class="result-value">${propofolMin.toFixed(2)}~${propofolMax.toFixed(2)} mL</span></p><p class="text-xs mt-1">(2-6 mg/kg)</p>`;
        
        const alfaxanCard = document.getElementById('alfaxan_result_card');
        if (statuses.includes('cardiac')) {
            alfaxanCard.classList.add('highlight-recommend');
            alfaxanCard.querySelector('h5').textContent = "알팍산 (추천)";
        } else {
            alfaxanCard.classList.remove('highlight-recommend');
            alfaxanCard.querySelector('h5').textContent = "알팍산";
        }
        
        let patchRecommendation = "";
        if (weight <= 3.0) { patchRecommendation = "5 mcg/h 패치 적용"; } 
        else if (weight <= 6.0) { patchRecommendation = "10 mcg/h 패치 적용"; } 
        else { patchRecommendation = "20 mcg/h 패치 적용"; }
        document.getElementById('norspan_prep_result').innerHTML = `<p class="result-value text-lg">${patchRecommendation}</p>`;

        document.getElementById('dog_nerve_block_result').innerHTML = `<p class="text-lg">총 <span class="result-value">${(0.1 * weight * 4 * 0.8).toFixed(2)}mL</span> (부피) + <span class="result-value">${(0.1 * weight * 4 * 0.2).toFixed(2)}mL</span> (리도)</p><p class="text-xs text-gray-500 mt-1">4군데 기준, 부위당 약 ${(0.1 * weight).toFixed(2)} mL</p>`;
        
        const pumpRate = (25 * weight * 60) / 2000;
        document.getElementById('lk_cri_calc_result').innerHTML = `<div class="p-4 border rounded-lg bg-gray-50 space-y-2"><h4 class="font-semibold">CRI 펌프 속도</h4><p class="text-xs">희석: 리도카인 3mL + 케타민(50) 0.24mL + N/S 26.76mL</p><div class="mt-2 text-center text-red-600 font-bold text-2xl">${pumpRate.toFixed(2)} mL/hr</div></div>`;
    }

    function populateEtTubeTab(weight) {
        let recommendedSize = '13.0 이상';
        for (let i = 0; i < weightSizeGuide.length; i++) {
            if (weight <= weightSizeGuide[i].weight) {
                recommendedSize = weightSizeGuide[i].size;
                break;
            }
        }
        document.getElementById('result-text-weight').textContent = recommendedSize;
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

    function populateEmergencyTab(weight, statuses) {
        const isCardiac = statuses.includes('cardiac');
        const dobutamineDose = 5;
        const infusionRateMlPerHr = (((weight * dobutamineDose * 60) / 1000) / (0.5 * 12.5 / 30));
        const atropineLowMl = (0.02 * weight) / concentrations.atropine;
        const atropineHighMl = (0.04 * weight) / concentrations.atropine;
        const epiLowMl = (0.01 * weight) / (concentrations.epinephrine / 10);
        const epiHighMl = (0.1 * weight) / concentrations.epinephrine;
        const atropineCpaMl = (0.04 * weight) / concentrations.atropine;

        document.getElementById('emergency_protocol_result').innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="emergency-card p-4">
                    <h3 class="font-bold text-lg text-red-800">저혈압 & 서맥</h3>
                    <div>
                        <h4 class="font-bold text-lg text-red-800">저혈압 (MAP < 60)</h4>
                        <ol class="list-decimal list-inside mt-2 space-y-2 text-sm">
                            <li><span class="font-bold">호흡 마취제 농도 감소</span></li>
                            <li><span class="font-bold">환자 상태 확인:</span>
                                <ul class="list-disc list-inside ml-4 text-xs">
                                    <li><span class="font-semibold">건강한 환자:</span> 수액 볼루스 (LRS 10mL/kg)</li>
                                    ${isCardiac ? `<li><span class="font-semibold text-red-600">심장 질환 환자:</span> 수액 볼루스 금기! 승압제 우선.</li>` : ''}
                                </ul>
                            </li>
                        </ol>
                        <div class="mt-2 p-3 rounded-lg bg-red-100 space-y-2">
                            <h5 class="font-semibold text-center text-sm">도부타민 CRI</h5>
                            <p class="text-center font-bold text-red-700 text-2xl">${infusionRateMlPerHr.toFixed(2)} mL/hr</p>
                        </div>
                    </div>
                    <div class="mt-4">
                        <h4 class="font-bold text-lg text-red-800 mt-4">서맥 (Bradycardia)</h4>
                        <div class="mt-2 p-3 rounded-lg bg-red-100 text-center">
                            <h5 class="font-semibold text-sm">아트로핀 (0.02-0.04 mg/kg)</h5>
                            <p class="font-bold text-red-700 text-2xl">${atropineLowMl.toFixed(2)} ~ ${atropineHighMl.toFixed(2)} mL IV</p>
                        </div>
                    </div>
                </div>
                <div class="emergency-card p-4">
                    <h3 class="font-bold text-lg text-red-800">심정지 (CPA) 프로토콜</h3>
                    <div class="mt-2 p-2 rounded-lg bg-red-100 space-y-2 text-center">
                        <h5 class="font-semibold text-sm">에피네프린 (Low dose, 1차)</h5>
                        <p class="font-bold text-red-700 text-xl">${epiLowMl.toFixed(2)} mL (희석액) IV</p><hr>
                        <h5 class="font-semibold text-sm">아트로핀 (Asystole/PEA 시)</h5>
                        <p class="font-bold text-red-700 text-xl">${atropineCpaMl.toFixed(2)} mL IV</p><hr>
                        <h5 class="font-semibold text-sm">에피네프린 (High dose)</h5>
                        <p class="font-bold text-red-700 text-xl">${epiHighMl.toFixed(2)} mL (원액) IV</p>
                    </div>
                </div>
            </div>`;
    }

    // --- 퇴원약 조제 탭 로직 ---
    function calculateDischargeMeds() {
        const weight = parseFloat(document.getElementById('weight_discharge').value);
        const statuses = Array.from(statusCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        const isLiverIssue = statuses.includes('liver');
        const isKidneyIssue = statuses.includes('renal');

        if (isNaN(weight) || weight <= 0) return;

        // 간 이상 시 간 보조제 자동 선택
        if(isLiverIssue) {
            ['udca', 'silymarin', 'same'].forEach(drugName => {
                const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`);
                if(row) {
                    row.querySelector('.med-checkbox').checked = true;
                    row.querySelector('.days').value = 7;
                }
            });
        }

        const summaryData = {};
        document.querySelectorAll('#dischargeTab .med-checkbox:checked').forEach(checkbox => {
            const row = checkbox.closest('tr');
            const drugName = row.querySelector('td:nth-child(2)').textContent;
            const days = parseInt(row.querySelector('.days').value);
            const unit = row.dataset.unit;
            let totalAmountText = '';
            let dailyMultiplier = 2; // BID 기본

            if (row.dataset.special === 'vetrocam') {
                dailyMultiplier = 1;
                const day1Dose = weight * 0.2;
                const otherDaysDose = weight * 0.1 * (days - 1);
                const totalAmount = day1Dose + (days > 1 ? otherDaysDose : 0);
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else if (row.dataset.special === 'same') {
                dailyMultiplier = 1;
                const totalAmount = (weight / 2.5) * 0.25 * days;
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else if (row.dataset.special === 'marbofloxacin') {
                dailyMultiplier = 1;
                const dose = parseFloat(row.querySelector('.dose').value);
                const strength = parseFloat(row.dataset.strength);
                const totalAmount = (weight * dose * dailyMultiplier * days) / strength;
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else if (row.dataset.special === 'paramel') {
                const dose = 0.75;
                const totalAmount = weight * dose * dailyMultiplier * days;
                totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
            } else {
                if (['udca', 'silymarin', 'itraconazole'].includes(row.dataset.drug)) dailyMultiplier = 2;
                const dose = parseFloat(row.querySelector('.dose').value);
                const strength = parseFloat(row.dataset.strength);
                if (strength > 0) {
                    const totalAmount = (weight * dose * dailyMultiplier * days) / strength;
                    totalAmountText = `${totalAmount.toFixed(1)} ${unit}`;
                }
            }
            row.querySelector('.total-amount').textContent = totalAmountText;

            if (!summaryData[days]) summaryData[days] = [];
            
            let summaryText = `${drugName.split(' (')[0]} ${totalAmountText}`;
            if (dailyMultiplier === 1) summaryText += ' (1일 1회)';
            
            summaryData[days].push({
                text: summaryText,
                isDanger: (isLiverIssue && row.querySelector('.notes[data-liver="true"]')) || (isKidneyIssue && row.querySelector('.notes[data-kidney="true"]'))
            });
        });

        updateDischargeSummaryUI(summaryData);
        updateDischargeWarnings(isLiverIssue, isKidneyIssue);
    }

    function initializeDischargeTab() {
        const defaultMeds = {
            '7day': ['clindamycin', 'gabapentin', 'famotidine', 'almagel'],
            '3day': ['vetrocam', 'misoprostol', 'acetaminophen']
        };
        defaultMeds['7day'].forEach(drugName => {
            const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`);
            if (row) row.querySelector('.med-checkbox').checked = true;
        });
        defaultMeds['3day'].forEach(drugName => {
            const row = document.querySelector(`#dischargeTab tr[data-drug="${drugName}"]`);
            if (row) row.querySelector('.med-checkbox').checked = true;
        });
        calculateDischargeMeds();
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
            box.innerHTML = `<h3>${day}일 처방</h3>`;
            summaryData[day].forEach(item => {
                const p = document.createElement('p');
                p.className = 'summary-item';
                p.innerHTML = item.isDanger ? `<span class="danger">${item.text}</span>` : item.text;
                box.appendChild(p);
            });
            summaryContainer.appendChild(box);
        });
    }

    function updateDischargeWarnings(isLiverIssue, isKidneyIssue) {
        document.querySelectorAll('#dischargeTab .notes').forEach(noteCell => {
            noteCell.classList.remove('highlight-warning');
            if ((isLiverIssue && noteCell.dataset.liver === 'true') || (isKidneyIssue && noteCell.dataset.kidney === 'true')) {
                noteCell.classList.add('highlight-warning');
            }
        });
    }


    // --- 노스판 안내문 탭 로직 ---
    function calculateRemovalDate() {
        const dateInput = document.getElementById('attachDate').value;
        const timeInput = document.getElementById('attachTime').value;
        const removalInfoDiv = document.getElementById('removalInfo');

        if (!dateInput || !timeInput) {
            removalInfoDiv.innerHTML = '<p class="font-bold text-yellow-900">날짜와 시간을 모두 입력해주세요.</p>';
            return;
        }
        const attachDateTime = new Date(`${dateInput}T${timeInput}`);
        if (isNaN(attachDateTime.getTime())) return;
        
        const removalDateStart = new Date(attachDateTime.getTime() + 72 * 3600 * 1000);
        const removalDateEnd = new Date(attachDateTime.getTime() + 96 * 3600 * 1000);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
        
        removalInfoDiv.innerHTML = `
            <h4 class="text-lg font-bold text-gray-800 mb-2">🗓️ 패치 제거 권장 기간</h4>
            <p class="text-base text-gray-700">
                <strong class="text-blue-600">${new Intl.DateTimeFormat('ko-KR', options).format(removalDateStart)}</strong> 부터<br>
                <strong class="text-blue-600">${new Intl.DateTimeFormat('ko-KR', options).format(removalDateEnd)}</strong> 사이에<br>
                패치를 제거해주세요.
            </p>`;
    }
    
    window.saveHandoutAsPDF = function() {
        const currentTab = document.querySelector('.tab-button.active').textContent;
        const prepTab = document.querySelector('.tab-button[onclick*="prepTab"]');
        
        // Temporarily switch to handout tab for printing if not already on it
        const handoutTabButton = document.querySelector('.tab-button[onclick*="educationTab"]');
        const activeTabButton = document.querySelector('.tab-button.active');
        
        openTab({currentTarget: handoutTabButton}, 'educationTab');
        
        window.print();
        
        // Switch back to original tab
        openTab({currentTarget: activeTabButton}, activeTabButton.getAttribute('onclick').match(/'([^']+)'/)[1]);
    }

    window.saveHandoutAsImage = function() {
        const captureElement = document.getElementById('captureArea');
        const patientName = document.getElementById('patientName_handout').value || '환자';
        html2canvas(captureElement, { useCORS: true, scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${patientName}_통증패치_안내문.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }
    
    function initializeHandoutTab() {
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

    // --- 데이터 저장/불러오기 로직 ---
    function saveDataAsJson() {
        const data = {
            surgeryDate: document.getElementById('surgery-date').value,
            patientName: document.getElementById('patient-name-main').value,
            weight: document.getElementById('weight').value,
            patientStatus: Array.from(statusCheckboxes).filter(cb => cb.checked).map(cb => cb.value),
            dischargeMeds: []
        };
        
        document.querySelectorAll('#dischargeTab .med-checkbox:checked').forEach(checkbox => {
            const row = checkbox.closest('tr');
            data.dischargeMeds.push({
                drug: row.dataset.drug,
                days: row.querySelector('.days').value,
                dose: row.querySelector('.dose') ? row.querySelector('.dose').value : null
            });
        });
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.download = `${data.patientName || '환자'}_${data.surgeryDate || '날짜'}_마취기록.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    function loadDataFromJson(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            
            document.getElementById('surgery-date').value = data.surgeryDate;
            document.getElementById('patient-name-main').value = data.patientName;
            document.getElementById('weight').value = data.weight;
            
            statusCheckboxes.forEach(cb => {
                cb.checked = data.patientStatus.includes(cb.value);
            });
            
            // Uncheck all discharge meds first
            document.querySelectorAll('#dischargeTab .med-checkbox').forEach(cb => cb.checked = false);
            
            data.dischargeMeds.forEach(med => {
                const row = document.querySelector(`#dischargeTab tr[data-drug="${med.drug}"]`);
                if(row) {
                    row.querySelector('.med-checkbox').checked = true;
                    row.querySelector('.days').value = med.days;
                    if (row.querySelector('.dose') && med.dose) {
                        row.querySelector('.dose').value = med.dose;
                    }
                }
            });
            
            calculateAll();
        };
        reader.readAsText(file);
    }

    function saveDashboardAsImage() {
        const captureElement = document.getElementById('dashboard-container');
        const patientName = patientNameInput.value || '환자';
        const date = surgeryDateInput.value || '날짜';
        
        html2canvas(captureElement, {
            useCORS: true,
            scale: 1.5,
            backgroundColor: '#f0f4f8'
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `[전체]${patientName}_${date}_마취대시보드.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    // --- 이벤트 리스너 ---
    allInputs.forEach(input => {
        input.addEventListener('input', calculateAll);
        input.addEventListener('change', calculateAll);
    });
    
    document.getElementById('calculate-trachea-btn').addEventListener('click', calculateTracheaSize);
    document.getElementById('trachea-input').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') calculateTracheaSize();
    });
    
    // 안내문 탭 이벤트 리스너
    document.getElementById('attachDate').addEventListener('change', calculateRemovalDate);
    document.getElementById('attachTime').addEventListener('change', calculateRemovalDate);
    
    // JSON & 이미지 저장/불러오기 버튼
    document.getElementById('save-json-btn').addEventListener('click', saveDataAsJson);
    document.getElementById('load-json-input').addEventListener('change', loadDataFromJson);
    document.getElementById('save-image-btn').addEventListener('click', saveDashboardAsImage);


    // --- 초기화 ---
    function initialize() {
        surgeryDateInput.valueAsDate = new Date();
        initializeDischargeTab();
        initializeHandoutTab();
        calculateAll();
        document.getElementsByClassName('tab-button')[0].click(); // 첫번째 탭 활성화
    }

    initialize();
});
