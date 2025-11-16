# 샘플 데이터

이 디렉터리에는 시스템 구조를 이해하기 위한 템플릿 CSV 파일들이 포함되어 있습니다.
모든 개인정보는 익명화된 샘플 데이터입니다.

## 파일 설명

- **설정.sample.csv**: 시스템 운영 설정 (신청 기간, 정원 등)
- **프로그램목록.sample.csv**: 멘토가 제공하는 프로그램 목록
- **신청현황.sample.csv**: 멘티의 프로그램 신청 기록
- **신청결과요약.sample.csv**: 관리자용 프로그램별 신청 통계
- **응답.sample.csv**: Google Forms로 수집된 멘토 응답 데이터

## 실제 운영 시

실제 운영 데이터는 `.gitignore`에 의해 Git 저장소에서 제외됩니다.
실제 스프레드시트 ID는 `Code.gs`의 상수 대신 Apps Script의 Script Properties에 저장하여 관리하세요.

```javascript
// Script Properties 설정 예시
PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', 'YOUR_ACTUAL_SPREADSHEET_ID');
PropertiesService.getScriptProperties().setProperty('ADMIN_PIN', 'YOUR_ADMIN_PIN');
```

