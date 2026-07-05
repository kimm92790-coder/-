/* ============================================
   건강 모니터링 시스템 - 블루투스 연동 모듈
   목적: 아두이노 HC-06 블루투스 모듈과 통신
   기능: Web Bluetooth API를 통한 센서 데이터 수신
   ============================================ */

/**
 * 블루투스 관리자
 * Web Bluetooth API를 사용하여 HC-06 모듈과 통신
 */
const bluetoothManager = {
    device: null,
    server: null,
    characteristic: null,
    isConnected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    /**
     * 블루투스 관리자 초기화
     */
    init() {
        this.updateConnectionStatus(false);
        this.checkBluetoothSupport();
    },

    /**
     * Web Bluetooth API 지원 여부 확인
     */
    checkBluetoothSupport() {
        if (!navigator.bluetooth) {
            console.warn('Web Bluetooth API가 지원되지 않습니다.');
            this.showMockData(); // 개발용 모의 데이터 표시
            return false;
        }
        return true;
    },

    /**
     * 블루투스 디바이스 연결
     */
    async connect() {
        try {
            if (!this.checkBluetoothSupport()) {
                alert('이 브라우저는 Web Bluetooth를 지원하지 않습니다.\nChrome 또는 Edge 브라우저를 사용해주세요.');
                return;
            }

            // 블루투스 디바이스 선택
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'HC-06' }, // HC-06 모듈 이름
                    { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] } // 일반적인 BLE 서비스
                ],
                optionalServices: ['battery_service']
            });

            // 디바이스 연결
            this.server = await this.device.gatt.connect();
            console.log('블루투스 디바이스 연결됨:', this.device.name);

            // 서비스 및 특성 가져오기
            const service = await this.server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
            this.characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');

            // 데이터 수신 시작
            await this.startReceivingData();

            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);

            // 연결 해제 이벤트 리스너
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

        } catch (error) {
            console.error('블루투스 연결 오류:', error);
            if (error.name === 'NotFoundError') {
                alert('블루투스 디바이스를 찾을 수 없습니다.\nHC-06 모듈이 켜져 있고 페어링되어 있는지 확인하세요.');
            } else if (error.name === 'SecurityError') {
                alert('블루투스 권한이 필요합니다.');
            } else {
                alert('연결 실패: ' + error.message);
            }
            this.updateConnectionStatus(false);
            this.showMockData(); // 연결 실패 시 모의 데이터 표시
        }
    },

    /**
     * 데이터 수신 시작
     */
    async startReceivingData() {
        // 알림 활성화
        await this.characteristic.startNotifications();
        
        this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            this.processReceivedData(value);
        });

        console.log('데이터 수신 시작');
    },

    /**
     * 수신된 데이터 처리
     * @param {DataView} dataView - 수신된 데이터
     */
    processReceivedData(dataView) {
        try {
            // 데이터를 문자열로 변환 (아두이노에서 보낸 형식에 맞게 조정 필요)
            let dataString = '';
            for (let i = 0; i < dataView.byteLength; i++) {
                dataString += String.fromCharCode(dataView.getUint8(i));
            }

            // JSON 형식으로 파싱 시도
            const data = JSON.parse(dataString.trim());
            
            // 센서 데이터 업데이트
            if (data.sensorId && data.value !== undefined) {
                sensorsManager.updateSensorData(data.sensorId, data.value);
            }

        } catch (error) {
            console.error('데이터 파싱 오류:', error);
        }
    },

    /**
     * 연결 해제 처리
     */
    handleDisconnection() {
        console.log('블루투스 연결 해제됨');
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        // 자동 재연결 시도
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect();
            }, 3000);
        }
    },

    /**
     * 연결 상태 UI 업데이트
     * @param {boolean} connected - 연결 상태
     */
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const btnConnect = document.getElementById('btnConnect');

        if (connected) {
            indicator.textContent = '🟢';
            indicator.classList.add('connected');
            indicator.classList.remove('disconnected');
            statusText.textContent = '블루투스 연결됨';
            btnConnect.textContent = '연결 해제';
            btnConnect.onclick = () => this.disconnect();
        } else {
            indicator.textContent = '⚫';
            indicator.classList.add('disconnected');
            indicator.classList.remove('connected');
            statusText.textContent = '블루투스 미연결';
            btnConnect.textContent = '연결하기';
            btnConnect.onclick = () => this.connect();
        }
    },

    /**
     * 블루투스 연결 해제
     */
    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.isConnected = false;
        this.updateConnectionStatus(false);
    },

    /**
     * 개발용 모의 데이터 표시 (블루투스 미지원 또는 연결 실패 시)
     */
    showMockData() {
        console.log('모의 데이터 모드 활성화');
        
        // 주기적으로 모의 센서 데이터 생성
        setInterval(() => {
            const sensors = ['heart-rate', 'temperature', 'oxygen'];
            const sensorId = sensors[Math.floor(Math.random() * sensors.length)];
            
            let value;
            switch(sensorId) {
                case 'heart-rate':
                    value = 60 + Math.floor(Math.random() * 80); // 60-140
                    break;
                case 'temperature':
                    value = 36.0 + (Math.random() * 2.0); // 36.0-38.0
                    break;
                case 'oxygen':
                    value = 95 + Math.floor(Math.random() * 5); // 95-100
                    break;
            }

            sensorsManager.updateSensorData(sensorId, value);
        }, 3000); // 3초마다 업데이트
    }
};


