// 관리자 대시보드 데이터 가져오기
function getAdminDashboardData() {
  // 캐시 조회
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('admin_dashboard');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // ignore cache errors
  }

  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const programsSheet = ss.getSheetByName(SHEETS.PROGRAMS);
  const applicationsSheet = ss.getSheetByName(SHEETS.APPLICATIONS);
  
  const programs = programsSheet.getDataRange().getValues();
  const applications = applicationsSheet.getDataRange().getValues();
  const maxCapacity = typeof PROGRAM_MAX_CAPACITY === 'number' ? PROGRAM_MAX_CAPACITY : 7;

  const applicantMap = {};
  let totalApplications = 0;

  for (let i = 1; i < applications.length; i++) {
    const row = applications[i];
    if (!row || row[8] !== '신청완료') continue;

    const programId = row[7];
    if (!programId) continue;

    totalApplications++;

    let phone = row[6] || '';
    if (phone) {
      phone = String(phone).trim();
      if (phone.length === 10 && !phone.startsWith('0')) {
        phone = '0' + phone;
      }
    }

    const applicant = {
      name: row[3],
      studentId: row[2],
      department: row[4],
      email: row[5],
      phone: phone,
      privacyAgree: row[9] || '예'
    };

    if (!applicantMap[programId]) {
      applicantMap[programId] = [];
    }
    applicantMap[programId].push(applicant);
  }

  const totalPrograms = Math.max(programs.length - 1, 0);
  const totalCapacity = totalPrograms * maxCapacity;
  const averageRate = totalCapacity > 0 ? Math.round((totalApplications / totalCapacity) * 100) : 0;

  const programDetails = [];

  for (let i = 1; i < programs.length; i++) {
    const row = programs[i];
    if (!row) continue;
    const programId = row[0];
    if (!programId) continue;

    const applicants = applicantMap[programId] || [];

    const startTime = String(row[5]).replace(/^'/, '');
    const endTime = String(row[6]).replace(/^'/, '');

    let dateStr = row[4];
    if (dateStr instanceof Date) {
      dateStr = Utilities.formatDate(dateStr, 'Asia/Seoul', 'yyyy-MM-dd');
    }

    programDetails.push({
      programId: programId,
      mentorName: row[2],
      mentorEmail: row[3],
      date: dateStr,
      time: `${startTime}-${endTime}`,
      location: row[7],
      content: row[8],
      applicantCount: applicants.length,
      maxCapacity: maxCapacity,
      applicants: applicants,
      status: applicants.length >= maxCapacity ? '마감' :
              applicants.length >= 3 ? '개설' : '미개설'
    });
  }
  
  // 미개설 프로그램 (3명 미만)
  const undersubscribed = programDetails.filter(p => p.applicantCount < 3);
  
  // 인기 프로그램 (정원 도달)
  const popular = programDetails.filter(p => p.applicantCount >= maxCapacity);
  
  const result = {
    summary: {
      totalPrograms: totalPrograms,
      totalApplications: totalApplications,
      averageRate: averageRate,
      totalCapacity: totalCapacity
    },
    undersubscribed: undersubscribed,
    popular: popular,
    allPrograms: programDetails
  };

  // 캐시 저장
  try {
    const cache = CacheService.getScriptCache();
    cache.put('admin_dashboard', JSON.stringify(result), 120);
  } catch (e) {
    // ignore
  }

  return result;
}

// 간단한 관리자 PIN 검증 (Script Properties의 ADMIN_PIN 사용, 없으면 '0000')
function validateAdminPin(pin) {
  const props = PropertiesService.getScriptProperties();
  const expected = (props && props.getProperty('ADMIN_PIN')) || '0000';
  return String(pin || '') === String(expected);
}

function getAdminDashboardDataWithPin(pin) {
  if (!validateAdminPin(pin)) {
    throw new Error('인증 실패: 올바른 관리자 PIN이 필요합니다.');
  }
  return getAdminDashboardData();
}

function getApplicationSettingsWithPin(pin) {
  if (!validateAdminPin(pin)) {
    throw new Error('인증 실패: 올바른 관리자 PIN이 필요합니다.');
  }
  return getApplicationSettings();
}

function updateSummarySheetWithPin(pin) {
  if (!validateAdminPin(pin)) {
    throw new Error('인증 실패: 올바른 관리자 PIN이 필요합니다.');
  }
  return updateSummarySheet();
}

function prepareExcelDataWithPin(pin) {
  if (!validateAdminPin(pin)) {
    throw new Error('인증 실패: 올바른 관리자 PIN이 필요합니다.');
  }
  return prepareExcelData();
}

function syncFormsToProgramsWithPin(pin) {
  if (!validateAdminPin(pin)) {
    throw new Error('인증 실패: 올바른 관리자 PIN이 필요합니다.');
  }
  return syncFormsToPrograms();
}

function updateApplicationSettingsWithPin(pin, settings) {
  if (!validateAdminPin(pin)) {
    throw new Error('인증 실패: 올바른 관리자 PIN이 필요합니다.');
  }
  return updateApplicationSettings(settings);
}

// 신청 결과 요약 시트 업데이트
function updateSummarySheet() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const summarySheet = ss.getSheetByName(SHEETS.SUMMARY);
  const data = getAdminDashboardData();
  
  // 기존 데이터 클리어 (헤더 제외)
  const lastRow = summarySheet.getLastRow();
  if (lastRow > 1) {
    summarySheet.getRange(2, 1, lastRow - 1, 7).clear();
  }
  
  // 새 데이터 작성
  const summaryData = [];
  
  for (const program of data.allPrograms) {
    const applicantNames = program.applicants.map(a => a.name).join(', ');
    const applicantIds = program.applicants.map(a => a.studentId).join(', ');
    const applicantPhones = program.applicants.map(a => a.phone).join(', ');
    
    summaryData.push([
      program.programId,
      program.mentorName,
      program.date,
      program.time,
      program.location,
      `${program.applicantCount}/${program.maxCapacity}`,
      applicantNames || '신청자 없음'
    ]);
  }
  
  if (summaryData.length > 0) {
    summarySheet.getRange(2, 1, summaryData.length, 7).setValues(summaryData);
  }
  
  return '요약 시트가 업데이트되었습니다.';
}

function exportUnderEnrolledApplicantsWithPin(pin) {
  if (!validateAdminPin(pin)) {
    throw new Error('인증 실패: 올바른 관리자 PIN이 필요합니다.');
  }
  return exportUnderEnrolledApplicants();
}

function exportUnderEnrolledApplicants() {
  clearCaches();

  const data = getAdminDashboardData();
  const targetPrograms = data.allPrograms.filter(function(program) {
    return program.applicantCount > 0 && program.applicantCount <= 2;
  });

  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheetName = SHEETS.UNDER_ENROLLED_EXPORT;
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const headers = ['프로그램ID', '멘토명', '날짜', '시간', '장소', '신청자명', '학번', '학과', '이메일', '전화번호', '개인정보동의'];
  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  if (targetPrograms.length === 0) {
    sheet.autoResizeColumns(1, headers.length);
    return '조건에 맞는 신청자가 없어 시트를 초기화했습니다.';
  }

  const rows = [];

  targetPrograms.forEach(function(program) {
    program.applicants.forEach(function(applicant) {
      rows.push([
        program.programId,
        program.mentorName,
        program.date,
        program.time,
        program.location,
        applicant.name,
        applicant.studentId,
        applicant.department,
        applicant.email,
        applicant.phone,
        applicant.privacyAgree || '예'
      ]);
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(2, 10, rows.length, 1).setNumberFormat('@');
  }
  sheet.autoResizeColumns(1, headers.length);

  return `'${sheetName}' 시트에 ${rows.length}건의 신청 정보를 기록했습니다.`;
}

// 통계 데이터 가져오기
function getStatistics() {
  const data = getAdminDashboardData();
  
  // 날짜별 통계
  const dateStats = {};
  for (const program of data.allPrograms) {
    if (!dateStats[program.date]) {
      dateStats[program.date] = {
        programCount: 0,
        totalApplications: 0
      };
    }
    dateStats[program.date].programCount++;
    dateStats[program.date].totalApplications += program.applicantCount;
  }
  
  // 멘토별 통계
  const mentorStats = {};
  for (const program of data.allPrograms) {
    if (!mentorStats[program.mentorName]) {
      mentorStats[program.mentorName] = {
        programCount: 0,
        totalApplications: 0
      };
    }
    mentorStats[program.mentorName].programCount++;
    mentorStats[program.mentorName].totalApplications += program.applicantCount;
  }
  
  return {
    dateStats: dateStats,
    mentorStats: mentorStats
  };
}

// 엑셀 다운로드용 데이터 준비
function prepareExcelData() {
  const data = getAdminDashboardData();
  const exportData = [
    ['프로그램ID', '멘토이름', '날짜', '시간', '장소', '신청인원', '신청자명단', '연락처']
  ];
  
  for (const program of data.allPrograms) {
    const applicantNames = program.applicants.map(a => a.name).join(', ');
    const applicantPhones = program.applicants.map(a => a.phone).join(', ');
    
    exportData.push([
      program.programId,
      program.mentorName,
      program.date,
      program.time,
      program.location,
      `${program.applicantCount}/${program.maxCapacity}`,
      applicantNames || '신청자 없음',
      applicantPhones || '-'
    ]);
  }
  
  return exportData;
}
