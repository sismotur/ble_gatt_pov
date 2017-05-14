/**
 * SIMPLE GATT SERVER
 * name: ble_challenge
 * author: Felipe Santi
 * copyright: Sismotur 2017 (C) All Rights Reserved
 */

// requires
var bleno = require('bleno');
var crypto = require('./crypto_gatt');

// initial set up - max 21 chars due to BLE limit
var _nonceLength = 21;
var _timeStr;
var _timeStartMillis;
var _timeStopMillis;
var _timeElapsedMillis;
var _timeLimitMillis = 30000; // 60 seconds
var _currentNonce;
var _mockChallengeSolution = "inventrip";
var _POV;
var _POV_STATE;

// operation codes
var _POV_STATE_SUCCESS = 1;

// global methods

// resets the global variables
var reset_challenge = function() {
    _POV = "";
    _POV_STATE = 0;
    _currentNonce = "";
    _fullChallenge = "";
    _timeStartMillis = new Date();
    _timeStopMillis = 0;
    _timeElapsedMillis = 0;
    _timeStr = new Date().toISOString();
}

// Advertise the BLE adrress when bleno start
bleno.on('stateChange', function(state) {
    console.log('State change: ' + state);
        if(state === 'poweredOn') {
        reset_challenge();
        bleno.startAdvertising('RaspberryPi',['12ab']);
        } else {
        bleno.stopAdvertising();
        }
});

// Log when accepting connections
bleno.on('accept', function(clientAddress) {
    console.log('Accepted connection from address: ' + clientAddress);
    console.log('Current GMT time: ' + _timeStr.replace(/T/,' '));
});

// Disconnect callback: reset the challenge
bleno.on('disconnect', function(clientAddress) {
    console.log('Disconnected from address: ' + clientAddress);
    reset_challenge();
});

// Create a new service and characteristic when advertising begins
bleno.on('advertisingStart', function(error) {
    if(error) {
        console.log("Advertising start error: " + error);
    } else {
        console.log("Advertising start success");
        bleno.setServices([
        // SERVICE PROOF OF VISIT
            new bleno.PrimaryService({
                uuid: 'ace0',
            characteristics: [
                // CHARACTERISTIC 1. Entry point - get a fresh random nonce
                new bleno.Characteristic({
                    value:null,
                    uuid:'0001',
                    properties: ['read'],
                    descriptors: [
                        new bleno.Descriptor({
                            uuid: '0001',
                            value: 'Proof of Visit entry: serves a nonce string'
                        })
                    ],
                    // on read request, send a message back with the value and reset the challenge
                    onReadRequest: function(offset, callback) {
                        this._currentNonce = crypto.nonce(_nonceLength);
                        console.log("****************************************");
                        console.log("Proof of Visit read: nonce is: " + this._currentNonce);
                        reset_challenge();
                        console.log('Current GMT time: ' + _timeStr.replace(/T/,' '));
                        console.log("Maximum time to solve the challenge is: " + 
                                (_timeLimitMillis / 1000).toString() + " seconds");
                        callback(this.RESULT_SUCCESS, new Buffer(this._currentNonce));
                    }
                }),
                // CHARACTERISTIC 2. Receive and check client submission
                new bleno.Characteristic({
                    value:null,
                    uuid:'0002',
                    properties: ['write'],
                    descriptors: [
                        new bleno.Descriptor({
                            uuid: '0001',
                            value: 'Write here the challenge string'
                        })
                    ],
                    // on write request, log in the console the value
                    onWriteRequest: function(data, offset, withoutResponse, callback) {

                        // check the counter
                        this._timeStopMillis = new Date();
                        this._timeElapsedMillis = this._timeStopMillis - this._timeStartMillis
                        
                        // print the timer
                        console.log("****************************************");
                        console.log("Challenge submission");
                        console.log("Time elapsed : " + (this._timeElapsedMillis / 1000).toString()); 

                        if(offset) {
                            callback(this.RESULT_ATTR_NOT_LONG);
                            console.log("Challenge string invalid (nil)");
                        } else if (data.length < 4) {
                            console.log("Challenge string invalid (min 4 characters)");
                            callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
                        } else if (_timeElapsedMillis > _timeLimitMillis) { 
                            console.log("Challenge timeout");
                            callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
                        } else {
                            var _challenge = data.toString('utf-8');
                            console.log("Challenge string submitted: " + _challenge);
                            this._fullChallenge += _challenge
                            console.log("Full challenge string submitted: " + this._fullChallenge);
                            // Check if the solution 
                            if (_fullChallenge === _mockChallengeSolution) { 
                                this._POV = "{pubkey:'12345',sig:'abcdef'}"
                                this._POV_STATE = _POV_STATE_SUCCESS;
                            } else {
                                console.log("Invalid solution");
                            }
                            callback(this.RESULT_SUCCESS);
                        }
                    }
                }),
                // CHARACTERISTIC 3. Receive signed POV
                new bleno.Characteristic({
                    value:null,
                    uuid:'0003',
                    properties: ['notify'],
                    descriptors: [
                        new bleno.Descriptor({
                            uuid: '0001',
                            value: 'Receive here your POV notification'
                        })
                    ],
                    // on subscription request, log to the console
                    onSubscribe: function(maxValueSize, updateValueCallback) {
                        console.log("****************************************");
                        console.log("Subscribed to the POV notification characteristic");
                        this.intervalId = setInterval(function() {
                            // Send the POV once it is available
                            if (_POV !== "") {
                                console.log("Notification value is: " + this._POV_STATE);
                                updateValueCallback(new Buffer(this._POV_STATE.toString('utf-8')));
                            }
                        },1000)
                    },
                    // on unsubscriptioni, log into the console
                    onUnsubscribe: function(offset, callback) {
                        console.log("Unsubscribed to the POV notification characteristic");
                    }
                })
            ]
        })
        ])
    }
});
