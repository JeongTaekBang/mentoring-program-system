# 📚 멘토링 시스템 개발 Lesson Learned

## 프로젝트 개요
- **목적**: 대학교 신입생 멘토링 프로그램 신청 및 관리 시스템
- **기술 스택**: Google Apps Script, Google Sheets, HTML/CSS/JavaScript
- **개발 기간**: 2025년 8월 ~ 9월

## 📌 주요 이슈 요약
1. **멘토 학번 조회 실패** - Google Sheets 자동 타입 변환
2. **Google Forms 시간 데이터 왜곡** - 1899년 기준 시간대 오차
3. **시간 충돌 체크 실패** - 날짜/시간 형식 불일치
4. **전화번호 앞자리 0 손실** - 숫자 변환으로 인한 데이터 손실
5. **멘티 신청현황 클라이언트 표시 오류** - ISO timestamp 형식 문제
6. **CSV 데이터 구조 불일치** - 조건부 질문으로 인한 가변 컬럼

---

## 🔴 Issue #1: 멘토 학번 조회 실패

### 문제 상황
- 멘토가 학번 `202420404`로 조회 시 "등록된 프로그램이 없거나 학번이 일치하지 않습니다" 오류 발생
- 분명히 프로그램목록 시트에는 해당 학번의 데이터가 존재

### 원인 분석
1. **Google Sheets의 자동 타입 변환**
   - Sheets가 학번을 숫자로 자동 변환 (예: `202420404` → `202420404.0`)
   - JavaScript의 `===` 비교 시 타입 불일치로 매칭 실패

2. **문자열 vs 숫자 타입 비교 문제**
   ```javascript
   // 실패 케이스
   "202420404" === 202420404 // false
   ```

### 해결책
```javascript
// 숫자와 문자열 모두 고려한 비교
const inputId = String(mentorId).trim();
let storedId = String(sheetMentorId).trim();

// 숫자형 데이터인 경우 소수점 제거
if (sheetMentorId && typeof sheetMentorId === 'number') {
  storedId = String(Math.floor(sheetMentorId));
}

if (inputId === storedId) {
  // 매칭 성공
}
```

---

## 🔴 Issue #2: Google Forms 시간 데이터 왜곡

### 문제 상황
- Google Forms에서 입력한 시간 `15:00`이 `15:05` 또는 `16:05`로 표시
- 일부 시간이 1899-12-30 날짜와 함께 저장됨

### 원인 분석
1. **Google Forms의 시간 저장 방식**
   - Forms는 시간을 1899-12-30 기준 Date 객체로 저장
   - 1899년 한국 시간대는 GMT+8:27:52였음 (현재 GMT+9와 다름)
   - 시간대 변환 시 약 32분의 오차 발생

2. **CSV 내보내기 시 데이터 변형**
   - Date 객체가 문자열로 변환되며 형식 불일치
   - 일부 데이터에 아포스트로피(') 접두사 추가

### 해결책
```javascript
function formatTime(time) {
  if (!time) return '시간 없음';
  
  // Date 객체인 경우 - Google Forms 시간 데이터 특별 처리
  if (time instanceof Date) {
    try {
      const formattedTime = Utilities.formatDate(time, 'Asia/Seoul', 'HH:mm:ss');
      const [hours, minutes, seconds] = formattedTime.split(':').map(Number);
      
      // 분이 5분이나 10분인 경우 정각으로 보정
      let correctedMinutes = minutes;
      if (minutes >= 0 && minutes <= 15) {
        correctedMinutes = 0;  // 0-15분은 정각으로
      }
      
      return `${String(hours).padStart(2, '0')}:${String(correctedMinutes).padStart(2, '0')}`;
    } catch (e) {
      // 직접 시간 추출
      const hours = time.getHours();
      return `${String(hours).padStart(2, '0')}:00`;
    }
  }
  
  // 문자열인 경우 - 아포스트로피 제거
  return String(time).replace(/^'/, '');
}
```

---

## 🔴 Issue #3: 시간 충돌 체크 실패

### 문제 상황
- 같은 날짜, 겹치는 시간대의 프로그램 중복 신청이 가능
- `checkTimeConflict` 함수가 충돌을 감지하지 못함

### 원인 분석
1. **날짜 비교 실패**
   - Date 객체와 문자열 비교 시 `===` 실패
   - 날짜 형식 불일치 (예: `2025-09-18` vs `2025. 9. 18`)

2. **시간 파싱 문제**
   - 시간 형식 다양성 미고려 (`15:00`, `'15:00`, `1500`)
   - `split(':')`이 콜론 없는 시간에서 실패

### 해결책
```javascript
// 날짜 비교 - 문자열로 통일
if (String(existingProgram.date) === String(newProgram.date)) {
  // 시간 충돌 체크
}

// 유연한 시간 파싱
function parseTime(timeStr) {
  if (!timeStr) return 0;
  
  const timeString = String(timeStr).trim();
  
  // : 이 포함된 경우 (15:10 형식)
  if (timeString.includes(':')) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }
  
  // 숫자만 있는 경우 (1510 형식)
  const timeNum = parseInt(timeString);
  if (!isNaN(timeNum)) {
    const hours = Math.floor(timeNum / 100);
    const minutes = timeNum % 100;
    return hours * 60 + minutes;
  }
  
  return 0;
}
```

---

## 🔴 Issue #4: 전화번호 앞자리 0 손실

### 문제 상황
- 전화번호 `010-1234-5678`이 `10-1234-5678`로 표시
- Sheets가 숫자로 인식하여 앞의 0 제거

### 원인 분석
- Google Sheets가 하이픈 없는 전화번호를 숫자로 자동 변환
- 숫자형 데이터는 앞자리 0 무시

### 해결책
```javascript
// 전화번호 복원 로직
let phone = data[i][6] || '';
if (phone) {
  phone = String(phone).trim();
  // 10자리이고 0으로 시작하지 않으면 앞에 0 추가
  if (phone.length === 10 && !phone.startsWith('0')) {
    phone = '0' + phone;
  }
}
```

---

## 🔴 Issue #5: 멘티 신청현황 클라이언트 표시 오류

### 문제 상황
- 학번 `200520631`로 신청한 프로그램이 "내 신청현황" 웹 화면에 표시되지 않음
- 서버에서는 데이터를 정상적으로 반환하나 클라이언트에서 렌더링 실패

### 원인 분석
1. **Timestamp 형식 불일치**
   - 서버: ISO 8601 형식으로 timestamp 반환 (예: `2025-08-31T06:42:19.000Z`)
   - 클라이언트: 한국어 형식 기대 (예: `2025. 8. 31 오후 3:42:19`)
   - JavaScript에서 ISO 형식 파싱 시 오류 발생

2. **Date 객체 직렬화 문제**
   - Google Apps Script에서 Date 객체가 JSON으로 직렬화될 때 ISO 형식으로 변환
   - 클라이언트 HTML에서 이를 제대로 처리하지 못함

### 해결책

#### 서버 측 (DataManager.gs)
```javascript
function getMyApplications(studentId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('신청현황');
  const data = sheet.getDataRange().getValues();
  
  const applications = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[2]).trim() === String(studentId).trim()) {
      const programInfo = getProgramDetails(row[7]);
      
      if (programInfo) {
        // timestamp를 문자열로 변환 (중요!)
        let timestampStr = row[1];
        if (timestampStr instanceof Date) {
          // 한국어 형식으로 포맷팅
          timestampStr = Utilities.formatDate(
            timestampStr, 
            'Asia/Seoul', 
            'yyyy. M. d a h:mm:ss'
          );
        }
        
        applications.push({
          applicationId: row[0],
          timestamp: timestampStr, // 문자열로 전달
          mentorName: programInfo.mentorName,
          date: programInfo.date,
          startTime: programInfo.startTime,
          endTime: programInfo.endTime,
          location: programInfo.location,
          content: programInfo.content
        });
      }
    }
  }
  
  return applications;
}
```

#### 클라이언트 측 (status.html)
```javascript
function displayApplications(applications) {
  if (!applications || applications.length === 0) {
    document.getElementById('applicationList').innerHTML = 
      '<div class="alert alert-info">신청한 프로그램이 없습니다.</div>';
    return;
  }
  
  let html = '';
  applications.forEach(app => {
    // timestamp가 이미 문자열로 포맷팅되어 있음
    const displayTime = app.timestamp || '시간 정보 없음';
    
    html += `
      <div class="application-card">
        <h3>📅 ${app.date} ${app.startTime}-${app.endTime}</h3>
        <div class="application-info">
          <strong>👨‍🏫 멘토:</strong> ${app.mentorName}
        </div>
        <div class="application-info">
          <strong>📍 장소:</strong> ${app.location}
        </div>
        <div class="application-info">
          <strong>📝 내용:</strong><br>${app.content}
        </div>
        <div class="application-info">
          <strong>🕐 신청일시:</strong> ${displayTime}
        </div>
        <button class="btn btn-danger btn-sm" 
                onclick="cancelApplication('${app.applicationId}')">
          신청 취소
        </button>
      </div>
    `;
  });
  
  document.getElementById('applicationList').innerHTML = html;
}
```

### 핵심 포인트
- **서버에서 Date를 문자열로 변환**: JSON 직렬화 전에 미리 포맷팅
- **타임존 명시**: `Asia/Seoul` 타임존 사용으로 정확한 한국 시간 표시
- **클라이언트 단순화**: 복잡한 Date 파싱 로직 제거

---

## 🔴 Issue #6: CSV 데이터 구조 불일치

### 문제 상황
- CSV 파일의 컬럼 순서와 코드의 인덱스 불일치
- 데이터 누락 및 잘못된 매핑

### 원인 분석
- Google Forms 응답 시트의 복잡한 구조
  - 조건부 질문으로 인한 가변 컬럼
  - 3가지 프로그램 구성 방식에 따른 다른 컬럼 위치

### 해결책
```javascript
// 프로그램 타입별 컬럼 매핑
if (programType === '1시간 프로그램 3개') {
  // 26-40열 처리
  for (let j = 0; j < 3; j++) {
    const baseCol = 26 + (j * 5);
    // ...
  }
} else if (programType === '3시간 프로그램 1개') {
  // 8-12열 처리
  // ...
}
```

---

## 💡 핵심 교훈 (Key Takeaways)

### 1. Google Sheets API 작업 시
- **타입 안정성**: 항상 데이터 타입을 명시적으로 변환
- **학번/ID 처리**: 모든 비교 연산에서 문자열로 통일
- **날짜/시간 처리**: Sheets의 시간대 및 Date 객체 특성 고려
- **자동 변환 방지**: 텍스트로 유지할 데이터는 아포스트로피 사용

### 2. 디버깅 전략
- **조건부 로깅**: `DEBUG` 플래그로 프로덕션/개발 환경 구분
- **테스트 함수**: 각 기능별 독립적인 테스트 함수 구현
- **데이터 검증**: 실제 시트 데이터를 직접 확인하는 디버깅 함수

### 3. 데이터 정합성
- **유연한 파싱**: 다양한 형식의 입력 데이터 처리
- **방어적 프로그래밍**: 예상치 못한 데이터 형식 대비
- **명확한 인터페이스**: 컬럼 인덱스를 상수로 정의

### 4. 개발 프로세스
- **점진적 테스트**: 작은 단위부터 테스트하며 확장
- **실제 데이터 테스트**: 샘플이 아닌 실제 데이터로 조기 테스트
- **문서화**: 각 해결책에 대한 주석과 이유 명시

---

## 🛠️ 유용한 디버깅 도구

### 테스트 함수들
```javascript
// 프로그램 시트 데이터 확인
debugProgramSheet()

// 특정 멘토 찾기 테스트
testFindMentor('202420404')

// 내 신청 현황 테스트
testMyApplications()

// 시간 충돌 체크 테스트
testTimeConflict()
```

### 콘솔 로그 활용
- Apps Script 에디터의 실행 로그 확인
- `console.log()`로 데이터 타입과 값 동시 출력
- JSON.stringify()로 객체 구조 확인

---

## 📋 체크리스트

Google Sheets 기반 시스템 개발 시 확인 사항:

- [ ] 숫자/문자열 타입 변환 처리
- [ ] 학번, ID 등 식별자의 일관된 타입 처리
- [ ] 날짜/시간 형식 통일
- [ ] 전화번호 등 특수 형식 데이터 보존
- [ ] CSV 내보내기 시 데이터 변형 확인
- [ ] 시간대 차이로 인한 오차 보정
- [ ] 조건부 질문으로 인한 가변 컬럼 처리
- [ ] 빈 값과 null 처리
- [ ] 디버깅 모드 구현
- [ ] 테스트 함수 작성
- [ ] 실제 데이터로 테스트
- [ ] 모든 조회 기능의 타입 안전성 확인

---

## 🎯 결론

Google Sheets와 Apps Script를 활용한 시스템 개발은 빠른 프로토타이핑이 가능하지만, 데이터 타입 자동 변환과 시간대 처리 등 예상치 못한 문제들이 발생할 수 있다. 

**핵심은**:
1. 데이터 타입을 명시적으로 처리
2. 방어적 프로그래밍으로 다양한 입력 형식 대응
3. 실제 데이터로 조기 테스트
4. 디버깅 도구 사전 구축

이러한 경험을 통해 향후 유사한 프로젝트에서 더 효율적이고 안정적인 개발이 가능할 것으로 기대된다.
