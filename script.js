// ####################################################################
// Definition of ioBroker datapoints
// ####################################################################

var myTimeout;

const mowerState = 'CHANGE_ME'; // emitted by smartgarden adapter
const batteryLevelState = 'CHANGE_ME'; // emitted by smartgarden adapter
const shellyState = 'CHANGE_ME'; // accessed through shelly adapter
const doorStateGlobal = 'CHANGE_ME'; // local state created by JS adapter
const mowerTimeplanState = 'CHANGE_ME'; // emitted by gardena adapter

// ####################################################################
// Functions to open/close roller shutter through shelly relais
// ####################################################################

function openDoor() {
    let doorState = getState(doorStateGlobal).val;
    if (doorState == 'closed') {
        console.log('[# DOOR #] Opening...');
        setState(shellyState + '.Open', true);
        setState('javascript.0.nextOpen', 'open');
    } else {
        console.log('[# DOOR #] Already open');
    }
}

function closeDoor() {
    let doorState = getState(doorStateGlobal).val;
    if (doorState == 'open') {
        setState(shellyState + '.Close', true);
        console.log('[# DOOR #] Closing...');
        setState('javascript.0.nextOpen', 'closed');
    } else {
        console.log('[# DOOR #] Already closed');
    }
}

function setNextOpenTime(mowerStartTime, delta) {
    let openTime = new Date(mowerStartTime - 1000 * delta);
    console.log(
        '[# DOOR-SCHEDULER #] Next open at ' +
            openTime +
            ' scheduled by Mower timeplan change'
    );
    clearTimeout(myTimeout);
    myTimeout = setTimeout(openDoor, openTime.getTime() - Date.now());
}

// ###########################################################################################
// Listeners to events emited from gardena mower API (accessed through smartgarden adapter)
// ###########################################################################################

// Set new open time if mower changed next start time
on(mowerTimeplanState, function (obj) {
    if (obj.state.val != '1969-12-31T22:00Z') {
        let time = new Date(obj.state.val);
        setNextOpenTime(time, 10);
    }
});

// Initialize next open time if script restarted
if (getState(mowerTimeplanState).val != '1969-12-31T22:00Z') {
    let time = new Date(getState(mowerTimeplanState).val);
    setNextOpenTime(time, 10);
}

on(batteryLevelState, function (obj) {
    let currentMowerState = getState(mowerState).val;
    if (obj.state.val == '99' && currentMowerState == 'OK_CHARGING') {
        console.log(
            '[# DOOR-SCHEDULER #] Mower battery state 99%. Leaving soon. Opening door.'
        );
        openDoor();
    }
});

on(mowerState, function (obj) {
    if (obj.state.val == 'OK_LEAVING') {
        console.log(
            '[# DOOR-SCHEDULER #] Mower left. Closing door in 10s [' +
                obj.state.val +
                ']'
        );
        setTimeout(closeDoor, 10 * 1000);
    }
    if (obj.state.val == 'OK_SEARCHING') {
        console.log(
            '[# DOOR-SCHEDULER #] Mower is coming back. Opening door [' +
                obj.state.val +
                ']'
        );
        openDoor();
    }
    if (
        obj.state.val == 'PARKED_TIMER' ||
        obj.state.val == 'PARKED_PARK_SELECTED' ||
        obj.state.val == 'PARKED_AUTOTIMER' ||
        obj.state.val == 'OK_CHARGING'
    ) {
        console.log(
            '[# DOOR-SCHEDULER #] Mower is parked. Closing door [' +
                obj.state.val +
                ']'
        );
        closeDoor();
    }
    if (obj.state.val == 'OK_CUTTING') {
        clearTimeout(myTimeout);
    }
});
