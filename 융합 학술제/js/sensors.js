/* ============================================
   건강 모니터링 시스템 - 센서 데이터 관리 모듈
   목적: 실시간 센서 데이터 수집, 분석, 위험 감지
   기능: 센서 데이터 표시, 그래프 업데이트, 위험 판정
   ============================================ */

/**
 * 센서 데이터 관리자
 * 센서별 데이터 수집 및 실시간 표시 관리
 */
const sensorsManager = {
    sensors: {
        'heart-rate': {
            id: 'heart-rate',
            name: '심박수',
            unit: 'bpm',
            icon: '❤️',
            normalRange: { min: 60, max: 100 },
            warningRange: { min: 50, max: 120 },
            currentValue: null,
            values: [], // 최근 20개 값 저장
            maxValue: null,
            minValue: null,
            sum: 0,
            count: 0
        },
        'temperature': {
            id: 'temperature',
            name: '체온',
            unit: '°C',
            icon: '🌡️',
            normalRange: { min: 36.1, max: 37.2 },
            warningRange: { min: 35.0, max: 38.5 },
            currentValue: null,
            values: [],
            maxValue: null,
            minValue: null,
            sum: 0,
            count: 0
        },
        'oxygen': {
            id: 'oxygen',
            name: '산소포화도',
            unit: '%',
            icon: '🫁',
            normalRange: { min: 95, max: 100 },
            warningRange: { min: 90, max: 100 },
            currentValue: null,
            values: [],
            maxValue: null,
            minValue: null,
            sum: 0,
            count: 0
        }
    },
    currentSensorId: null,
    chart: null,

    /**
     * 센서 관리자 초기화
     */
    init() {
        console.log('센서 관리자 초기화');
    },

    /**
     * 센서 리스트 렌더링
     */
    renderSensorList() {
        const sensorList = document.getElementById('sensorList');
        sensorList.innerHTML = '';

        Object.values(this.sensors).forEach(sensor => {
            const item = document.createElement('div');
            item.className = 'sensor-item';
            item.onclick = () => this.showSensorDetail(sensor.id);

            const status = this.getSensorStatus(sensor);
            const statusText = status === 'normal' ? '정상' : status === 'warning' ? '주의' : '위험';
            const statusClass = status === 'normal' ? 'normal' : status === 'warning' ? 'warning' : 'danger';

            item.innerHTML = `
                <div class="sensor-item-header">
                    <div class="sensor-icon">${sensor.icon}</div>
                    <div>
                        <div class="sensor-name">${sensor.name}</div>
                        <div class="sensor-status ${statusClass}">${statusText}</div>
                    </div>
                </div>
                <div class="sensor-value-preview">
                    ${sensor.currentValue !== null ? sensor.currentValue.toFixed(1) : '--'} ${sensor.unit}
                </div>
            `;

            sensorList.appendChild(item);
        });
    },

    /**
     * 센서 상세 화면 표시
     * @param {string} sensorId - 센서 ID
     */
    showSensorDetail(sensorId) {
        this.currentSensorId = sensorId;
        const sensor = this.sensors[sensorId];

        if (!sensor) return;

        // 화면 제목 업데이트
        document.getElementById('sensorDetailTitle').textContent = sensor.name;

        // 현재 값 표시
        document.getElementById('currentValue').textContent = 
            sensor.currentValue !== null ? sensor.currentValue.toFixed(1) : '--';
        document.getElementById('valueUnit').textContent = sensor.unit;

        // 상태 표시
        const status = this.getSensorStatus(sensor);
        const statusElement = document.getElementById('statusValue');
        statusElement.className = `status-value ${status}`;
        statusElement.textContent = this.getStatusText(status);

        // 통계 업데이트
        this.updateStatistics(sensorId);

        // 정상 범위 표시
        document.getElementById('normalRange').textContent = 
            `${sensor.normalRange.min} ~ ${sensor.normalRange.max} ${sensor.unit}`;

        // 그래프 초기화
        this.initChart(sensorId);

        // 화면 전환
        app.showScreen('sensorDetailScreen');
    },

    /**
     * 센서 데이터 업데이트
     * @param {string} sensorId - 센서 ID
     * @param {number} value - 측정값
     */
    updateSensorData(sensorId, value) {
        const sensor = this.sensors[sensorId];
        if (!sensor) return;

        const timestamp = new Date();

        // 현재 값 업데이트
        sensor.currentValue = value;

        // 값 배열에 추가 (최대 20개 유지)
        sensor.values.push({
            value: value,
            time: timestamp
        });
        if (sensor.values.length > 20) {
            sensor.values.shift();
        }

        // 통계 업데이트
        if (sensor.maxValue === null || value > sensor.maxValue) {
            sensor.maxValue = value;
        }
        if (sensor.minValue === null || value < sensor.minValue) {
            sensor.minValue = value;
        }

        sensor.sum += value;
        sensor.count++;
        sensor.avgValue = sensor.sum / sensor.count;

        // 위험 판정
        const status = this.getSensorStatus(sensor);
        if (status === 'danger') {
            this.handleDanger(sensorId, value, status);
        }

        // 현재 상세 화면이 이 센서를 보여주고 있다면 업데이트
        if (this.currentSensorId === sensorId) {
            this.updateSensorDetail(sensorId);
        }

        // 센서 리스트 화면이 활성화되어 있다면 업데이트
        if (app.currentScreen === 'sensorsScreen') {
            this.renderSensorList();
        }
    },

    /**
     * 센서 상세 화면 업데이트
     * @param {string} sensorId - 센서 ID
     */
    updateSensorDetail(sensorId) {
        const sensor = this.sensors[sensorId];
        if (!sensor) return;

        // 현재 값 업데이트
        document.getElementById('currentValue').textContent = 
            sensor.currentValue !== null ? sensor.currentValue.toFixed(1) : '--';

        // 상태 업데이트
        const status = this.getSensorStatus(sensor);
        const statusElement = document.getElementById('statusValue');
        statusElement.className = `status-value ${status}`;
        statusElement.textContent = this.getStatusText(status);

        // 통계 업데이트
        this.updateStatistics(sensorId);

        // 그래프 업데이트
        this.updateChart(sensorId);
    },

    /**
     * 통계 정보 업데이트
     * @param {string} sensorId - 센서 ID
     */
    updateStatistics(sensorId) {
        const sensor = this.sensors[sensorId];
        if (!sensor) return;

        document.getElementById('maxValue').textContent = 
            sensor.maxValue !== null ? sensor.maxValue.toFixed(1) : '--';
        document.getElementById('minValue').textContent = 
            sensor.minValue !== null ? sensor.minValue.toFixed(1) : '--';
        document.getElementById('avgValue').textContent = 
            sensor.avgValue !== null ? sensor.avgValue.toFixed(1) : '--';
    },

    /**
     * 센서 상태 판정
     * @param {object} sensor - 센서 객체
     * @returns {string} 상태 ('normal', 'warning', 'danger')
     */
    getSensorStatus(sensor) {
        if (sensor.currentValue === null) return 'normal';

        const { min, max } = sensor.normalRange;
        const { min: warnMin, max: warnMax } = sensor.warningRange;

        if (sensor.currentValue < warnMin || sensor.currentValue > warnMax) {
            return 'danger';
        } else if (sensor.currentValue < min || sensor.currentValue > max) {
            return 'warning';
        } else {
            return 'normal';
        }
    },

    /**
     * 상태 텍스트 반환
     * @param {string} status - 상태 코드
     * @returns {string} 상태 텍스트
     */
    getStatusText(status) {
        const statusMap = {
            'normal': '정상',
            'warning': '주의',
            'danger': '위험'
        };
        return statusMap[status] || '알 수 없음';
    },

    /**
     * 위험 상황 처리
     * @param {string} sensorId - 센서 ID
     * @param {number} value - 측정값
     * @param {string} status - 상태
     */
    handleDanger(sensorId, value, status) {
        const sensor = this.sensors[sensorId];
        const { min, max } = sensor.normalRange;

        // 위험 알림 표시
        this.showDangerAlert(sensor.name, value, sensor.unit);

        // 위험 기록 저장
        const riskType = value < min ? 
            `${sensor.name} 정상 범위 미만` : 
            `${sensor.name} 정상 범위 초과`;

        recordsManager.addRecord({
            sensor: sensor.name,
            sensorId: sensorId,
            value: value,
            riskType: riskType,
            threshold: { min, max }
        });
    },

    /**
     * 위험 알림 표시
     * @param {string} sensorName - 센서 이름
     * @param {number} value - 측정값
     * @param {string} unit - 단위
     */
    showDangerAlert(sensorName, value, unit) {
        const alertBox = document.getElementById('dangerAlert');
        const alertText = document.getElementById('dangerText');
        
        alertText.textContent = `${sensorName} 위험: ${value.toFixed(1)} ${unit}`;
        alertBox.style.display = 'block';

        // 5초 후 자동 숨김
        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 5000);
    },

    /**
     * 그래프 초기화
     * @param {string} sensorId - 센서 ID
     */
    initChart(sensorId) {
        const sensor = this.sensors[sensorId];
        if (!sensor) return;

        const ctx = document.getElementById('sensorChart').getContext('2d');

        // 기존 차트가 있으면 제거
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = sensor.values.map((_, index) => index + 1);
        const data = sensor.values.map(v => v.value);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: sensor.name,
                    data: data,
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: sensor.unit
                        }
                    }
                }
            }
        });
    },

    /**
     * 그래프 업데이트
     * @param {string} sensorId - 센서 ID
     */
    updateChart(sensorId) {
        if (!this.chart) {
            this.initChart(sensorId);
            return;
        }

        const sensor = this.sensors[sensorId];
        if (!sensor) return;

        const labels = sensor.values.map((_, index) => index + 1);
        const data = sensor.values.map(v => v.value);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update('none'); // 애니메이션 없이 업데이트
    }
};


