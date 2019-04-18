'use strict';

const spawn = require('child_process').spawn;
const events = require('events');
const readline = require('readline');
const validator = require('validator');
const stream = require('stream');
const fs = require('fs');

class Process extends events.EventEmitter {
    constructor(command, args) {
        super();

        this.command = command;
        this.args = args;
    }

    trace(domainName) {
        if (!this.isValidDomainName(domainName)) {
            throw "Invalid domain name or IP address";
        }

        this.args.push(domainName);

        const process = spawn(this.command, this.args);
        process.on('close', (code) => {
            this.emit('close', code);
        });

        this.emit('pid', process.pid);

        let isDestinationCaptured = false;
        if (process.pid) {
            const nowms = new Date().toISOString().replace(/:/g, "-");
            const now = nowms.substring(0, nowms.length - 5);
            const lastarg = this.args[this.args.length - 1];
            let ws = fs.createWriteStream(`traceroute_${lastarg}_${now}.log`);
            ws.write(`sh-3.2$ ${this.command} ${this.args.join(" ")}\n`, "utf8", () => {});
            let pt = new stream.PassThrough();

            process.stdout.pipe(ws);
            process.stdout.pipe(pt);

            readline.createInterface({
                input: pt,
                terminal: false
            })
                .on('line', (line) => {
                    if (!isDestinationCaptured) {
                        const destination = this.parseDestination(line);
                        if (destination !== null) {
                            this.emit('destination', destination);

                            isDestinationCaptured = true;
                        }
                    }

                    const hop = this.parseHop(line);
                    if (hop !== null) {
                        this.emit('hop', hop);
                    }
                });


        }
    }

    isValidDomainName(domainName) {
        return validator.isFQDN(domainName + '') || validator.isIP(domainName + '');
    }

    parseDestination(data) {}
    parseHop(hopData) {}
}

module.exports = Process;