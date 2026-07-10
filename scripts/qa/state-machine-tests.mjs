import { isValidTransition, getNextState, canCheckIn, canCheckOut, canStartBreak, canEndBreak, STATES, EVENTS } from '../../shared/timesheet/stateMachine.js';

let pass = 0, fail = 0;

function test(label, condition) {
  if (condition) pass++;
  else { fail++; console.error(`FAIL: ${label}`); }
}

// === Valid transitions ===
test('none -> check_in = active', isValidTransition('none', 'check_in') && getNextState('none', 'check_in') === 'active');
test('active -> break_start = on_break', isValidTransition('active', 'break_start') && getNextState('active', 'break_start') === 'on_break');
test('active -> check_out = pending_approval', isValidTransition('active', 'check_out') && getNextState('active', 'check_out') === 'pending_approval');
test('active -> auto_check_out = auto_closed', isValidTransition('active', 'auto_check_out') && getNextState('active', 'auto_check_out') === 'auto_closed');
test('on_break -> break_end = active', isValidTransition('on_break', 'break_end') && getNextState('on_break', 'break_end') === 'active');
test('pending_approval -> admin_approved = approved', isValidTransition('pending_approval', 'admin_approved') && getNextState('pending_approval', 'admin_approved') === 'approved');
test('pending_approval -> admin_rejected = rejected', isValidTransition('pending_approval', 'admin_rejected') && getNextState('pending_approval', 'admin_rejected') === 'rejected');
test('pending_approval -> correction_requested = correction_requested', isValidTransition('pending_approval', 'correction_requested') && getNextState('pending_approval', 'correction_requested') === 'correction_requested');
test('approved -> correction_requested = correction_requested', isValidTransition('approved', 'correction_requested') && getNextState('approved', 'correction_requested') === 'correction_requested');
test('rejected -> correction_requested = correction_requested', isValidTransition('rejected', 'correction_requested') && getNextState('rejected', 'correction_requested') === 'correction_requested');
test('auto_closed -> admin_approved = approved', isValidTransition('auto_closed', 'admin_approved') && getNextState('auto_closed', 'admin_approved') === 'approved');
test('auto_closed -> admin_rejected = rejected', isValidTransition('auto_closed', 'admin_rejected') && getNextState('auto_closed', 'admin_rejected') === 'rejected');
test('correction_requested -> admin_approved = approved', isValidTransition('correction_requested', 'admin_approved') && getNextState('correction_requested', 'admin_approved') === 'approved');
test('correction_requested -> admin_rejected = rejected', isValidTransition('correction_requested', 'admin_rejected') && getNextState('correction_requested', 'admin_rejected') === 'rejected');

// === Invalid transitions ===
test('none -> break_start invalid', !isValidTransition('none', 'break_start'));
test('none -> check_out invalid', !isValidTransition('none', 'check_out'));
test('none -> admin_approved invalid', !isValidTransition('none', 'admin_approved'));
test('active -> check_in invalid', !isValidTransition('active', 'check_in'));
test('on_break -> check_in invalid', !isValidTransition('on_break', 'check_in'));
test('on_break -> check_out invalid', !isValidTransition('on_break', 'check_out'));
test('on_break -> break_start invalid', !isValidTransition('on_break', 'break_start'));
test('pending_approval -> break_start invalid', !isValidTransition('pending_approval', 'break_start'));
test('pending_approval -> check_in invalid', !isValidTransition('pending_approval', 'check_in'));
test('approved -> break_start invalid', !isValidTransition('approved', 'break_start'));
test('approved -> check_in invalid', !isValidTransition('approved', 'check_in'));
test('rejected -> check_in invalid', !isValidTransition('rejected', 'check_in'));
test('auto_closed -> break_start invalid', !isValidTransition('auto_closed', 'break_start'));
test('correction_requested -> check_in invalid', !isValidTransition('correction_requested', 'check_in'));

// === Null/undefined handling ===
test('null state treated as none', isValidTransition(null, 'check_in'));
test('undefined state treated as none', isValidTransition(undefined, 'check_in'));

// === Helper functions ===
test('canCheckIn works for none', canCheckIn('none'));
test('canCheckIn false for active', !canCheckIn('active'));
test('canCheckOut true for active', canCheckOut('active'));
test('canCheckOut false for none', !canCheckOut('none'));
test('canStartBreak true for active', canStartBreak('active'));
test('canStartBreak false for none', !canStartBreak('none'));
test('canEndBreak true for on_break', canEndBreak('on_break'));
test('canEndBreak false for active', !canEndBreak('active'));

const total = pass + fail;
console.log(`\nState machine: ${pass} passed, ${fail} failed (${total} total)`);
process.exit(fail > 0 ? 1 : 0);
