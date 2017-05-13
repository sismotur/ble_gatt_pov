/**
 * SIMPLE GATT SERVER
 * name: ble_challenge
 * author: Felipe Santi
 * copyright: Sismotur 2017 (C) All Rights Reserved
 */

// requires
var bleno = require('bleno');
var crypto = require('./crypto');

// initial set up - max 21 chars due to BLE limit
var _nonce_length = 21;
var reset_challenge = function() {
    _full_challenge = "";
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
                        var _nonce = crypto.nonce(_nonce_length);
                        reset_challenge();
                        console.log("Proof of Visit read: nonce is: " + _nonce);
                        callback(this.RESULT_SUCCESS, new Buffer(_nonce));
                    }
                }),
                // CHARACTERISTIC 2. Receive public key, nonce, signature
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
                        if(offset) {
                            callback(this.RESULT_ATTR_NOT_LONG);
                            console.log("Challenge string invalid (nil)");
                        } else if (data.length < 4) {
                            console.log("Challenge string invalid (min 4 characters)");
                            callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
                        } else {
                            var _challenge = data.toString('utf-8');
                            console.log("Challenge string trial: " + _challenge);
                            _full_challenge += _challenge
                            console.log("Full challenge string trial: " + _full_challenge);
                            callback(this.RESULT_SUCCESS);
                        }
                    }
                })
            ]
        })
        ])
    }
});
