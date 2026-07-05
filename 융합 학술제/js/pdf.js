/* ============================================
   건강 모니터링 시스템 - PDF 생성 모듈
   목적: 위험 기록을 PDF로 변환하여 병원/보호자와 공유
   기능: PDF 생성, 다운로드, 레이아웃 구성
   ============================================ */

/**
 * PDF 관리자
 * 위험 기록을 PDF 형식으로 변환 및 다운로드
 */
const pdfManager = {
    /**
     * PDF 생성 및 다운로드
     */
    generatePDF() {
        const records = recordsManager.getAllRecords();

        if (records.length === 0) {
            alert('변환할 위험 기록이 없습니다.');
            return;
        }

        try {
            // PDF 문서 정의
            const docDefinition = this.createDocumentDefinition(records);
            
            // PDF 생성 및 다운로드
            pdfMake.createPdf(docDefinition).download(
                `건강_모니터링_기록_${this.getFormattedDate(new Date())}.pdf`
            );

            console.log('PDF 생성 완료');
        } catch (error) {
            console.error('PDF 생성 오류:', error);
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    },

    /**
     * PDF 문서 정의 생성
     * @param {Array} records - 위험 기록 배열
     * @returns {object} PDF 문서 정의 객체
     */
    createDocumentDefinition(records) {
        return {
            content: [
                // 제목
                {
                    text: '건강 모니터링 위험 기록',
                    style: 'header',
                    alignment: 'center',
                    margin: [0, 0, 0, 20]
                },
                
                // 생성 정보
                {
                    text: `생성일: ${this.getFormattedDateTime(new Date())}`,
                    style: 'subheader',
                    margin: [0, 0, 0, 10]
                },
                
                {
                    text: `총 기록 수: ${records.length}건`,
                    style: 'subheader',
                    margin: [0, 0, 0, 20]
                },

                // 기록 테이블
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', '*', '*', '*', '*'],
                        body: this.createTableBody(records)
                    },
                    layout: 'lightGridLines'
                },

                // 빈 공간
                { text: '', margin: [0, 20, 0, 0] },

                // 요약 정보
                {
                    text: '요약 정보',
                    style: 'subheader',
                    margin: [0, 10, 0, 10]
                },
                ...this.createSummaryContent(records),

                // 빈 공간
                { text: '', margin: [0, 20, 0, 0] },

                // 안내 문구
                {
                    text: '※ 이 문서는 건강 모니터링 시스템에서 자동으로 생성되었습니다.',
                    style: 'footer',
                    margin: [0, 20, 0, 0]
                },
                {
                    text: '※ 위험 수치가 지속되거나 악화되는 경우 즉시 의료진과 상담하시기 바랍니다.',
                    style: 'footer',
                    margin: [0, 5, 0, 0]
                }
            ],
            styles: {
                header: {
                    fontSize: 24,
                    bold: true,
                    color: '#2563eb'
                },
                subheader: {
                    fontSize: 14,
                    bold: true,
                    color: '#1e293b'
                },
                footer: {
                    fontSize: 10,
                    color: '#64748b',
                    italics: true
                }
            },
            defaultStyle: {
                fontSize: 10,
                font: 'NanumGothic'
            }
        };
    },

    /**
     * 테이블 본문 생성
     * @param {Array} records - 위험 기록 배열
     * @returns {Array} 테이블 행 배열
     */
    createTableBody(records) {
        const body = [
            // 헤더 행
            [
                { text: '날짜/시간', style: 'tableHeader', bold: true },
                { text: '센서', style: 'tableHeader', bold: true },
                { text: '측정값', style: 'tableHeader', bold: true },
                { text: '정상 범위', style: 'tableHeader', bold: true },
                { text: '위험 내용', style: 'tableHeader', bold: true }
            ]
        ];

        // 데이터 행 추가
        records.forEach(record => {
            const dateTime = this.getFormattedDateTime(record.time);
            const threshold = `${record.threshold.min} ~ ${record.threshold.max}`;

            body.push([
                { text: dateTime, fontSize: 9 },
                { text: record.sensor, fontSize: 9 },
                { text: record.value.toFixed(1), fontSize: 9, color: '#dc2626', bold: true },
                { text: threshold, fontSize: 9 },
                { text: record.riskType, fontSize: 9 }
            ]);
        });

        return body;
    },

    /**
     * 요약 정보 콘텐츠 생성
     * @param {Array} records - 위험 기록 배열
     * @returns {Array} 요약 콘텐츠 배열
     */
    createSummaryContent(records) {
        const summary = [];
        
        // 센서별 통계
        const sensorStats = {};
        records.forEach(record => {
            if (!sensorStats[record.sensor]) {
                sensorStats[record.sensor] = {
                    count: 0,
                    values: []
                };
            }
            sensorStats[record.sensor].count++;
            sensorStats[record.sensor].values.push(record.value);
        });

        Object.keys(sensorStats).forEach(sensor => {
            const stats = sensorStats[sensor];
            const avg = stats.values.reduce((a, b) => a + b, 0) / stats.values.length;
            const max = Math.max(...stats.values);
            const min = Math.min(...stats.values);

            summary.push({
                text: `${sensor}: ${stats.count}건 (평균: ${avg.toFixed(1)}, 최대: ${max.toFixed(1)}, 최소: ${min.toFixed(1)})`,
                fontSize: 10,
                margin: [0, 5, 0, 5]
            });
        });

        return summary;
    },

    /**
     * 날짜/시간 포맷팅
     * @param {Date} date - 날짜 객체
     * @returns {string} 포맷된 날짜/시간 문자열
     */
    getFormattedDateTime(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * 날짜 포맷팅 (파일명용)
     * @param {Date} date - 날짜 객체
     * @returns {string} 포맷된 날짜 문자열
     */
    getFormattedDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
};


