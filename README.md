# 멘토링 프로그램 시스템 (Google Apps Script)

멘토·멘티 매칭 프로그램을 Google Apps Script와 Google Sheets 위에서 구현한 프로젝트입니다. 멘티 신청 페이지, 멘토 조회 페이지, 관리자 대시보드, 신청 현황 요약 등 멘토링 운영 전 과정을 하나의 Apps Script 프로젝트로 운영할 수 있도록 구성되어 있습니다.

> ⚠️ **민감정보 주의**  
> 현재 CSV 데이터와 상수에는 실제 이름, 학번, 전화번호, 이메일, 스프레드시트 ID 등이 포함되어 있습니다. GitHub에 공개하기 전에 반드시 모든 개인정보·식별자를 제거하거나 익명화하고, 운영에 필요한 값은 Script Properties 또는 샘플 데이터로 대체하세요.

## 구성 요소

| 구분 | 파일 | 설명 |
| --- | --- | --- |
| Apps Script 진입점 | `Code.gs` | 전역 설정, 스프레드시트 접근, 기본 헬퍼, warm-up 트리거 |
| 데이터 접근 | `DataManager.gs` | 시트 캐시, 프로그램/신청 데이터 조회 및 가공 |
| 비즈니스 로직 | `Validation.gs` | 신청 검증, 기간 체크, 신청 CRUD |
| 관리자 기능 | `Admin.gs` | 관리자 PIN 검증, 대시보드/요약/동기화 API |
| HTML 템플릿 | `index.html`, `mentor.html`, `admin.html`, `status.html`, `common.html`, `styles.html` | 클라이언트 UI 및 스타일 |
| 자료·문서 | `*.csv`, `CHANGELOG.md`, `LESSON_LEARNED.md`, `CRITICAL-LIMITATIONS.md`, `초기 설정 및 테스트.md` 등 | 운영 데이터 및 참고 문서 |

```
mentoringProject
├── *.gs                # Apps Script 서버 코드
├── *.html              # HTML 서비스 템플릿
├── *.csv               # 현재/과거 운영 데이터 (공개 시 익명화 필요)
├── *.md                # 계획서 및 회고
└── README.md           # GitHub 안내 문서
```

## Google Sheets 구조

| 시트명 | 목적 | 주요 컬럼 |
| --- | --- | --- |
| `프로그램목록` | 멘토가 제출한 프로그램 정보 | 프로그램ID, 멘토학번/이름/이메일, 날짜, 시간, 장소, 내용, 현재신청인원 |
| `신청현황` | 멘티 신청 기록 | 신청ID, 학번, 이름, 학과, 이메일, 전화번호, 프로그램ID, 상태, 개인정보동의 |
| `신청결과요약` | 관리자용 요약 테이블 | 프로그램 통계, 신청자 요약 |
| `설정` | 운영 파라미터 | 신청기간, 최대 신청 개수, 정원 등 Key-Value |
| `응답` | Google Form 원본 데이터 | 멘토가 업로드한 응답 |
| `미개설프로그램신청자` | 정원 미달 프로그램 지원자 명단 | 프로그램ID, 멘티 정보 |

## 배포/운영 절차

1. **스프레드시트 준비**
   - 위 표의 시트를 동일한 이름으로 생성합니다.
   - 운영 데이터는 별도 드라이브 폴더에서 관리하고, 공개용 레포에는 샘플 데이터만 포함합니다.
2. **Apps Script 프로젝트 구성**
   - `Code.gs`, `Admin.gs`, `DataManager.gs`, `Validation.gs`와 HTML 템플릿을 Apps Script 코드 에디터에 각각 붙여넣습니다.
   - `Script Properties`에 다음 값을 저장합니다.
     - `SPREADSHEET_ID`: 운영 스프레드시트 ID
     - `ADMIN_PIN`: 관리자 인증용 PIN (기본 0000을 반드시 변경)
3. **테스트**
   - `testGetPrograms`, `testValidateApplication` 등 가벼운 함수로 데이터 로딩을 확인합니다.
   - 신청 기간(`설정` 시트) 값을 조정하여 신청 페이지 접근 가능 여부를 검증합니다.
4. **Web App 배포**
   - `배포 > 새 배포`에서 유형을 `웹 앱`으로 선택하고, `액세스 권한`을 `모든 사용자` 혹은 `링크가 있는 모든 사용자`로 설정합니다.
   - `index.html`, `mentor.html`, `admin.html`, `status.html`을 `doGet`에서 switch-case로 라우팅하거나 별도 EntryPoint를 사용합니다.
   - 배포 후 URL을 멘토/멘티/관리자에게 각각 안내합니다.
5. **운영 자동화(옵션)**
   - `setupWarmupTrigger`를 실행해 10분 주기의 warm-up 트리거를 등록하면 Apps Script 캐시가 날아가도 빠르게 응답합니다.
   - 필요한 경우 Time-driven Trigger를 추가해 요약 시트를 일정 주기로 업데이트합니다.

## GitHub 공개/아카이브 체크리스트

1. **민감정보 제거**
   - `신청현황.csv`, `응답.csv`, `프로그램목록.csv`, `신청결과요약.csv` 등 실제 이름/연락처/학번이 포함된 파일을 삭제하거나 익명화한 샘플 데이터로 대체합니다.
   - `Code.gs`의 `SPREADSHEET_ID`는 더미 값으로 바꾸고, 실제 값은 Script Properties나 `.clasp.json` 등 비공개 영역에서만 관리합니다.
2. **샘플 데이터/문서 제공**
   - 민감 정보를 제거한 템플릿 CSV (`data-sample/프로그램목록.sample.csv` 등)를 추가해 구조만 공유합니다.
   - `CRITICAL-LIMITATIONS.md`, `LESSON_LEARNED.md` 같은 문서를 그대로 포함하면 프로젝트 배경을 이해하는 데 도움이 됩니다.
3. **Git 저장소 초기화**
   - `git init && git add . && git commit -m "feat: add mentoring archive"`으로 최초 히스토리를 남깁니다.
   - `.gitignore`를 추가해 `*.csv`(실데이터)나 개인 설정 파일을 기본적으로 제외하면 안전합니다.
4. **GitHub 업로드 및 Archive 표시**
   - GitHub에서 새 리포지터리를 만들고 최초 커밋을 푸시합니다.
   - `Settings > General > Archive this repository`를 체크하면 `Archived` 뱃지가 붙으며, 기본적으로 read-only로 표시됩니다.
   - `About` 섹션과 `Topics`에 `google-apps-script`, `mentoring`, `archive` 등을 걸어두면 검색성이 좋아집니다.
5. **문서화**
   - 본 README를 기본 안내 문서로 사용하고, 필요한 경우 `docs/` 디렉터리에 상세 가이드(예: 데이터 스키마, 운영 매뉴얼)를 추가합니다.
   - 릴리스 노트(`CHANGELOG.md`)와 회고(`LESSON_LEARNED.md`)를 연결해 프로젝트 히스토리를 남기면 아카이브 용도가 분명해집니다.

## 향후 활용 아이디어

- Google Workspace Add-on이나 Apps Script API를 활용한 자동화 도입
- 신청 데이터 시각화 (Looker Studio, AppSheet 등과 연계)
- 멘토·멘티 알림용 Gmail/Chatbot 스크립트 추가

아카이브 상태로 두더라도, 위 문서와 샘플 데이터를 통해 다른 학교/기관에서도 참고 구현이 가능하도록 구성하는 것이 목표입니다.
