// 신청 유효성 검사
function validateApplication(applicationData) {
  // 설정 값
  const maxApplications = 3; // 멘티당 최대 신청 수
  const maxCapacity = typeof PROGRAM_MAX_CAPACITY === 'number' ? PROGRAM_MAX_CAPACITY : 7;

  // 1. 필수 입력값 체크
  if (!applicationData.studentId || !applicationData.name ||
      !applicationData.email || !applicationData.programId) {
    return { isValid: false, message: '필수 정보를 모두 입력해주세요.' };
  }

  const targetProgramId = String(applicationData.programId).trim();
  if (!targetProgramId) {
    return { isValid: false, message: '신청할 프로그램을 선택해주세요.' };
  }

  // 2. 이메일 형식 체크
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(applicationData.email)) {
    return { isValid: false, message: '올바른 이메일 형식이 아닙니다.' };
  }

  const applications = getApplicationData_().values;
  const programData = getProgramData_();
  const programCounts = getApplicationCounts_();

  const normalizedStudentId = normalizeId_(applicationData.studentId);
  let currentApplicationCount = 0;
  let hasDuplicate = false;

  for (let i = 1; i < applications.length; i++) {
    const row = applications[i];
    if (!row || row[8] !== '신청완료') continue;

    const rowStudentId = normalizeId_(row[2]);
    if (rowStudentId !== normalizedStudentId) continue;

    currentApplicationCount++;
    if (row[7] === targetProgramId) {
      hasDuplicate = true;
      break;
    }
  }

  if (hasDuplicate) {
    return { isValid: false, message: '이미 신청한 프로그램입니다.' };
  }

  if (currentApplicationCount >= maxApplications) {
    return {
      isValid: false,
      message: `최대 ${maxApplications}개까지만 신청 가능합니다. 현재 ${currentApplicationCount}개 신청됨.`
    };
  }

  const programEntry = programData && programData.map ? programData.map[targetProgramId] : null;
  if (!programEntry) {
    return { isValid: false, message: '존재하지 않는 프로그램입니다.' };
  }

  const currentProgramCount = programCounts[targetProgramId] || 0;
  if (currentProgramCount >= maxCapacity) {
    return { isValid: false, message: '정원이 마감되었습니다.' };
  }

  const hasConflict = checkTimeConflictInternal(applicationData.studentId, targetProgramId);
  if (hasConflict) {
    return {
      isValid: false,
      message: '이미 신청한 프로그램과 시간이 겹칩니다.'
    };
  }

  return { isValid: true, message: '유효성 검사 통과' };
}

// 학번 형식 검증 (선택사항)
function validateStudentId(studentId) {
  // 학번 형식: 202XXXXXX (9자리 숫자)
  const regex = /^20\d{7}$/;
  return regex.test(studentId);
}

// 전화번호 형식 검증
function validatePhoneNumber(phone) {
  // 010-XXXX-XXXX 형식
  const regex = /^010-\d{4}-\d{4}$/;
  return regex.test(phone);
}
