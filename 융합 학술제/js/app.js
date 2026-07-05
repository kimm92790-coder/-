/* ============================================
   건강 모니터링 시스템 - 메인 앱 로직
   목적: 건강 복지 격차 해소 (SDGs 3번 목표 기반)
   기능: 화면 전환 및 전반적인 앱 관리
   ============================================ */

/**
 * 메인 앱 객체
 * 화면 전환 및 전반적인 앱 상태 관리
 */
const app = {
    currentScreen: 'homeScreen',
    charts: {},

    /**
     * 앱 초기화
     */
    init() {
        console.log('건강 모니터링 시스템 초기화');
        // 모든 이미지 경로 수정 (Netlify 호환성)
        this.fixAllImagePaths();
        this.showScreen('homeScreen');
        heroSlider.init();
        sensorsManager.init();
        recordsManager.init();
        bluetoothManager.init();
        this.initEmergencyManager();
    },

    /**
     * 모든 이미지 경로 수정 (한글 파일명 URL 인코딩)
     */
    fixAllImagePaths() {
        const allImages = document.querySelectorAll('img[src^="images/"]');
        allImages.forEach(img => {
            const originalSrc = img.getAttribute('src');
            if (originalSrc) {
                const pathParts = originalSrc.split('/');
                const fileName = pathParts[pathParts.length - 1];
                // 한글이 포함된 파일명만 인코딩
                if (/[가-힣]/.test(fileName)) {
                    const encodedFileName = encodeURIComponent(fileName);
                    img.src = `images/${encodedFileName}`;
                    
                    // 이미지 로드 실패 시 원본 경로로 재시도
                    img.onerror = function() {
                        if (this.dataset.retried) return;
                        this.dataset.retried = 'true';
                        this.src = originalSrc;
                    };
                }
            }
        });
    },

    /**
     * 화면 전환 함수
     * @param {string} screenId - 표시할 화면 ID
     */
    showScreen(screenId) {
        // 모든 화면 숨기기
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // 선택한 화면 표시
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;

            // 화면별 초기화
            if (screenId === 'sensorsScreen') {
                sensorsManager.renderSensorList();
            } else if (screenId === 'recordsScreen') {
                recordsManager.renderRecords();
            }
        }
    },

    /**
     * 응급 대처 메뉴 관리자 초기화
     */
    initEmergencyManager() {
        window.emergencyManager = {
            toggleAccordion(button) {
                const item = button.closest('.accordion-item');
                const isActive = item.classList.contains('active');

                // 모든 아코디언 닫기
                document.querySelectorAll('.accordion-item').forEach(accItem => {
                    accItem.classList.remove('active');
                });

                // 클릭한 항목만 토글
                if (!isActive) {
                    item.classList.add('active');
                }
            }
        };
    }
};

/* ============================================
   메인 페이지 히어로 슬라이더
   목적: UNICEF 등 실제 현장 사진을 번갈아 보여주어
        의료 격차 문제를 시각적으로 전달
   ============================================ */

const heroSlider = {
    slides: [],
    dots: [],
    currentIndex: 0,
    intervalId: null,
    intervalMs: 5000,

    /**
     * 슬라이더 초기화
     */
    init() {
        const sliderEl = document.getElementById('heroSlider');
        if (!sliderEl) return;

        // 한글 파일명 이미지 경로 인코딩 처리 (Netlify 호환성)
        this.fixImagePaths(sliderEl);

        this.slides = Array.from(sliderEl.querySelectorAll('.hero-slide'));
        if (this.slides.length <= 1) return;

        const dotsContainer = sliderEl.querySelector('.hero-dots');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            this.dots = this.slides.map((_, index) => {
                const dot = document.createElement('button');
                dot.className = 'hero-dot';
                dot.type = 'button';
                dot.setAttribute('aria-label', `슬라이드 ${index + 1} 보기`);
                dot.addEventListener('click', () => {
                    this.goTo(index);
                    this.restartInterval();
                });
                dotsContainer.appendChild(dot);
                return dot;
            });
        }

        this.showSlide(0);
        this.startInterval();
    },

    /**
     * 특정 슬라이드 표시
     * @param {number} index - 슬라이드 인덱스
     */
    showSlide(index) {
        if (!this.slides.length) return;

        this.slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        this.currentIndex = index;
    },

    /**
     * 다음 슬라이드로 이동
     */
    next() {
        if (!this.slides.length) return;
        const nextIndex = (this.currentIndex + 1) % this.slides.length;
        this.showSlide(nextIndex);
    },

    /**
     * 지정한 슬라이드로 이동
     * @param {number} index
     */
    goTo(index) {
        if (index < 0 || index >= this.slides.length) return;
        this.showSlide(index);
    },

    /**
     * 자동 재생 시작
     */
    startInterval() {
        this.stopInterval();
        this.intervalId = setInterval(() => this.next(), this.intervalMs);
    },

    /**
     * 자동 재생 중지
     */
    stopInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    /**
     * 자동 재생 재시작
     */
    restartInterval() {
        this.startInterval();
    },

    /**
     * 이미지 경로 수정 (한글 파일명 URL 인코딩)
     * @param {HTMLElement} container - 슬라이더 컨테이너
     */
    fixImagePaths(container) {
        const images = container.querySelectorAll('img[src^="images/"]');
        images.forEach(img => {
            const originalSrc = img.getAttribute('src');
            if (originalSrc && originalSrc.includes('스크린샷')) {
                // 한글 파일명을 URL 인코딩
                const pathParts = originalSrc.split('/');
                const fileName = pathParts[pathParts.length - 1];
                const encodedFileName = encodeURIComponent(fileName);
                img.src = `images/${encodedFileName}`;
                
                // 이미지 로드 실패 시 원본 경로로 재시도
                img.onerror = function() {
                    this.onerror = null; // 무한 루프 방지
                    this.src = originalSrc; // 원본 경로로 재시도
                };
            }
        });
    }
};

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});


