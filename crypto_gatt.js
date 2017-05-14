/**
 * CRYPTO.JS
 * author: Felipe Santi
 * copyright: Sismotur (C) 2017
 */

// var bitcoin = require('bitcoinjs-lib');


var nonce = function(length) {
    var _n = "";
    var _chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < length; i++) {
        // console.log("loop: " + i.toString());
        _n += _chars.charAt(Math.floor(Math.random() * _chars.length));
    }
    console.log("crypto _n: " + _n.toString("utf-8"));
    return _n.toString("utf-8");
}

module.exports.nonce  = nonce;
