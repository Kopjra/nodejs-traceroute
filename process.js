'use strict';

const spawn = require('child_process').spawn;
const events = require('events');
const readline = require('readline');
const validator = require('validator');
const stream = require('stream');
const fs = require('fs');

class Process extends events.EventEmitter {
    constructor(command, args, logfilePostfix) {
        super();

        this.command = command;
        this.args = args;
        this.logfilePostfix = logfilePostfix;
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

        const lastarg = this.args[this.args.length - 1];
        const streamname = `traceroute_${lastarg}_${this.logfilePostfix}.log`;

        let isDestinationCaptured = false;
        if (process.pid) {
            let ws = fs.createWriteStream(streamname);
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

        return streamname;
    }

    isValidDomainName(domainName) {
        return validator.isFQDN(domainName + '') || validator.isIP(domainName + '');
    }

    parseDestination(data) {}
    parseHop(hopData) {}
}

module.exports = Process;