export const STATES = {
  none: 'none',
  active: 'active',
  on_break: 'on_break',
  pending_approval: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
  auto_closed: 'auto_closed',
  correction_requested: 'correction_requested',
};

export const EVENTS = {
  check_in: 'check_in',
  break_start: 'break_start',
  break_end: 'break_end',
  check_out: 'check_out',
  auto_check_out: 'auto_check_out',
  correction_requested: 'correction_requested',
  admin_approved: 'admin_approved',
  admin_rejected: 'admin_rejected',
};

const TRANSITIONS = {
  none: {
    check_in: 'active',
  },
  active: {
    break_start: 'on_break',
    check_out: 'pending_approval',
    auto_check_out: 'auto_closed',
  },
  on_break: {
    break_end: 'active',
  },
  pending_approval: {
    admin_approved: 'approved',
    admin_rejected: 'rejected',
    correction_requested: 'correction_requested',
  },
  approved: {
    correction_requested: 'correction_requested',
  },
  rejected: {
    correction_requested: 'correction_requested',
  },
  auto_closed: {
    admin_approved: 'approved',
    admin_rejected: 'rejected',
  },
  correction_requested: {
    admin_approved: 'approved',
    admin_rejected: 'rejected',
  },
};

export function isValidTransition(currentState, event) {
  const state = currentState || 'none';
  const transitions = TRANSITIONS[state];
  if (!transitions) return false;
  return event in transitions;
}

export function getNextState(currentState, event) {
  if (!isValidTransition(currentState, event)) {
    throw new Error(`Invalid transition: ${currentState} -> ${event}`);
  }
  const state = currentState || 'none';
  return TRANSITIONS[state][event];
}

export function getAllowedEvents(currentState) {
  const state = currentState || 'none';
  const transitions = TRANSITIONS[state];
  return transitions ? Object.keys(transitions) : [];
}

export function canCheckIn(currentState) {
  return isValidTransition(currentState, 'check_in');
}

export function canCheckOut(currentState) {
  return isValidTransition(currentState, 'check_out');
}

export function canStartBreak(currentState) {
  return isValidTransition(currentState, 'break_start');
}

export function canEndBreak(currentState) {
  return isValidTransition(currentState, 'break_end');
}
