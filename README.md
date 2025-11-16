# 멘토링 프로그램 시스템 (Google Apps Script)

> 🎓 Google Apps Script와 Google Sheets를 활용한 멘토-멘티 매칭 및 관리 시스템

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com/)

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [주요 기능](#-주요-기능)
- [시스템 아키텍처](#-시스템-아키텍처)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [사용 방법](#-사용-방법)
- [개발 가이드](#-개발-가이드)
- [트러블슈팅](#-트러블슈팅)
- [FAQ](#-faq)
- [참고 문서](#-참고-문서)

---

## 🎯 프로젝트 개요

### 배경

대학이나 기관에서 멘토링 프로그램을 운영할 때 다음과 같은 문제들이 발생합니다:

- 멘토가 제공하는 다양한 프로그램을 효율적으로 관리하기 어려움
- 멘티의 신청을 수기로 처리하면 시간이 많이 소요됨
- 실시간 신청 현황 파악이 어려움
- 정원 관리와 중복 신청 방지가 복잡함
- 별도의 웹 서버나 데이터베이스 구축에 비용과 시간이 소요됨

### 솔루션

이 프로젝트는 **Google Apps Script**와 **Google Sheets**만으로 위 문제들을 해결합니다:

- ✅ **무료**: Google 계정만 있으면 즉시 사용 가능
- ✅ **서버리스**: 별도의 서버 관리 불필요
- ✅ **실시간 동기화**: Google Sheets와 자동 연동
- ✅ **웹 UI 제공**: 멘티 신청, 멘토 조회, 관리자 대시보드
- ✅ **쉬운 배포**: 클릭 몇 번으로 웹앱 배포 완료

### 사용 사례

이 시스템은 다음과 같은 상황에서 활용할 수 있습니다:

- 대학 신입생 멘토링 프로그램
- 학과/학회 선후배 매칭
- 기업 온보딩 멘토링
- 세미나/워크샵 참가 신청
- 소규모 이벤트 등록 관리

---

## ✨ 주요 기능

### 1. 멘티 신청 페이지 (`index.html`)

멘티가 멘토링 프로그램을 검색하고 신청할 수 있는 페이지입니다.

**기능:**
- 📅 프로그램 목록 조회 (날짜, 멘토, 내용별 필터링)
- 📝 온라인 신청서 작성 (학번, 이름, 학과, 연락처 등)
- ⏰ 신청 기간 자동 확인 (기간 외 신청 차단)
- 🔒 중복 신청 방지 (멘티당 최대 신청 개수 제한)
- ✅ 개인정보 동의 처리
- 🎫 신청 완료 시 자동 확인 메시지

### 2. 신청 현황 조회 페이지 (`status.html`)

멘티가 자신의 신청 내역을 확인할 수 있는 페이지입니다.

**기능:**
- 🔍 학번으로 신청 내역 조회
- 📊 신청한 프로그램 상세 정보 확인
- 🗑️ 신청 취소 기능
- 📈 실시간 신청 상태 업데이트

### 3. 멘토 조회 페이지 (`mentor.html`)

멘토가 자신의 프로그램 신청자를 확인할 수 있는 페이지입니다.

**기능:**
- 👥 프로그램별 신청자 목록 조회
- 📞 신청자 연락처 정보 확인
- 📊 프로그램별 신청 현황 통계
- 📄 엑셀 다운로드 가능

### 4. 관리자 대시보드 (`admin.html`)

시스템 전체를 관리하는 관리자 페이지입니다.

**기능:**
- 🔑 PIN 인증 기반 접근 제어
- 📊 전체 신청 통계 대시보드
- 📅 신청 기간 설정 (시작일시/종료일시)
- 🔄 Google Forms 응답 데이터 동기화
- 📈 신청 결과 요약 시트 생성
- 👥 정원 미달 프로그램 신청자 명단 추출
- 🗑️ 캐시 관리 및 시스템 초기화

---

## 🏗 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         사용자                               │
│  (멘티, 멘토, 관리자)                                         │
└────────────┬────────────────────────────────┬────────────────┘
             │                                │
             ▼                                ▼
┌────────────────────────┐      ┌────────────────────────────┐
│   웹 브라우저          │      │   모바일 브라우저           │
│                        │      │                            │
└────────────┬───────────┘      └─────────────┬──────────────┘
             │                                │
             └────────────────┬───────────────┘
                              │
                              ▼
             ┌────────────────────────────────┐
             │   Google Apps Script Web App   │
             │   (doGet, API Endpoints)       │
             └────────────┬───────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│   Code.gs     │  │  Admin.gs    │  │ DataManager  │
│ (진입점/설정) │  │ (관리기능)    │  │   .gs        │
└───────────────┘  └──────────────┘  │ (데이터 접근)│
        │                 │           └──────┬───────┘
        │                 │                  │
        └─────────────────┴──────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  Validation.gs       │
               │  (비즈니스 로직)      │
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │   Google Sheets      │
               │   (데이터베이스)      │
               └──────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 프로그램목록  │  │  신청현황    │  │   설정       │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 데이터 흐름

1. **멘토 응답 수집**: Google Forms → `응답` 시트
2. **데이터 동기화**: 관리자가 동기화 버튼 클릭 → `syncFormsToPrograms()` 실행
3. **프로그램 목록 생성**: `응답` 시트 → `프로그램목록` 시트
4. **멘티 신청**: 웹 UI → `Validation.gs` → `신청현황` 시트
5. **통계 생성**: 관리자 대시보드 → `Admin.gs` → `신청결과요약` 시트

### 인증 및 권한

```
┌─────────────┬──────────────┬───────────────────────┐
│   사용자    │    인증방식   │      접근 권한        │
├─────────────┼──────────────┼───────────────────────┤
│   멘티      │   없음       │  신청, 조회, 취소     │
│   멘토      │   학번       │  자기 프로그램 조회   │
│  관리자     │   PIN        │  전체 관리 권한       │
└─────────────┴──────────────┴───────────────────────┘
```

---

## 🛠 기술 스택

### 백엔드

- **Google Apps Script** (JavaScript ES5+): 서버리스 실행 환경
- **Google Sheets API**: 데이터 저장 및 조회
- **CacheService**: 성능 최적화를 위한 캐싱
- **PropertiesService**: 환경 변수 및 비밀 정보 관리

### 프론트엔드

- **HTML5**: 시맨틱 마크업
- **CSS3**: 반응형 디자인
- **Vanilla JavaScript**: DOM 조작 및 AJAX 통신
- **Google Apps Script HTML Service**: 템플릿 렌더링

### 데이터 저장

- **Google Sheets**: NoSQL 형태의 데이터베이스
  - 각 시트 = 테이블
  - 각 행 = 레코드
  - 각 열 = 필드

### 의존성

- ✅ 외부 라이브러리 **없음**
- ✅ CDN 의존성 **없음**
- ✅ 순수 Google Apps Script 플랫폼만 사용

---

## 🚀 시작하기

### 사전 요구사항

시작하기 전에 다음을 준비하세요:

- [ ] Google 계정 (Gmail)
- [ ] Google Drive 접근 권한
- [ ] Chrome, Firefox, Safari 등 최신 웹 브라우저
- [ ] 기본적인 스프레드시트 사용 경험

**필요 없는 것:**
- ❌ 프로그래밍 경험
- ❌ 웹 서버
- ❌ 데이터베이스 서버
- ❌ 신용카드 (완전 무료)

---

### 설치 및 배포 (Step-by-Step)

#### STEP 1: Google Sheets 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. **새 스프레드시트 만들기** 클릭
3. 스프레드시트 이름을 `멘토링 프로그램 시스템`으로 변경
4. 다음 시트들을 **정확히 이 이름**으로 생성하세요:

| 시트명 | 생성 방법 | 용도 |
|--------|----------|------|
| `프로그램목록` | 새 시트 추가 | 멘토가 제공하는 프로그램 목록 |
| `신청현황` | 새 시트 추가 | 멘티의 신청 기록 |
| `설정` | 새 시트 추가 | 시스템 설정 (신청 기간 등) |
| `응답` | 새 시트 추가 | Google Forms 원본 데이터 |
| `신청결과요약` | 새 시트 추가 | 관리자용 통계 |
| `미개설프로그램신청자` | 새 시트 추가 | 정원 미달 프로그램 지원자 |

5. 스프레드시트 URL에서 **스프레드시트 ID** 복사:
   ```
   https://docs.google.com/spreadsheets/d/[이_부분이_ID]/edit
   ```

#### STEP 2: 시트별 헤더 설정

각 시트의 첫 번째 행(헤더)에 다음 내용을 입력하세요:

**`프로그램목록` 시트:**
```
프로그램ID | 멘토학번 | 멘토이름 | 멘토이메일 | 날짜 | 시작시간 | 종료시간 | 장소 | 내용 | 현재신청인원
```

**`신청현황` 시트:**
```
신청ID | 학번 | 이름 | 학과 | 이메일 | 전화번호 | 개인정보동의 | 프로그램ID | 상태 | 신청시각
```

**`설정` 시트:**
```
설정키 | 값
```

그 아래에 기본 설정을 입력하세요:
```
신청시작일시 | 2025-09-15 00:00
신청종료일시 | 2025-09-19 23:59
프로그램당정원 | 7
멘티당최대신청 | 3
```

**`응답` 시트:**

Google Forms와 연동할 예정이므로 일단 비워두세요.

**`신청결과요약` 및 `미개설프로그램신청자` 시트:**

관리자 대시보드에서 자동 생성되므로 비워두세요.

#### STEP 3: Apps Script 프로젝트 생성

1. 생성한 스프레드시트에서 **확장 프로그램 > Apps Script** 클릭
2. Apps Script 에디터가 새 탭에서 열립니다
3. 기본으로 생성된 `Code.gs` 파일의 내용을 **모두 삭제**하고,
   이 GitHub 저장소의 [`Code.gs`](./Code.gs) 파일 내용을 복사해서 붙여넣습니다

4. 좌측 `+` 버튼을 클릭하여 다음 파일들을 추가하고 내용을 붙여넣습니다:

| 파일명 | 타입 | GitHub 파일 |
|--------|------|------------|
| `DataManager.gs` | 스크립트 | [`DataManager.gs`](./DataManager.gs) |
| `Validation.gs` | 스크립트 | [`Validation.gs`](./Validation.gs) |
| `Admin.gs` | 스크립트 | [`Admin.gs`](./Admin.gs) |
| `index.html` | HTML | [`index.html`](./index.html) |
| `mentor.html` | HTML | [`mentor.html`](./mentor.html) |
| `admin.html` | HTML | [`admin.html`](./admin.html) |
| `status.html` | HTML | [`status.html`](./status.html) |
| `common.html` | HTML | [`common.html`](./common.html) |
| `styles.html` | HTML | [`styles.html`](./styles.html) |

5. 모든 파일을 추가했으면 **저장** 버튼 클릭 (💾)

#### STEP 4: Script Properties 설정

1. Apps Script 에디터에서 **프로젝트 설정** (⚙️) 클릭
2. **스크립트 속성** 탭 선택
3. **스크립트 속성 추가** 클릭
4. 다음 두 개의 속성을 추가하세요:

| 속성 | 값 | 설명 |
|------|-----|------|
| `SPREADSHEET_ID` | (STEP 1에서 복사한 ID) | 스프레드시트 ID |
| `ADMIN_PIN` | `0000` | 관리자 PIN (나중에 변경 필수) |

5. **저장** 클릭

#### STEP 5: 권한 승인

1. Apps Script 에디터 상단에서 실행할 함수로 `warmup` 선택
2. **실행** 버튼 클릭
3. "권한이 필요합니다" 팝업이 나타나면:
   - **권한 검토** 클릭
   - Google 계정 선택
   - **고급** 클릭
   - **[프로젝트명](안전하지 않은 페이지)로 이동** 클릭
   - **허용** 클릭

#### STEP 6: Web App 배포

1. Apps Script 에디터 우측 상단 **배포 > 새 배포** 클릭
2. **유형 선택** 옆 ⚙️ 클릭 → **웹 앱** 선택
3. 배포 설정:
   - **설명**: "멘토링 시스템 v1.0"
   - **다음 계정으로 실행**: **나**
   - **액세스 권한**: **모든 사용자** (조직 내부만 사용하려면 "조직 내 모든 사용자" 선택)
4. **배포** 클릭
5. **웹 앱 URL** 복사 (예: `https://script.google.com/macros/s/AKfycbz.../exec`)

🎉 **완료!** 이 URL로 접속하면 멘티 신청 페이지가 나타납니다.

#### STEP 7: 페이지별 URL 생성

기본 URL에 쿼리 파라미터를 추가하여 각 페이지에 접근할 수 있습니다:

| 페이지 | URL | 대상 |
|--------|-----|------|
| 멘티 신청 | `https://...exec?page=apply` | 멘티 |
| 신청 현황 조회 | `https://...exec?page=status` | 멘티 |
| 멘토 조회 | `https://...exec?page=mentor` | 멘토 |
| 관리자 대시보드 | `https://...exec?page=admin` | 관리자 |

#### STEP 8: 초기 테스트

1. 관리자 페이지 (`?page=admin`) 접속
2. PIN: `0000` 입력하여 로그인
3. **"Forms 데이터 동기화"** 버튼 클릭 (아직 데이터가 없어도 OK)
4. 멘티 신청 페이지 (`?page=apply`)로 이동
5. 신청 기간 메시지가 표시되는지 확인

---

### 초기 설정

#### 신청 기간 설정

관리자 대시보드에서:

1. PIN으로 로그인
2. **신청 기간 설정** 섹션에서 시작일시와 종료일시 입력
3. **저장** 클릭

또는 Google Sheets의 `설정` 시트에서 직접 수정할 수도 있습니다.

#### 관리자 PIN 변경

**보안을 위해 반드시 변경하세요!**

1. Apps Script 에디터에서 **프로젝트 설정** 클릭
2. **스크립트 속성** 탭에서 `ADMIN_PIN` 값을 원하는 PIN으로 변경
3. **저장** 클릭

#### Google Forms 연동 (선택사항)

멘토가 프로그램 정보를 Google Forms로 제출하도록 설정할 수 있습니다:

1. Google Forms 생성 (멘토 정보, 프로그램 정보 입력 필드)
2. Forms 응답을 스프레드시트의 `응답` 시트와 연결
3. 관리자 대시보드에서 **"Forms 데이터 동기화"** 버튼 클릭
4. `프로그램목록` 시트에 자동으로 데이터가 채워집니다

---

## 📁 프로젝트 구조

### 디렉터리 구조

```
mentoringProject/
├── Code.gs                           # 진입점, 전역 설정, 헬퍼 함수
├── DataManager.gs                    # 데이터 접근 레이어 (시트 캐싱)
├── Validation.gs                     # 비즈니스 로직 (신청 검증, CRUD)
├── Admin.gs                          # 관리자 기능 (대시보드, 통계)
│
├── index.html                        # 멘티 신청 페이지
├── status.html                       # 신청 현황 조회 페이지
├── mentor.html                       # 멘토 조회 페이지
├── admin.html                        # 관리자 대시보드
├── common.html                       # 공통 JavaScript 함수
├── styles.html                       # 공통 CSS 스타일
│
├── data-sample/                      # 샘플 데이터 (익명화됨)
│   ├── 프로그램목록.sample.csv
│   ├── 신청현황.sample.csv
│   ├── 설정.sample.csv
│   ├── 응답.sample.csv
│   ├── 신청결과요약.sample.csv
│   └── README.md
│
├── CHANGELOG.md                      # 변경 이력
├── LESSON_LEARNED.md                 # 프로젝트 회고
├── CRITICAL-LIMITATIONS.md           # 시스템 제약사항
├── bjt-object-orientation.md         # 설계 원칙
├── CLAUDE.md                         # AI 어시스턴트 활용 기록
├── 시스템_구현_계획서.md              # 초기 계획서
├── 초기 설정 및 테스트.md             # 설정 가이드
│
├── .gitignore                        # Git 제외 파일 목록
└── README.md                         # 이 파일
```

### 파일별 상세 설명

#### 백엔드 (Apps Script)

##### `Code.gs` - 진입점 및 전역 설정

**주요 함수:**
- `doGet(e)`: 웹 앱 진입점, 페이지 라우팅
- `getSpreadsheetId()`: 스프레드시트 ID 조회 (Script Properties 우선)
- `checkApplicationPeriod()`: 신청 기간 확인
- `getApplicationSettings()`: 신청 설정 조회
- `syncFormsToPrograms()`: Google Forms 데이터 동기화
- `warmup()`: 캐시 웜업 (성능 최적화)
- `setupWarmupTrigger()`: 10분 주기 웜업 트리거 설정

**전역 상수:**
```javascript
SPREADSHEET_ID          // 스프레드시트 ID (기본값)
DEFAULT_TIMEZONE        // 기본 시간대 (Asia/Seoul)
PROGRAM_MAX_CAPACITY    // 프로그램 최대 정원
```

##### `DataManager.gs` - 데이터 접근 레이어

**주요 함수:**
- `getSheetData_(sheetName)`: 시트 데이터 조회 (캐싱)
- `invalidateSheetCache_(sheetName)`: 캐시 무효화
- `getCachedPrograms()`: 프로그램 목록 조회
- `getCachedApplications()`: 신청 내역 조회
- `getAvailablePrograms()`: 신청 가능한 프로그램 조회

**캐싱 전략:**
- `CacheService.getScriptCache()` 사용
- TTL: 300초 (5분)
- 수동 무효화 지원

##### `Validation.gs` - 비즈니스 로직

**주요 함수:**
- `validateApplication(data)`: 신청 유효성 검증
- `createApplication(data)`: 신청 생성
- `cancelApplication(applicationId)`: 신청 취소
- `checkDuplicateApplication(studentId, programId)`: 중복 확인
- `checkMaxApplications(studentId)`: 최대 신청 개수 확인

**검증 규칙:**
1. 신청 기간 내 신청인지 확인
2. 프로그램 정원 초과 여부 확인
3. 중복 신청 여부 확인
4. 멘티당 최대 신청 개수 확인
5. 필수 필드 누락 여부 확인
6. 개인정보 동의 여부 확인

##### `Admin.gs` - 관리자 기능

**주요 함수:**
- `verifyAdminPin(pin)`: 관리자 PIN 검증
- `getAdminDashboard()`: 대시보드 데이터 조회
- `generateSummarySheet()`: 신청 결과 요약 시트 생성
- `exportUnderEnrolledPrograms()`: 정원 미달 프로그램 추출
- `updateAdminPin(newPin)`: 관리자 PIN 변경

#### 프론트엔드 (HTML)

##### `index.html` - 멘티 신청 페이지

**구조:**
```html
<신청 기간 안내>
<프로그램 검색/필터>
<프로그램 카드 목록>
<신청 모달>
```

**주요 기능:**
- 프로그램 실시간 검색 (날짜, 멘토, 내용)
- 신청서 모달 팝업
- 폼 유효성 검사
- 비동기 신청 처리

##### `status.html` - 신청 현황 조회

**구조:**
```html
<학번 입력 폼>
<신청 내역 테이블>
<취소 버튼>
```

##### `mentor.html` - 멘토 조회 페이지

**구조:**
```html
<학번 입력 폼>
<프로그램별 신청자 목록>
<통계 정보>
```

##### `admin.html` - 관리자 대시보드

**구조:**
```html
<PIN 로그인>
<통계 대시보드>
<신청 기간 설정>
<데이터 동기화>
<시스템 관리>
```

##### `common.html` - 공통 JavaScript

클라이언트-서버 통신을 위한 헬퍼 함수:

```javascript
callServer(functionName, ...args)  // Apps Script 함수 호출
showLoading()                      // 로딩 스피너 표시
hideLoading()                      // 로딩 스피너 숨김
showError(message)                 // 에러 메시지 표시
showSuccess(message)               // 성공 메시지 표시
```

##### `styles.html` - 공통 CSS

반응형 디자인:
- 모바일 우선 (Mobile First)
- 브레이크포인트: 768px, 1024px
- Flexbox 레이아웃
- 접근성 고려 (키보드 네비게이션, ARIA 속성)

---

## 📖 사용 방법

### 멘티 사용 가이드

#### 1. 프로그램 신청하기

1. 멘티 신청 페이지 접속 (`?page=apply`)
2. 신청 기간 확인 (기간 외에는 신청 불가)
3. 프로그램 목록에서 원하는 프로그램 찾기
   - 검색창으로 멘토 이름, 내용 검색
   - 날짜별 필터 사용
4. **"신청하기"** 버튼 클릭
5. 신청서 작성:
   - 학번 (필수)
   - 이름 (필수)
   - 학과 (필수)
   - 이메일 (필수)
   - 전화번호 (필수)
   - 개인정보 동의 (필수)
6. **"신청 완료"** 클릭
7. 신청 ID 확인 및 저장

#### 2. 신청 내역 조회하기

1. 신청 현황 조회 페이지 접속 (`?page=status`)
2. 학번 입력
3. **"조회"** 클릭
4. 신청한 프로그램 목록 확인

#### 3. 신청 취소하기

1. 신청 현황 조회 페이지에서 학번 조회
2. 취소하려는 프로그램의 **"취소"** 버튼 클릭
3. 확인 메시지 클릭
4. 취소 완료 메시지 확인

### 멘토 사용 가이드

#### 1. 프로그램 신청자 확인하기

1. 멘토 조회 페이지 접속 (`?page=mentor`)
2. 자신의 학번 입력
3. **"조회"** 클릭
4. 프로그램별 신청자 목록 확인:
   - 신청자 이름
   - 학과
   - 연락처 (이메일, 전화번호)
   - 신청 시각

#### 2. 통계 확인하기

대시보드에서 다음 정보를 확인할 수 있습니다:
- 프로그램별 신청자 수
- 정원 대비 신청률
- 미달 프로그램 목록

### 관리자 사용 가이드

#### 1. 관리자 페이지 로그인

1. 관리자 대시보드 접속 (`?page=admin`)
2. 관리자 PIN 입력 (기본값: 0000)
3. **"로그인"** 클릭

#### 2. 전체 통계 확인

로그인 후 대시보드에서 확인 가능한 정보:
- 📊 전체 프로그램 수
- 👥 전체 신청자 수
- 📈 평균 신청률
- 🔥 인기 프로그램 TOP 5
- ⚠️ 정원 미달 프로그램

#### 3. 신청 기간 설정

1. **"신청 기간 설정"** 섹션으로 스크롤
2. 시작일시 입력 (예: `2025-09-15T00:00`)
3. 종료일시 입력 (예: `2025-09-19T23:59`)
4. **"저장"** 클릭
5. 확인 메시지 확인

#### 4. Google Forms 데이터 동기화

멘토가 Google Forms로 프로그램 정보를 제출한 경우:

1. **"Forms 데이터 동기화"** 버튼 클릭
2. 처리 중 메시지 대기
3. 동기화된 프로그램 개수 확인
4. `프로그램목록` 시트에서 데이터 확인

#### 5. 신청 결과 요약 생성

1. **"신청 결과 요약 생성"** 버튼 클릭
2. `신청결과요약` 시트 자동 생성/업데이트
3. 시트에서 프로그램별 통계 확인

#### 6. 정원 미달 프로그램 추출

1. **"정원 미달 프로그램 신청자 추출"** 버튼 클릭
2. `미개설프로그램신청자` 시트 자동 생성
3. 시트에서 해당 멘티들에게 알림 발송

#### 7. 시스템 캐시 초기화

데이터가 제대로 업데이트되지 않을 때:

1. **"캐시 초기화"** 버튼 클릭
2. 확인 메시지 확인
3. 페이지 새로고침

---

## 💻 개발 가이드

### 로컬 개발 환경 설정 (clasp 사용)

Google Apps Script를 로컬에서 개발하려면 `clasp` CLI를 사용하세요:

```bash
# Node.js와 npm 설치 후
npm install -g @google/clasp

# Google 로그인
clasp login

# 기존 프로젝트 클론
clasp clone [SCRIPT_ID]

# 또는 새 프로젝트 생성
clasp create --type sheets --title "멘토링 시스템"

# 코드 수정 후 푸시
clasp push

# 로그 확인
clasp logs
```

### 새로운 기능 추가하기

#### 예제: 신청 승인/거절 기능 추가

**1. 백엔드 함수 추가 (`Validation.gs`):**

```javascript
function approveApplication(applicationId) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = ss.getSheetByName(SHEETS.APPLICATIONS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === applicationId) {
      sheet.getRange(i + 1, 9).setValue('승인완료');
      invalidateSheetCache_('신청현황');
      return { success: true };
    }
  }
  
  return { success: false, message: '신청 내역을 찾을 수 없습니다.' };
}
```

**2. 프론트엔드 버튼 추가 (`admin.html`):**

```html
<button onclick="approveApplication('APP001')">승인</button>

<script>
function approveApplication(appId) {
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        alert('승인되었습니다.');
        location.reload();
      } else {
        alert(result.message);
      }
    })
    .withFailureHandler(function(error) {
      alert('오류: ' + error.message);
    })
    .approveApplication(appId);
}
</script>
```

### 데이터베이스 스키마 수정

새로운 컬럼을 추가하려면:

1. Google Sheets에서 해당 시트에 컬럼 추가
2. `DataManager.gs`의 데이터 파싱 로직 수정
3. `Validation.gs`의 검증 로직 업데이트
4. HTML 폼에 입력 필드 추가

### 성능 최적화 팁

#### 1. 캐싱 활용

```javascript
function getCachedData() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('my_data');
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = fetchExpensiveData();
  cache.put('my_data', JSON.stringify(data), 300); // 5분
  return data;
}
```

#### 2. 배치 처리

```javascript
// 나쁜 예: 루프 내 개별 쓰기
for (let i = 0; i < 100; i++) {
  sheet.getRange(i + 2, 1).setValue(data[i]);
}

// 좋은 예: 한 번에 쓰기
sheet.getRange(2, 1, data.length, 1).setValues(data.map(d => [d]));
```

#### 3. 조건부 읽기

```javascript
// 전체 시트 대신 필요한 범위만 읽기
const lastRow = sheet.getLastRow();
const range = sheet.getRange(2, 1, lastRow - 1, 10);
```

### 보안 고려사항

#### 1. 민감정보 보호

```javascript
// ❌ 나쁜 예: 하드코딩
const API_KEY = 'abc123xyz';

// ✅ 좋은 예: Script Properties 사용
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
```

#### 2. 입력 검증

```javascript
function createApplication(data) {
  // 항상 입력값 검증
  if (!data.studentId || !/^\d{9}$/.test(data.studentId)) {
    throw new Error('잘못된 학번 형식입니다.');
  }
  
  // XSS 방어: HTML 이스케이프
  const safeName = escapeHtml(data.name);
  
  // ...
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

#### 3. 권한 관리

```javascript
function verifyAdmin(pin) {
  const adminPin = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  
  if (pin !== adminPin) {
    throw new Error('권한이 없습니다.');
  }
}

function getAdminData(pin) {
  verifyAdmin(pin); // 항상 먼저 검증
  // ... 민감한 데이터 조회
}
```

---

## 🔧 트러블슈팅

### 자주 발생하는 문제

#### 1. "권한이 거부되었습니다" 오류

**증상:** 웹 앱 접속 시 권한 오류 발생

**해결 방법:**
1. Apps Script 에디터에서 `warmup` 함수 실행
2. 권한 승인 화면에서 **허용** 클릭
3. 배포를 다시 생성: **배포 > 새 배포**

#### 2. 데이터가 표시되지 않음

**증상:** 프로그램 목록이 비어있음

**해결 방법:**
1. Google Sheets에서 `프로그램목록` 시트 데이터 확인
2. 관리자 대시보드에서 **"캐시 초기화"** 클릭
3. Script Properties에 `SPREADSHEET_ID`가 올바르게 설정되었는지 확인
4. 시트 이름이 정확히 일치하는지 확인 (대소문자, 공백 주의)

#### 3. "신청 기간이 아닙니다" 메시지

**증상:** 신청 기간인데도 신청 불가

**해결 방법:**
1. Google Sheets의 `설정` 시트 확인
2. `신청시작일시`와 `신청종료일시` 값 확인
3. 날짜 형식: `YYYY-MM-DD HH:mm`
4. 시간대가 `Asia/Seoul`로 설정되어 있는지 확인

#### 4. "캐시에서 시트 데이터를 찾을 수 없습니다" 오류

**증상:** `DataManager.gs`에서 오류 발생

**해결 방법:**
1. Apps Script 에디터에서 `invalidateAllCaches()` 함수 실행:
```javascript
function invalidateAllCaches() {
  const cache = CacheService.getScriptCache();
  cache.removeAll(['programs_list', 'applications_list', 'admin_dashboard']);
}
```
2. 시트 이름이 `SHEETS` 상수와 일치하는지 확인

#### 5. 신청 완료 후 `프로그램목록` 시트의 `현재신청인원`이 업데이트되지 않음

**증상:** 신청은 되지만 인원 카운트가 증가하지 않음

**해결 방법:**
1. 관리자 대시보드에서 **"Forms 데이터 동기화"** 클릭
2. 또는 Apps Script 에디터에서 `syncFormsToPrograms()` 함수 실행

#### 6. "배포를 찾을 수 없습니다" 오류

**증상:** 배포 URL 접속 시 오류

**해결 방법:**
1. Apps Script 에디터에서 **배포 > 배포 관리** 클릭
2. 활성 배포가 있는지 확인
3. 없으면 **새 배포** 생성
4. URL을 다시 복사하여 사용

#### 7. 모바일에서 레이아웃이 깨짐

**증상:** 스마트폰에서 UI가 제대로 표시되지 않음

**해결 방법:**
1. `styles.html`에 반응형 CSS가 포함되어 있는지 확인
2. 브라우저 캐시 삭제 후 새로고침
3. 크롬 개발자 도구의 모바일 시뮬레이터로 테스트

#### 8. "실행 시간 초과" 오류

**증상:** 대량의 데이터 처리 시 6분 제한 초과

**해결 방법:**
1. 배치 크기 축소 (한 번에 처리하는 행 수 줄이기)
2. 불필요한 루프 제거
3. `getValues()` / `setValues()` 사용하여 배치 처리
4. 필요시 Time-driven Trigger로 분할 실행

### 로그 확인 방법

#### Apps Script 실행 로그

1. Apps Script 에디터 좌측 **실행** 아이콘 (▶) 클릭
2. 최근 실행 내역 확인
3. 오류 메시지 클릭하여 상세 정보 확인

#### 커스텀 로깅

코드에 로그 추가:

```javascript
function debugFunction() {
  console.log('디버그 시작');
  console.log('변수 값:', myVariable);
  
  try {
    // 코드 실행
  } catch (e) {
    console.error('오류 발생:', e.message);
    console.error('스택 트레이스:', e.stack);
  }
}
```

### 성능 문제

#### 느린 응답 속도

**해결 방법:**
1. **Warmup 트리거 설정**: `setupWarmupTrigger()` 실행
2. **캐시 활용**: `CacheService` 적극 사용
3. **배치 처리**: `getValues()` / `setValues()` 사용
4. **불필요한 시트 접근 최소화**

---

## ❓ FAQ

### 일반 질문

**Q1. 이 시스템을 사용하는 데 비용이 드나요?**

A: 아니요, 완전히 무료입니다. Google 계정만 있으면 사용 가능합니다. 다만, Google Apps Script의 [할당량 한도](https://developers.google.com/apps-script/guides/services/quotas)가 적용됩니다.

**Q2. 몇 명까지 사용할 수 있나요?**

A: 일일 URL 조회 한도는 개인 계정 기준 20,000회입니다. 학교나 조직의 경우 충분한 규모입니다.

**Q3. 모바일에서도 사용할 수 있나요?**

A: 네, 모든 페이지가 반응형으로 디자인되어 스마트폰, 태블릿에서도 잘 작동합니다.

**Q4. 다른 학교/기관에서도 사용할 수 있나요?**

A: 네, 이 프로젝트는 MIT 라이선스로 공개되어 있어 자유롭게 사용, 수정, 배포할 수 있습니다.

### 기술 질문

**Q5. Google Sheets를 데이터베이스로 사용해도 괜찮나요?**

A: 소규모~중규모 프로젝트에는 충분합니다. 다만 다음 제약사항이 있습니다:
- 시트당 최대 500만 셀
- 동시 접속 제한 (초당 100회 읽기/쓰기)
- 복잡한 쿼리나 JOIN 불가

자세한 내용은 [`CRITICAL-LIMITATIONS.md`](./CRITICAL-LIMITATIONS.md)를 참고하세요.

**Q6. 다른 데이터베이스(MySQL, MongoDB 등)와 연동할 수 있나요?**

A: 네, Apps Script에서 외부 API를 호출할 수 있습니다. `UrlFetchApp.fetch()`를 사용하여 REST API와 통신할 수 있습니다.

**Q7. 이메일 알림 기능을 추가할 수 있나요?**

A: 네, `GmailApp` 또는 `MailApp` 서비스를 사용하여 이메일을 발송할 수 있습니다:

```javascript
function sendNotification(email, message) {
  GmailApp.sendEmail(email, '멘토링 신청 알림', message);
}
```

**Q8. 결제 기능을 추가할 수 있나요?**

A: Apps Script 자체에는 결제 기능이 없지만, 외부 결제 API (Stripe, PayPal 등)와 연동할 수 있습니다.

### 운영 질문

**Q9. 신청 마감 후 데이터를 백업하려면?**

A: Google Sheets에서 **파일 > 사본 만들기**로 백업하거나, CSV로 다운로드하세요.

**Q10. 멘토/멘티에게 자동으로 알림을 보낼 수 있나요?**

A: 네, Time-driven Trigger를 사용하여 자동화할 수 있습니다:

1. Apps Script 에디터에서 **트리거** 아이콘 클릭
2. **트리거 추가** 클릭
3. 실행할 함수 선택 (예: `sendDailyNotifications`)
4. 이벤트 소스: **시간 기반**
5. 시간 간격 선택 (매일, 매주 등)

**Q11. 관리자 PIN을 잊어버렸어요!**

A: Apps Script 에디터에서:
1. **프로젝트 설정** 클릭
2. **스크립트 속성** 탭에서 `ADMIN_PIN` 값 확인 또는 변경

**Q12. Google Forms 없이 사용할 수 있나요?**

A: 네, `프로그램목록` 시트에 직접 데이터를 입력하면 됩니다. Google Forms는 선택사항입니다.

---

## 📚 참고 문서

### 프로젝트 문서

- [`CHANGELOG.md`](./CHANGELOG.md): 버전별 변경 이력
- [`LESSON_LEARNED.md`](./LESSON_LEARNED.md): 프로젝트 회고 및 배운 점
- [`CRITICAL-LIMITATIONS.md`](./CRITICAL-LIMITATIONS.md): 시스템 제약사항 및 한계
- [`bjt-object-orientation.md`](./bjt-object-orientation.md): 객체지향 설계 원칙
- [`CLAUDE.md`](./CLAUDE.md): AI 어시스턴트 활용 기록
- [`시스템_구현_계획서.md`](./시스템_구현_계획서.md): 초기 시스템 설계 문서
- [`초기 설정 및 테스트.md`](./초기 설정 및 테스트.md): 초기 설정 가이드

### 외부 리소스

#### Google Apps Script

- [Apps Script 공식 문서](https://developers.google.com/apps-script)
- [Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet)
- [HTML Service](https://developers.google.com/apps-script/guides/html)
- [Cache Service](https://developers.google.com/apps-script/reference/cache)
- [Properties Service](https://developers.google.com/apps-script/reference/properties)

#### 튜토리얼

- [Apps Script 시작하기](https://developers.google.com/apps-script/overview)
- [웹 앱 만들기](https://developers.google.com/apps-script/guides/web)
- [Clasp CLI 사용법](https://github.com/google/clasp)

#### 커뮤니티

- [Stack Overflow - google-apps-script 태그](https://stackoverflow.com/questions/tagged/google-apps-script)
- [Google Apps Script Community](https://groups.google.com/forum/#!forum/google-apps-script-community)

---

## 🤝 기여 가이드

이 프로젝트는 오픈소스입니다! 기여를 환영합니다.

### 기여 방법

1. **Fork** 이 저장소
2. **Feature 브랜치** 생성 (`git checkout -b feature/amazing-feature`)
3. **변경사항 커밋** (`git commit -m 'feat: Add amazing feature'`)
4. **브랜치에 푸시** (`git push origin feature/amazing-feature`)
5. **Pull Request** 생성

### 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 사용:

- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `style:` 코드 포맷팅
- `refactor:` 리팩토링
- `test:` 테스트 추가
- `chore:` 빌드/설정 변경

### 코드 스타일

- **들여쓰기**: 2 스페이스
- **따옴표**: 작은따옴표 (`'`) 사용
- **세미콜론**: 항상 사용
- **변수명**: camelCase
- **함수명**: camelCase (private 함수는 `_`로 끝남)
- **상수**: UPPER_SNAKE_CASE

---

## 📄 라이선스

이 프로젝트는 **MIT License**로 배포됩니다.

```
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 감사의 말

이 프로젝트는 다음 기술과 도구를 사용합니다:

- **Google Apps Script** - 서버리스 실행 환경
- **Google Sheets** - 데이터 저장소
- **Claude AI (Anthropic)** - 개발 지원

---

## 📧 연락처

프로젝트에 대한 질문이나 제안이 있으시면:

- **Email**: [bjt0709@gmail.com](mailto:bjt0709@gmail.com)

---

## ⚠️ 면책 조항

> **민감정보 주의**
>
> 이 저장소에는 실제 개인정보가 포함되어 있지 않습니다. `data-sample/` 디렉터리의 모든 데이터는 익명화된 샘플입니다.
>
> 실제 운영 시에는 반드시:
> - 스프레드시트 ID를 Script Properties에 저장하세요
> - 관리자 PIN을 변경하세요
> - 개인정보 보호 정책을 준수하세요
> - 운영 데이터는 별도로 안전하게 관리하세요

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요! ⭐**

Made with ❤️ by [JeongTaek Bang]

</div>
