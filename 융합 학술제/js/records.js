/* ============================================
   건강 모니터링 시스템 - 위험 기록 관리 모듈
   목적: 위험 발생 기록 저장, 관리, 필터링
   기능: 기록 추가, 리스트 표시, 상세 보기, 날짜 필터
   ============================================ */

/**
 * 위험 기록 관리자
 * 위험 발생 기록의 저장 및 관리
 */
const recordsManager = {
    records: [],
    filteredRecords: [],
    currentFilterDate: null,

    /**
     * 기록 관리자 초기화
     */
    init() {
        // 로컬 스토리지에서 기록 불러오기
        this.loadRecords();
        console.log('위험 기록 관리자 초기화');
    },

    /**
     * 위험 기록 추가
     * @param {object} recordData - 기록 데이터
     */
    addRecord(recordData) {
        const record = {
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sensor: recordData.sensor,
            sensorId: recordData.sensorId,
            value: recordData.value,
            riskType: recordData.riskType,
            time: new Date(),
            threshold: recordData.threshold
        };

        this.records.unshift(record); // 최신 기록을 맨 위에 추가
        this.saveRecords();

        // 기록 화면이 활성화되어 있다면 업데이트
        if (app.currentScreen === 'recordsScreen') {
            this.renderRecords();
        }

        console.log('위험 기록 추가:', record);
    },

    /**
     * 기록 리스트 렌더링
     */
    renderRecords() {
        const recordsList = document.getElementById('recordsList');
        const emptyState = document.getElementById('emptyRecords');

        // 필터 적용
        this.applyFilter();

        if (this.filteredRecords.length === 0) {
            recordsList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        recordsList.style.display = 'block';
        emptyState.style.display = 'none';
        recordsList.innerHTML = '';

        this.filteredRecords.forEach(record => {
            const item = document.createElement('div');
            item.className = 'record-item';
            item.onclick = () => this.showRecordDetail(record.id);

            const timeStr = this.formatTime(record.time);
            const dateStr = this.formatDate(record.time);

            item.innerHTML = `
                <div class="record-header">
                    <div>
                        <div class="record-time">${timeStr}</div>
                        <div class="record-date" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">${dateStr}</div>
                    </div>
                    <div class="record-sensor">${record.sensor}</div>
                </div>
                <div class="record-content">
                    <div class="record-value">${record.value.toFixed(1)}</div>
                    <div class="record-risk">${record.riskType}</div>
                </div>
            `;

            recordsList.appendChild(item);
        });
    },

    /**
     * 기록 상세 보기
     * @param {string} recordId - 기록 ID
     */
    showRecordDetail(recordId) {
        const record = this.records.find(r => r.id === recordId);
        if (!record) return;

        const container = document.getElementById('recordDetailContainer');
        
        const timeStr = this.formatTime(record.time);
        const dateStr = this.formatDate(record.time);
        const thresholdStr = `${record.threshold.min} ~ ${record.threshold.max}`;

        container.innerHTML = `
            <div class="detail-section">
                <div class="detail-label">발생 시간</div>
                <div class="detail-value">${dateStr} ${timeStr}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">센서 종류</div>
                <div class="detail-value">${record.sensor}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">측정값</div>
                <div class="detail-value danger">${record.value.toFixed(1)}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">정상 범위</div>
                <div class="detail-value">${thresholdStr}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">위험 내용</div>
                <div class="detail-value">${record.riskType}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">정상 범위 대비</div>
                <div class="detail-value">
                    ${record.value < record.threshold.min ? 
                        `정상 범위보다 ${(record.threshold.min - record.value).toFixed(1)} 낮음` : 
                        `정상 범위보다 ${(record.value - record.threshold.max).toFixed(1)} 높음`}
                </div>
            </div>
        `;

        app.showScreen('recordDetailScreen');
    },

    /**
     * 날짜 필터 적용
     */
    filterByDate() {
        const dateFilter = document.getElementById('dateFilter');
        this.currentFilterDate = dateFilter.value || null;
        this.renderRecords();
    },

    /**
     * 필터 적용
     */
    applyFilter() {
        if (!this.currentFilterDate) {
            this.filteredRecords = [...this.records];
            return;
        }

        const filterDate = new Date(this.currentFilterDate);
        this.filteredRecords = this.records.filter(record => {
            const recordDate = new Date(record.time);
            return recordDate.toDateString() === filterDate.toDateString();
        });
    },

    /**
     * 시간 포맷팅
     * @param {Date} date - 날짜 객체
     * @returns {string} 포맷된 시간 문자열
     */
    formatTime(date) {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * 날짜 포맷팅
     * @param {Date} date - 날짜 객체
     * @returns {string} 포맷된 날짜 문자열
     */
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 기록을 로컬 스토리지에 저장
     */
    saveRecords() {
        try {
            localStorage.setItem('healthRecords', JSON.stringify(this.records));
        } catch (error) {
            console.error('기록 저장 오류:', error);
        }
    },

    /**
     * 로컬 스토리지에서 기록 불러오기
     */
    loadRecords() {
        try {
            const saved = localStorage.getItem('healthRecords');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 날짜 문자열을 Date 객체로 변환
                this.records = parsed.map(record => ({
                    ...record,
                    time: new Date(record.time)
                }));
            }
        } catch (error) {
            console.error('기록 불러오기 오류:', error);
            this.records = [];
        }
    },

    /**
     * 모든 기록 가져오기 (PDF 생성용)
     * @returns {Array} 기록 배열
     */
    getAllRecords() {
        return this.records;
    }
};


