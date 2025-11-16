// DataManager.gs - 올바른 데이터 구조에 맞춘 버전

// ===== 캐시 & 공통 헬퍼 =====

let SPREADSHEET_CACHE_ = null;
const SHEET_VALUE_CACHE_ = {};
let PROGRAM_DATA_CACHE_ = null;
let APPLICATION_DATA_CACHE_ = null;
let APPLICATION_COUNTS_CACHE_ = null;

function getSpreadsheet_() {
  if (!SPREADSHEET_CACHE_) {
    SPREADSHEET_CACHE_ = SpreadsheetApp.openById(getSpreadsheetId());
  }
  return SPREADSHEET_CACHE_;
}

function getSheetValuesCached_(sheetName) {
  if (SHEET_VALUE_CACHE_[sheetName]) {
    return SHEET_VALUE_CACHE_[sheetName];
  }

  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    SHEET_VALUE_CACHE_[sheetName] = [];
    return SHEET_VALUE_CACHE_[sheetName];
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow === 0 || lastColumn === 0) {
    SHEET_VALUE_CACHE_[sheetName] = [];
    return SHEET_VALUE_CACHE_[sheetName];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  SHEET_VALUE_CACHE_[sheetName] = values;
  return values;
}

function invalidateSheetCache_(sheetName) {
  delete SHEET_VALUE_CACHE_[sheetName];
  if (sheetName === '프로그램목록') {
    PROGRAM_DATA_CACHE_ = null;
  }
  if (sheetName === '신청현황') {
    APPLICATION_DATA_CACHE_ = null;
    APPLICATION_COUNTS_CACHE_ = null;
  }
  if (sheetName === '신청결과요약') {
    // Currently no additional caches for summary sheet.
  }
}

function getProgramData_() {
  if (PROGRAM_DATA_CACHE_) {
    return PROGRAM_DATA_CACHE_;
  }

  const values = getSheetValuesCached_('프로그램목록');
  const map = {};
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const programId = row && row[0];
    if (!programId) continue;
    const entry = { row: row, index: i };
    map[programId] = entry;
    rows.push(entry);
  }

  PROGRAM_DATA_CACHE_ = { values: values, map: map, rows: rows };
  return PROGRAM_DATA_CACHE_;
}

function getApplicationData_() {
  if (APPLICATION_DATA_CACHE_) {
    return APPLICATION_DATA_CACHE_;
  }

  const values = getSheetValuesCached_('신청현황');
  APPLICATION_DATA_CACHE_ = { values: values };
  return APPLICATION_DATA_CACHE_;
}

function getApplicationCounts_() {
  if (APPLICATION_COUNTS_CACHE_) {
    return APPLICATION_COUNTS_CACHE_;
  }

  const data = getApplicationData_().values;
  const counts = {};
  const maxCapacity = typeof PROGRAM_MAX_CAPACITY === 'number' ? PROGRAM_MAX_CAPACITY : 7;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const programId = row[7];
    const status = row[8];
    if (!programId || status !== '신청완료') continue;
    counts[programId] = (counts[programId] || 0) + 1;
  }

  APPLICATION_COUNTS_CACHE_ = counts;
  return APPLICATION_COUNTS_CACHE_;
}

function normalizeId_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return String(Math.floor(value));
  }
  return String(value).trim();
}

function normalizeDateCell_(value) {
  if (!value) return '날짜 없음';
  if (value instanceof Date) {
    return formatDate(value);
  }
  return String(value).trim();
}

function normalizeTimeCell_(value) {
  if (!value && value !== 0) return '시간 없음';
  if (value instanceof Date) {
    return formatTime(value);
  }
  return String(value).replace(/^'/, '').trim() || '시간 없음';
}

function makeProgramInfo_(row, programId, counts) {
  if (!row) return null;
  const id = programId || row[0];
  const effectiveCounts = counts || getApplicationCounts_();
  const currentCount = effectiveCounts[id] !== undefined ? effectiveCounts[id] : (parseInt(row[9], 10) || 0);
  const maxCount = typeof PROGRAM_MAX_CAPACITY === 'number' ? PROGRAM_MAX_CAPACITY : 7;
  const status = currentCount >= maxCount ? '마감' : (currentCount >= 3 ? '개설' : '미개설');

  return {
    programId: id,
    mentorId: row[1],
    mentorName: row[2],
    mentorEmail: row[3],
    date: normalizeDateCell_(row[4]),
    startTime: normalizeTimeCell_(row[5]),
    endTime: normalizeTimeCell_(row[6]),
    location: row[7] || '미정',
    content: row[8] || '내용 없음',
    currentCount: currentCount,
    maxCount: maxCount,
    programStatus: status
  };
}

// ===== 데이터 조회 함수 =====

// 프로그램 목록 조회
function getPrograms() {
  // 캐시 조회
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('programs_list');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // ignore cache errors
  }

  const programData = getProgramData_();
  const counts = getApplicationCounts_();
  const programs = [];

  for (let i = 0; i < programData.rows.length; i++) {
    const entry = programData.rows[i];
    const row = entry.row;
    const programId = row[0];
    if (!programId) continue;

    const dateValue = row[4];
    if (!dateValue) continue;

    const baseInfo = makeProgramInfo_(row, programId, counts);
    const isFull = baseInfo.currentCount >= baseInfo.maxCount;

    programs.push({
      programId: baseInfo.programId,
      mentorId: baseInfo.mentorId,
      mentorName: baseInfo.mentorName,
      mentorEmail: baseInfo.mentorEmail,
      date: baseInfo.date,
      startTime: baseInfo.startTime,
      endTime: baseInfo.endTime,
      location: baseInfo.location,
      content: baseInfo.content,
      currentCount: baseInfo.currentCount,
      maxCount: baseInfo.maxCount,
      applicantCount: baseInfo.currentCount,
      isFull: isFull,
      programStatus: baseInfo.programStatus,
      statusLabel: baseInfo.programStatus
    });
  }

  programs.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime()) && dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    return String(a.startTime).localeCompare(String(b.startTime));
  });
  
  // 캐시 저장
  try {
    const cache = CacheService.getScriptCache();
    cache.put('programs_list', JSON.stringify(programs), 120);
  } catch (e) {
    // ignore
  }

  return programs;
}

// 특정 프로그램의 신청자 수 조회
function getApplicationCount(programId) {
  const data = getApplicationData_().values;
  
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === programId && data[i][8] === '신청완료') { // 프로그램ID + 상태 체크
      count++;
    }
  }
  
  return count;
}

// 프로그램 상세 정보 조회
function getProgramDetails(programId) {
  const programData = getProgramData_();
  const entry = programData.map[programId];
  if (!entry) {
    return null;
  }

  const counts = getApplicationCounts_();
  return makeProgramInfo_(entry.row, programId, counts);
}

// ===== 신청 관련 함수 =====

// 프로그램 신청
function submitApplication(applicationData) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('다른 신청이 처리 중입니다. 잠시 후 다시 시도해주세요.');
  }
  try {
    const sheet = getSpreadsheet_().getSheetByName('신청현황');
  const data = sheet.getDataRange().getValues();
  APPLICATION_DATA_CACHE_ = { values: data };
  APPLICATION_COUNTS_CACHE_ = null;

  const period = checkApplicationPeriod();
  if (!period.isOpen) {
    throw new Error(period && period.message ? period.message : '신청이 마감되었습니다.');
  }
  if (period.status === 'scheduled') {
    throw new Error('신청 기간이 아직 시작되지 않았습니다.');
  }
  
  const targetStudentId = normalizeId_(applicationData.studentId);
  const maxCapacity = typeof PROGRAM_MAX_CAPACITY === 'number' ? PROGRAM_MAX_CAPACITY : 7;
  let currentApplicants = 0;
  let myApplicationCount = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalizeId_(row[2]) === targetStudentId) {
      if (row[7] === applicationData.programId) {
        throw new Error('이미 신청한 프로그램입니다.');
      }
      myApplicationCount++;
    }
    if (row[7] === applicationData.programId && row[8] === '신청완료') {
      currentApplicants++;
    }
  }
  
  if (currentApplicants >= maxCapacity) {
    throw new Error('정원이 마감되었습니다.');
  }
  
  if (myApplicationCount >= 3) {
    throw new Error('최대 3개 프로그램까지만 신청 가능합니다.');
  }
  
  // 시간 충돌 체크 (DataManager.gs의 함수 사용)
  const conflictResult = checkTimeConflictInternal(applicationData.studentId, applicationData.programId);
  if (conflictResult) {
    throw new Error('신청한 프로그램과 시간이 겹칩니다.');
  }
  
  // 신청 추가 - 올바른 컬럼 순서로
  const newRow = [
    Utilities.getUuid(), // 신청ID
    new Date(), // 타임스탬프
    applicationData.studentId, // 멘티학번
    applicationData.name, // 멘티이름
    applicationData.department, // 멘티학과
    applicationData.email, // 멘티이메일
    applicationData.phone || '', // 멘티전화번호
    applicationData.programId, // 프로그램ID
    '신청완료', // 상태
    applicationData.privacyAgree || '예' // 개인정보동의여부 (J열)
  ];
  
  sheet.appendRow(newRow);
  invalidateSheetCache_('신청현황');
  invalidateSheetCache_('신청결과요약');
  
  // 신청결과 요약시트 업데이트
  updateSummarySheet();
  clearCaches();
  
  return { success: true, message: '신청이 완료되었습니다.' };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// 시간 충돌 체크 함수 (내부용)
function checkTimeConflictInternal(studentId, newProgramId) {
  const applicationData = getApplicationData_().values;
  if (applicationData.length <= 1) {
    return false;
  }

  const programData = getProgramData_();
  const counts = getApplicationCounts_();
  const normalizedStudentId = normalizeId_(studentId);
  const newProgramEntry = programData.map[newProgramId];
  if (!newProgramEntry) {
    return false;
  }

  const newProgram = makeProgramInfo_(newProgramEntry.row, newProgramId, counts);
  if (!newProgram) {
    return false;
  }

  const newDate = String(newProgram.date);
  const newTime = {
    start: parseTime(newProgram.startTime),
    end: parseTime(newProgram.endTime)
  };

  for (let i = 1; i < applicationData.length; i++) {
    const row = applicationData[i];
    if (normalizeId_(row[2]) !== normalizedStudentId) {
      continue;
    }

    const existingProgramId = row[7];
    const existingEntry = programData.map[existingProgramId];
    if (!existingEntry) {
      continue;
    }

    const existingProgram = makeProgramInfo_(existingEntry.row, existingProgramId, counts);
    if (!existingProgram) {
      continue;
    }

    if (String(existingProgram.date) !== newDate) {
      continue;
    }

    const existingTime = {
      start: parseTime(existingProgram.startTime),
      end: parseTime(existingProgram.endTime)
    };

    if (!(newTime.end <= existingTime.start || newTime.start >= existingTime.end)) {
      return true;
    }
  }

  return false;
}

// 시간 문자열을 분 단위로 변환
function parseTime(timeStr) {
  if (!timeStr) return 0;
  
  // 문자열로 변환
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

// 신청 취소
function cancelApplication(applicationId, studentId) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('다른 요청이 처리 중입니다. 잠시 후 다시 시도해주세요.');
  }
  try {
    const sheet = getSpreadsheet_().getSheetByName('신청현황');
  const data = sheet.getDataRange().getValues();
  APPLICATION_DATA_CACHE_ = { values: data };
  APPLICATION_COUNTS_CACHE_ = null;
  
  const targetStudentId = normalizeId_(studentId);
  for (let i = 1; i < data.length; i++) {
    // 신청ID: 0번째 인덱스, 학번: 2번째 인덱스
    if (data[i][0] === applicationId && normalizeId_(data[i][2]) === targetStudentId) {
      sheet.deleteRow(i + 1);
      invalidateSheetCache_('신청현황');
      
      // 요약 시트 업데이트
      updateSummarySheet();
      clearCaches();
      
      return { success: true, message: '신청이 취소되었습니다.' };
    }
  }
  
  return { success: false, message: '신청 내역을 찾을 수 없습니다.' };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ===== 조회 함수 =====

// 내 신청 현황 조회 - 올바른 컬럼 인덱스 사용
function getMyApplications(studentId) {
  const data = getApplicationData_().values;
  if (data.length <= 1) {
    return [];
  }

  const programData = getProgramData_();
  const counts = getApplicationCounts_();
  const normalizedTargetId = normalizeId_(studentId);
  const applications = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalizeId_(row[2]) !== normalizedTargetId) {
      continue;
    }

    const programId = row[7];
    const programEntry = programData.map[programId];
    if (!programEntry) {
      continue;
    }

    const programInfo = makeProgramInfo_(programEntry.row, programId, counts);
    if (!programInfo) {
      continue;
    }

    let timestampStr = row[1];
    if (timestampStr instanceof Date) {
      timestampStr = Utilities.formatDate(timestampStr, 'Asia/Seoul', 'yyyy. M. d a h:mm:ss');
    }

    applications.push({
      applicationId: row[0],
      timestamp: timestampStr || '시간 정보 없음',
      mentorName: programInfo.mentorName,
      date: programInfo.date,
      startTime: programInfo.startTime,
      endTime: programInfo.endTime,
      location: programInfo.location,
      content: programInfo.content,
      currentCount: programInfo.currentCount,
      maxCount: programInfo.maxCount,
      programStatus: programInfo.programStatus
    });
  }

  return applications;
}

// 멘토별 신청자 조회
function getMentorApplications(mentorId) {
  const DEBUG = false; // 디버깅 모드 활성화/비활성화
  const programData = getProgramData_();
  const applicationData = getApplicationData_().values;
  const counts = getApplicationCounts_();
  const normalizedMentorId = normalizeId_(mentorId);

  if (DEBUG) console.log('입력받은 멘토 ID:', mentorId, 'Type:', typeof mentorId);

  const applicantsByProgram = {};
  for (let j = 1; j < applicationData.length; j++) {
    const programId = applicationData[j][7];
    if (!programId) continue;

    if (!applicantsByProgram[programId]) {
      applicantsByProgram[programId] = [];
    }

    let phone = applicationData[j][6] || '';
    if (phone) {
      phone = String(phone).trim();
      if (phone.length === 10 && !phone.startsWith('0')) {
        phone = '0' + phone;
      }
    }

    applicantsByProgram[programId].push({
      name: applicationData[j][3],
      studentId: applicationData[j][2],
      department: applicationData[j][4],
      email: applicationData[j][5],
      phone: phone
    });
  }

  const mentorPrograms = [];
  for (let i = 0; i < programData.rows.length; i++) {
    const entry = programData.rows[i];
    const row = entry.row;
    const sheetMentorId = normalizeId_(row[1]);

    if (DEBUG) console.log(`Row ${entry.index}: 시트의 멘토 ID:`, sheetMentorId);

    if (sheetMentorId === normalizedMentorId) {
      const programId = row[0];
      const programInfo = makeProgramInfo_(row, programId, counts);
      const applicants = applicantsByProgram[programId] || [];
      const maxCapacity = programInfo.maxCount;
      const status = applicants.length >= maxCapacity ? '마감' : (applicants.length >= 3 ? '개설' : '미개설');

      mentorPrograms.push({
        programId: programInfo.programId,
        date: programInfo.date,
        startTime: programInfo.startTime,
        endTime: programInfo.endTime,
        location: programInfo.location,
        content: programInfo.content,
        applicants: applicants,
        count: applicants.length,
        maxCount: maxCapacity,
        status: status
      });
    }
  }

  if (DEBUG) console.log('찾은 프로그램 수:', mentorPrograms.length);

  if (mentorPrograms.length === 0) {
    throw new Error('등록된 프로그램이 없거나 학번이 일치하지 않습니다.');
  }

  return mentorPrograms;
}

// ===== 관리자 함수 =====

// 관리자 대시보드 데이터
// (내부 디버깅용) 기존 관리자 대시보드 데이터 함수: 접미사로 변경해 충돌 방지
function getAdminDashboardData_DM() {
  const programData = getProgramData_();
  const applicationData = getApplicationData_().values;
  const counts = getApplicationCounts_();

  const applicantsByProgram = {};
  for (let i = 1; i < applicationData.length; i++) {
    const row = applicationData[i];
    const programId = row[7];
    if (!programId) continue;

    if (!applicantsByProgram[programId]) {
      applicantsByProgram[programId] = [];
    }

    applicantsByProgram[programId].push({
      name: row[3],
      studentId: row[2],
      department: row[4]
    });
  }

  const allPrograms = [];
  let totalApplications = 0;
  const maxCapacity = typeof PROGRAM_MAX_CAPACITY === 'number' ? PROGRAM_MAX_CAPACITY : 7;

  for (let i = 0; i < programData.rows.length; i++) {
    const entry = programData.rows[i];
    const row = entry.row;
    const programId = row[0];
    const programInfo = makeProgramInfo_(row, programId, counts);
    const applicants = applicantsByProgram[programId] || [];

    totalApplications += applicants.length;

    allPrograms.push({
      programId: programInfo.programId,
      mentorName: programInfo.mentorName,
      date: programInfo.date,
      time: programInfo.startTime + '-' + programInfo.endTime,
      location: programInfo.location,
      applicantCount: applicants.length,
      maxCapacity: maxCapacity,
      status: applicants.length >= maxCapacity ? '마감' : (applicants.length >= 3 ? '개설' : '미개설'),
      applicants: applicants
    });
  }

  const totalPrograms = programData.rows.length;
  const totalCapacity = totalPrograms * maxCapacity;
  const averageRate = totalCapacity > 0 ? Math.round((totalApplications / totalCapacity) * 100) : 0;

  const summary = {
    totalPrograms: totalPrograms,
    totalApplications: totalApplications,
    totalCapacity: totalCapacity,
    averageRate: averageRate
  };

  const undersubscribed = allPrograms.filter(p => p.applicantCount < 3);
  const popular = allPrograms.filter(p => p.applicantCount >= p.maxCapacity);

  return {
    summary: summary,
    undersubscribed: undersubscribed,
    popular: popular,
    allPrograms: allPrograms
  };
}

// (내부 디버깅용) 요약시트 업데이트: 접미사로 변경해 충돌 방지
function updateSummarySheet_DM() {
  const ss = getSpreadsheet_();
  const summarySheet = ss.getSheetByName('신청결과요약');
  if (!summarySheet) {
    throw new Error('신청결과요약 시트를 찾을 수 없습니다.');
  }

  const programData = getProgramData_();
  const applicationData = getApplicationData_().values;
  const counts = getApplicationCounts_();

  const applicantsByProgram = {};
  for (let j = 1; j < applicationData.length; j++) {
    const row = applicationData[j];
    const programId = row[7];
    if (!programId) continue;

    if (!applicantsByProgram[programId]) {
      applicantsByProgram[programId] = [];
    }

    applicantsByProgram[programId].push({
      name: row[3],
      studentId: row[2],
      department: row[4]
    });
  }

  const lastRow = summarySheet.getLastRow();
  if (lastRow > 1) {
    summarySheet.deleteRows(2, lastRow - 1);
  }

  const rowsToWrite = [];

  for (let i = 0; i < programData.rows.length; i++) {
    const entry = programData.rows[i];
    const row = entry.row;
    const programId = row[0];
    const programInfo = makeProgramInfo_(row, programId, counts);
    const applicants = applicantsByProgram[programId] || [];

    const applicantList = applicants.map(a => `${a.name}(${a.studentId}/${a.department})`).join(', ') || '신청자 없음';

    rowsToWrite.push([
      programInfo.programId,
      programInfo.mentorName,
      programInfo.date,
      programInfo.startTime + '-' + programInfo.endTime,
      programInfo.location,
      `${applicants.length}/${programInfo.maxCount}`,
      applicantList
    ]);
  }

  if (rowsToWrite.length > 0) {
    summarySheet.getRange(2, 1, rowsToWrite.length, 7).setValues(rowsToWrite);
  }

  SpreadsheetApp.flush();
  invalidateSheetCache_('신청결과요약');
  return '요약 시트가 업데이트되었습니다.';
}

// ===== 유틸리티 함수 =====

// 날짜 포맷팅
function formatDate(date) {
  if (!date || !(date instanceof Date)) return '날짜 없음';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 시간 포맷팅
function formatTime(time) {
  if (!time) return '시간 없음';
  
  // Date 객체인 경우 - Google Forms 시간 데이터 특별 처리
  if (time instanceof Date) {
    // Google Forms의 시간 데이터는 1899-12-30 기준으로 저장됨
    // 1899년 한국 시간대는 GMT+8:27:52였으므로 변환 시 오차 발생
    // 직접 시간과 분을 추출하여 정각으로 보정
    
    try {
      // 먼저 한국 시간대로 변환 시도
      const formattedTime = Utilities.formatDate(time, 'Asia/Seoul', 'HH:mm:ss');
      const [hours, minutes, seconds] = formattedTime.split(':').map(Number);
      
      // 분이 5분이나 10분인 경우 정각으로 보정
      let correctedMinutes = minutes;
      if (minutes >= 0 && minutes <= 15) {
        correctedMinutes = 0;  // 0-15분은 정각으로
      } else if (minutes >= 45) {
        correctedMinutes = 0;  // 45-59분도 정각으로 (다음 시간)
        return String((hours + 1) % 24).padStart(2, '0') + ':00';
      }
      
      return `${String(hours).padStart(2, '0')}:${String(correctedMinutes).padStart(2, '0')}`;
    } catch (e) {
      // formatDate가 실패하면 직접 시간 추출
      const hours = time.getHours();
      const minutes = time.getMinutes();
      
      // 분이 5분이나 10분인 경우 정각으로 보정
      let correctedMinutes = minutes;
      if (minutes >= 0 && minutes <= 15) {
        correctedMinutes = 0;
      }
      
      return `${String(hours).padStart(2, '0')}:${String(correctedMinutes).padStart(2, '0')}`;
    }
  }
  
  // 문자열인 경우
  return String(time);
}

// 디버깅용: 프로그램 목록 시트 데이터 확인
function debugProgramSheet() {
  const sheet = SpreadsheetApp.openById(getSpreadsheetId()).getSheetByName('프로그램목록');
  const data = sheet.getDataRange().getValues();
  
  console.log('=== 프로그램목록 시트 디버깅 ===');
  console.log('전체 행 수:', data.length);
  
  // 헤더 확인
  if (data.length > 0) {
    console.log('헤더:', data[0]);
  }
  
  // 처음 3개 데이터 확인
  for (let i = 1; i < Math.min(4, data.length); i++) {
    console.log(`\n행 ${i}:`);
    const row = data[i];
    console.log('프로그램ID:', row[0]);
    console.log('멘토학번:', row[1], 'Type:', typeof row[1]);
    console.log('멘토이름:', row[2]);
    console.log('멘토이메일:', row[3]);
    console.log('날짜:', row[4], 'Type:', typeof row[4]);
    console.log('시작시간:', row[5], 'Type:', typeof row[5]);
    console.log('종료시간:', row[6], 'Type:', typeof row[6]);
    console.log('장소:', row[7]);
    console.log('내용:', row[8]);
    console.log('현재신청인원:', row[9]);
  }
  
  return '디버깅 완료 - 콘솔 로그를 확인하세요';
}

// 디버깅용: 특정 멘토 ID로 프로그램 찾기 테스트
function testFindMentor(mentorId) {
  mentorId = mentorId || '202420404';
  
  const sheet = SpreadsheetApp.openById(getSpreadsheetId()).getSheetByName('프로그램목록');
  const data = sheet.getDataRange().getValues();
  
  console.log(`=== 멘토 ${mentorId} 찾기 테스트 ===`);
  
  let found = false;
  for (let i = 1; i < data.length; i++) {
    const sheetMentorId = data[i][1];
    const inputId = String(mentorId).trim();
    const storedId = String(sheetMentorId).trim();
    
    if (inputId === storedId) {
      console.log(`매칭! 행 ${i}: 프로그램ID = ${data[i][0]}`);
      found = true;
    }
  }
  
  if (!found) {
    console.log('매칭되는 멘토를 찾을 수 없음');
    console.log('시트에 있는 멘토 학번들:');
    for (let i = 1; i < Math.min(data.length, 10); i++) {
      console.log(`  행 ${i}: "${data[i][1]}" (Type: ${typeof data[i][1]})`);
    }
  }
  
  return found ? '멘토를 찾았습니다' : '멘토를 찾지 못했습니다';
}

// 디버깅용: 학번 200520631의 신청 현황 테스트
function testMyApplications() {
  const studentId = '200520631';
  const result = getMyApplications(studentId);
  console.log('=== 테스트 결과 ===');
  console.log('신청 내역 수:', result.length);
  console.log('신청 내역:', JSON.stringify(result, null, 2));
  return result;
}

// 디버깅용: 시간 충돌 체크 테스트
function testTimeConflict() {
  const studentId = '200520631';
  const newProgramId = '201920775_1'; // 강해 멘토 프로그램 (9월 19일)
  
  console.log('=== 시간 충돌 체크 테스트 ===');
  console.log('학번:', studentId);
  console.log('신청하려는 프로그램:', newProgramId);
  
  // 새 프로그램 정보 먼저 확인
  const newProgram = getProgramDetails(newProgramId);
  console.log('새 프로그램 정보:', JSON.stringify(newProgram, null, 2));
  
  // 기존 신청 현황 확인
  const sheet = SpreadsheetApp.openById(getSpreadsheetId()).getSheetByName('신청현황');
  const data = sheet.getDataRange().getValues();
  console.log('신청현황 시트 행 수:', data.length);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(studentId)) {
      const existingProgramId = data[i][7];
      const existingProgram = getProgramDetails(existingProgramId);
      console.log(`기존 프로그램 ${existingProgramId}:`, JSON.stringify(existingProgram, null, 2));
    }
  }
  
  const hasConflict = checkTimeConflictInternal(studentId, newProgramId);
  
  console.log('=== 결과 ===');
  console.log('충돌 여부:', hasConflict ? '충돌' : '충돌 없음');
  
  return hasConflict;
}
