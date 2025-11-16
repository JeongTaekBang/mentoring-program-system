// 스프레드시트 ID - 환경 설정에서 Script Properties로 관리 권장
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const DEFAULT_TIMEZONE = 'Asia/Seoul';
const PROGRAM_MAX_CAPACITY = 7;

// 스크립트 속성에서 스프레드시트 ID를 우선적으로 읽고, 없으면 상수 사용
function getSpreadsheetId() {
  try {
    const props = PropertiesService.getScriptProperties();
    const id = props && props.getProperty('SPREADSHEET_ID');
    return id || SPREADSHEET_ID;
  } catch (e) {
    return SPREADSHEET_ID;
  }
}

// 캐시 무효화 (프로그램 목록/관리자 대시보드)
function clearCaches() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('programs_list');
    cache.remove('admin_dashboard');
  } catch (e) {
    // ignore
  }
}

// 경량 웜업 함수 및 트리거 설치/해제
function warmup() {
  try {
    const cache = CacheService.getScriptCache();
    cache.get('noop');
  } catch (e) {}
  return 'ok';
}

function setupWarmupTrigger() {
  ScriptApp.newTrigger('warmup').timeBased().everyMinutes(10).create();
  return 'Warmup trigger created (every 10 minutes).';
}

function removeWarmupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === 'warmup') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  return `Removed ${removed} warmup triggers.`;
}

// 시트 이름들
const SHEETS = {
  FORMS: '응답',  // Google Forms 응답 시트 이름
  PROGRAMS: '프로그램목록',
  APPLICATIONS: '신청현황',
  SETTINGS: '설정',
  SUMMARY: '신청결과요약',
  UNDER_ENROLLED_EXPORT: '미개설프로그램신청자'
};

function getTimezone() {
  try {
    return Session.getScriptTimeZone() || DEFAULT_TIMEZONE;
  } catch (e) {
    return DEFAULT_TIMEZONE;
  }
}

function getSettingsSheet(ss) {
  const spreadsheet = ss || SpreadsheetApp.openById(getSpreadsheetId());
  let sheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEETS.SETTINGS);
    sheet.getRange(1, 1).setValue('설정키');
    sheet.getRange(1, 2).setValue('값');
  }
  return sheet;
}

function readSettingsMap(sheet) {
  const settingsSheet = sheet || getSettingsSheet();
  const lastRow = settingsSheet.getLastRow();
  if (lastRow < 2) {
    return {};
  }
  const values = settingsSheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const map = {};
  for (let i = 0; i < values.length; i++) {
    const key = values[i][0];
    if (!key) continue;
    map[String(key).trim()] = values[i][1];
  }
  return map;
}

function upsertSetting(key, value, options) {
  const sheet = getSettingsSheet();
  const lastRow = sheet.getLastRow();
  const lookupRange = lastRow >= 1 ? sheet.getRange(1, 1, lastRow, 2).getValues() : [];
  let targetRow = 0;
  for (let r = 0; r < lookupRange.length; r++) {
    if (String(lookupRange[r][0]).trim() === key) {
      targetRow = r + 1;
      break;
    }
  }
  if (targetRow === 0) {
    targetRow = lastRow + 1;
    sheet.getRange(targetRow, 1).setValue(key);
  }
  sheet.getRange(targetRow, 2).setValue(value);
  if (options && options.numberFormat) {
    sheet.getRange(targetRow, 2).setNumberFormat(options.numberFormat);
  }
  return targetRow;
}

function parseKstDateTime(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number') {
    // Google Sheets serial number
    const millis = (value - 25569) * 24 * 60 * 60 * 1000;
    return new Date(millis);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Normalize separators
  const normalized = raw
    .replace(/\./g, '-')
    .replace(/년|월/g, '-')
    .replace(/일/g, '')
    .replace(/\s+/g, ' ')
    .replace('오후', 'PM')
    .replace('오전', 'AM');

  // Try Date parse directly
  const direct = new Date(normalized);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  const match = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const second = match[6] ? parseInt(match[6], 10) : 0;
    const utc = Date.UTC(year, month, day, hour - 9, minute, second);
    return new Date(utc);
  }

  return null;
}

function formatDateTimeLocal(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, getTimezone(), "yyyy-MM-dd'T'HH:mm");
}

function getApplicationSettings() {
  const settings = readSettingsMap();
  const timezone = getTimezone();

  const startCandidate = settings['신청시작일시'] || settings['신청시작'] || settings['신청시작일'];
  const startTimePart = settings['신청시작시간'];
  const endCandidate = settings['신청종료일시'] || settings['신청종료'] || settings['신청종료일'];
  const endTimePart = settings['신청종료시간'];

  let startDate = parseKstDateTime(startCandidate);
  let endDate = parseKstDateTime(endCandidate);

  if (!startDate && startCandidate && startTimePart) {
    startDate = parseKstDateTime(`${startCandidate} ${startTimePart}`);
  }
  if (!endDate && endCandidate && endTimePart) {
    endDate = parseKstDateTime(`${endCandidate} ${endTimePart}`);
  }

  // 기본값 (과거 설정 호환)
  if (!startDate) {
    startDate = parseKstDateTime('2025-09-15T00:00');
  }
  if (!endDate) {
    endDate = parseKstDateTime('2025-09-19T23:59');
  }

  return {
    timezone: timezone,
    startDateTime: formatDateTimeLocal(startDate),
    endDateTime: formatDateTimeLocal(endDate),
    startDateLabel: Utilities.formatDate(startDate, timezone, 'yyyy년 M월 d일 a h:mm').replace('AM', '오전').replace('PM', '오후'),
    endDateLabel: Utilities.formatDate(endDate, timezone, 'yyyy년 M월 d일 a h:mm').replace('AM', '오전').replace('PM', '오후'),
    startTimestamp: startDate.getTime(),
    endTimestamp: endDate.getTime()
  };
}

function updateApplicationSettings(settings) {
  const startInput = settings && settings.startDateTime;
  const endInput = settings && settings.endDateTime;

  const startDate = parseKstDateTime(startInput);
  const endDate = parseKstDateTime(endInput);

  if (!startDate || !endDate) {
    throw new Error('시작일시와 종료일시를 모두 입력해주세요.');
  }
  if (startDate.getTime() >= endDate.getTime()) {
    throw new Error('종료일시는 시작일시 이후여야 합니다.');
  }

  const timezone = getTimezone();
  const startLabel = Utilities.formatDate(startDate, timezone, 'yyyy-MM-dd HH:mm');
  const endLabel = Utilities.formatDate(endDate, timezone, 'yyyy-MM-dd HH:mm');

  upsertSetting('신청시작일시', startDate, { numberFormat: 'yyyy-mm-dd hh:mm' });
  upsertSetting('신청종료일시', endDate, { numberFormat: 'yyyy-mm-dd hh:mm' });
  upsertSetting('신청시작일', startLabel.split(' ')[0]);
  upsertSetting('신청종료일', endLabel.split(' ')[0]);
  upsertSetting('신청시작시간', startLabel.split(' ')[1]);
  upsertSetting('신청종료시간', endLabel.split(' ')[1]);

  clearCaches();
  return getApplicationSettings();
}

// 메인 웹앱 진입점
function doGet(e) {
  const page = e.parameter.page || 'apply';
  
  try {
    let htmlFile;
    switch(page) {
      case 'apply':
        htmlFile = 'index';
        break;
      case 'status':
        htmlFile = 'status';
        break;
      case 'mentor':
        htmlFile = 'mentor';
        break;
      case 'admin':
        htmlFile = 'admin';
        break;
      default:
        htmlFile = 'index';
    }
    
    const html = HtmlService.createTemplateFromFile(htmlFile);
    let out = html.evaluate()
      .setTitle('멘토링 프로그램 시스템')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Google Sites 임베드를 위해 사용자-facing 페이지만 ALLOWALL 허용
    if (page === 'apply' || page === 'status') {
      out = out.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    return out;
  } catch(error) {
    return HtmlService.createHtmlOutput('에러가 발생했습니다: ' + error.toString());
  }
}

// HTML 파일에 다른 HTML 파일 포함시키기
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// 신청 기간 체크 (설정 시트 기반)
function checkApplicationPeriod() {
  const settings = getApplicationSettings();
  const now = Date.now();
  const start = settings.startTimestamp;
  const end = settings.endTimestamp;
  const timezone = settings.timezone;

  let status = 'open';
  let isOpen = true;
  let message;

  if (now < start) {
    status = 'scheduled';
    isOpen = false;
    message = `신청 기간은 ${settings.startDateLabel}부터 ${settings.endDateLabel}까지입니다.`;
  } else if (now > end) {
    status = 'closed';
    isOpen = false;
    message = `신청이 마감되었습니다. (마감: ${settings.endDateLabel})`;
  } else {
    status = 'open';
    isOpen = true;
    message = `${settings.endDateLabel}까지 신청 가능합니다.`;
  }

  return {
    isOpen: isOpen,
    status: status,
    message: message,
    startDateTime: settings.startDateTime,
    endDateTime: settings.endDateTime,
    startDateLabel: settings.startDateLabel,
    endDateLabel: settings.endDateLabel,
    timezone: timezone,
    now: Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd'T'HH:mm:ss")
  };
}

// Forms 데이터를 프로그램 목록으로 동기화
function syncFormsToPrograms() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const formsSheet = ss.getSheetByName(SHEETS.FORMS);
  const programsSheet = ss.getSheetByName(SHEETS.PROGRAMS);
  const applicationsSheet = ss.getSheetByName(SHEETS.APPLICATIONS);
  
  // Forms 데이터 읽기 (2행부터)
  const formsData = formsSheet.getDataRange().getValues();
  if (formsData.length <= 1) return;
  
  // 신청현황 데이터 읽기
  const applicationsData = applicationsSheet.getDataRange().getValues();
  
  // 프로그램별 신청자 수 계산
  const applicationCounts = {};
  for (let i = 1; i < applicationsData.length; i++) {
    const programId = applicationsData[i][7]; // 프로그램ID
    const status = applicationsData[i][8]; // 상태
    if (status === '신청완료') {
      applicationCounts[programId] = (applicationCounts[programId] || 0) + 1;
    }
  }
  
  // 기존 프로그램 목록 클리어 (헤더 제외)
  const lastRow = programsSheet.getLastRow();
  if (lastRow > 1) {
    programsSheet.getRange(2, 1, lastRow - 1, 10).clear();
  }
  
  const programs = [];
  
  for (let i = 1; i < formsData.length; i++) {
    const row = formsData[i];
    const mentorId = row[3]; // 학번
    const mentorName = row[2]; // 이름
    const mentorEmail = row[6]; // 이메일
    const programType = row[7]; // 프로그램 구성 방식
    
    if (programType === '1시간 프로그램 3개') {
      // 3개 프로그램 처리 (25-39열)
      for (let j = 0; j < 3; j++) {
        const baseCol = 25 + (j * 5);
        if (row[baseCol]) { // 날짜가 있으면
          const programId = `${mentorId}_${j + 1}`;
          const startTime = formatTime(row[baseCol + 1]);
          const endTime = formatTime(row[baseCol + 2]);
          
          programs.push([
            programId, // 프로그램ID
            mentorId,
            mentorName,
            mentorEmail,
            formatDate(row[baseCol]), // 날짜
            startTime, // 시작시간
            endTime, // 종료시간
            row[baseCol + 3], // 장소
            row[baseCol + 4], // 내용
            applicationCounts[programId] || 0 // 현재신청인원
          ]);
        }
      }
    } else if (programType === '2시간 프로그램 1개, 1시간 프로그램 1개' || 
               programType === '1시간 프로그램 1개, 2시간 프로그램 1개' ||
               programType === '2시간 프로그램 1개 + 1시간 프로그램 1개' ||
               programType === '1시간 프로그램 1개 + 2시간 프로그램 1개') {
      // 2개 프로그램 처리 (14-23열)
      for (let j = 0; j < 2; j++) {
        const baseCol = 14 + (j * 5);
        if (row[baseCol]) { // 날짜가 있으면
          const programId = `${mentorId}_${j + 1}`;
          const startTime = formatTime(row[baseCol + 1]);
          const endTime = formatTime(row[baseCol + 2]);
          
          programs.push([
            programId, // 프로그램ID
            mentorId,
            mentorName,
            mentorEmail,
            formatDate(row[baseCol]), // 날짜
            startTime, // 시작시간
            endTime, // 종료시간
            row[baseCol + 3], // 장소
            row[baseCol + 4], // 내용
            applicationCounts[programId] || 0 // 현재신청인원
          ]);
        }
      }
    } else if (programType === '3시간 프로그램 1개') {
      // 1개 프로그램 처리 (8-12열)
      if (row[8]) { // 날짜가 있으면
        const programId = `${mentorId}_1`;
        const startTime = formatTime(row[9]);
        const endTime = formatTime(row[10]);
        
        programs.push([
          programId, // 프로그램ID
          mentorId,
          mentorName,
          mentorEmail,
          formatDate(row[8]), // 날짜
          startTime, // 시작시간
          endTime, // 종료시간
          row[11], // 장소
          row[12], // 내용
          applicationCounts[programId] || 0 // 현재신청인원
        ]);
      }
    }
  }
  
  // 프로그램 목록에 쓰기
  if (programs.length > 0) {
    // 날짜 컬럼(5번)과 시간 컬럼(6,7번)을 텍스트 형식으로 설정
    programsSheet.getRange(2, 5, programs.length, 1).setNumberFormat('yyyy-MM-dd'); // 날짜 형식
    programsSheet.getRange(2, 6, programs.length, 2).setNumberFormat('@'); // @ = 텍스트 형식 (시간)
    
    // 데이터 쓰기
    programsSheet.getRange(2, 1, programs.length, 10).setValues(programs);
  }
  
  // 데이터 매니저 캐시도 초기화하여 최신 프로그램 정보를 바로 읽도록 함
  invalidateSheetCache_('프로그램목록');

  // 캐시 무효화
  clearCaches();
  return programs.length;
}

// 날짜 포맷팅
function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd');
}

// 시간 포맷팅
function formatTime(timeValue) {
  if (!timeValue) return '';
  
  // 이미 HH:mm 형식이면 그대로 반환
  const timeStr = String(timeValue);
  if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
    return timeStr;
  }
  
  // "오후 3:00:00" 형식 처리
  if (timeStr.includes('오전') || timeStr.includes('오후')) {
    const isPM = timeStr.includes('오후');
    const timePart = timeStr.replace('오전', '').replace('오후', '').trim();
    const [hour, minute] = timePart.split(':').map(s => parseInt(s));
    
    let finalHour = hour;
    if (isPM && hour !== 12) {
      finalHour = hour + 12;
    } else if (!isPM && hour === 12) {
      finalHour = 0;
    }
    
    return String(finalHour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
  }
  
  // Date 객체인 경우 - Google Forms 시간 데이터 특별 처리
  if (timeValue instanceof Date) {
    // Google Forms의 시간 데이터는 1899-12-30 기준으로 저장됨
    // 1899년 한국 시간대는 GMT+8:27:52였으므로 변환 시 오차 발생
    // 직접 시간과 분을 추출하여 정각으로 보정
    
    try {
      // 먼저 한국 시간대로 변환 시도
      const formattedTime = Utilities.formatDate(timeValue, 'Asia/Seoul', 'HH:mm:ss');
      const [hours, minutes, seconds] = formattedTime.split(':').map(Number);
      
      // 분이 5분이나 10분인 경우 정각으로 보정
      let correctedMinutes = minutes;
      if (minutes >= 0 && minutes <= 15) {
        correctedMinutes = 0;  // 0-15분은 정각으로
      } else if (minutes >= 45) {
        correctedMinutes = 0;  // 45-59분도 정각으로 (다음 시간)
        return String((hours + 1) % 24).padStart(2, '0') + ':00';
      }
      
      return String(hours).padStart(2, '0') + ':' + String(correctedMinutes).padStart(2, '0');
    } catch (e) {
      // formatDate가 실패하면 직접 시간 추출
      const hours = timeValue.getHours();
      const minutes = timeValue.getMinutes();
      
      // 분이 5분이나 10분인 경우 정각으로 보정
      let correctedMinutes = minutes;
      if (minutes >= 0 && minutes <= 15) {
        correctedMinutes = 0;
      }
      
      return String(hours).padStart(2, '0') + ':' + String(correctedMinutes).padStart(2, '0');
    }
  }
  
  // 날짜 형식 문자열이 들어온 경우 (예: "2025-09-24")
  if (timeStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.log('경고: 시간 필드에 날짜가 들어왔습니다:', timeStr);
    return '16:00'; // 기본값 반환
  }
  
  // 기타 경우는 Date로 변환 시도
  try {
    const time = new Date(timeValue);
    if (!isNaN(time.getTime())) {
      // 한국 시간대로 변환
      return Utilities.formatDate(time, 'Asia/Seoul', 'HH:mm');
    }
  } catch (e) {
    console.log('시간 변환 실패:', timeValue);
  }
  
  return '00:00';
}

// 초기 설정 함수 (한 번만 실행)
function initialSetup() {
  syncFormsToPrograms();
  return '초기 설정 완료!';
}

// 디버깅용: 응답 시트 데이터 확인
function debugFormsData() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const formsSheet = ss.getSheetByName(SHEETS.FORMS);
  const formsData = formsSheet.getDataRange().getValues();
  
  console.log('=== 응답 시트 데이터 확인 (수정된 시간 처리) ===');
  
  for (let i = 1; i < Math.min(3, formsData.length); i++) {
    const row = formsData[i];
    console.log(`\n행 ${i}: ${row[2]} (${row[3]})`);
    console.log('프로그램 타입:', row[7]);
    
    if (row[7] === '1시간 프로그램 3개') {
      for (let j = 0; j < 3; j++) {
        const baseCol = 25 + (j * 5);
        console.log(`프로그램 ${j+1}:`);
        console.log('  날짜:', row[baseCol], typeof row[baseCol]);
        
        const startTime = row[baseCol + 1];
        const endTime = row[baseCol + 2];
        
        console.log('  시작시간 원본:', startTime, typeof startTime);
        if (startTime instanceof Date) {
          console.log('    원본 시간:', startTime.toISOString());
          console.log('    getHours():', startTime.getHours());
          console.log('    getMinutes():', startTime.getMinutes());
        }
        
        console.log('  종료시간 원본:', endTime, typeof endTime);
        if (endTime instanceof Date) {
          console.log('    원본 시간:', endTime.toISOString());
          console.log('    getHours():', endTime.getHours());
          console.log('    getMinutes():', endTime.getMinutes());
        }
        
        console.log('  formatTime 시작시간 결과:', formatTime(startTime));
        console.log('  formatTime 종료시간 결과:', formatTime(endTime));
      }
    }
  }
  
  // 프로그램 목록 시트에 저장된 결과도 확인
  console.log('\n=== 프로그램목록 시트에 저장된 결과 ===');
  const programSheet = ss.getSheetByName(SHEETS.PROGRAMS);
  const programData = programSheet.getDataRange().getValues();
  
  for (let i = 1; i < Math.min(4, programData.length); i++) {
    console.log(`\n프로그램 ${i}: ${programData[i][0]}`);
    console.log('  멘토:', programData[i][2]);
    console.log('  날짜:', programData[i][4]);
    console.log('  시작시간:', programData[i][5]);
    console.log('  종료시간:', programData[i][6]);
  }
  
  return '디버깅 완료';
}
