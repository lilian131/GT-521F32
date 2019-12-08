/**
 * File: gt521f32.js
 * Module: GT521F32
 * Author: Alberto Garbui
 * Created: 06/12/2019
 * Version: 1.0
 * Description: lib module GT521F32
 * Modification History:
 ==============================================
 * Version | Changes
 ==============================================
 * 0.1 File creation
 ==============================================
 */

const SerialPort = require('serialport');
const Promise = require('promise');
const Async = require('async');

//GT-511C3 device ID
var DEVICE_ID = 0x0001;

//GT-511C3 command list
var OPEN = 0x01,
  CLOSE = 0x02,
  USB_INTERNAL_CHECK = 0x03,
  CHANGE_BAUDRATE = 0x04,
  SET_IAP_MODE = 0x05,
  CMOS_LED = 0x12,
  GET_ENROLL_COUNT = 0x20,
  CHECK_ENROLLED = 0x21,
  ENROLL_START = 0x22,
  ENROLL_1 = 0x23,
  ENROLL_2 = 0x24,
  ENROLL_3 = 0x25,
  IS_PRESS_FINGER = 0x26,
  DELETE_ID = 0x40,
  DELETE_ALL = 0x41,
  VERIFY = 0x50,
  IDENTIFY = 0x51,
  VERIFY_TEMPLATE = 0x52,
  IDENTIFY_TEMPLATE = 0x53,
  CAPTURE_FINGER = 0x60,
  MAKE_TEMPLATE = 0x61,
  GET_IMAGE = 0x62,
  GET_RAW_IMAGE = 0x63,
  GET_TEMPLATE = 0x70,
  SET_TEMPLATE = 0x71,
  GET_DATABASE_START = 0x72,
  GET_DATABASE_END = 0x73,
  UPGRADE_FIRMWARE = 0x80,
  UPGRADE_ISO_CD_IMAGE = 0x81,
  ACK = 0x0030,
  NACK = 0x0031;

//GT-511C3 error codes
var NACK_TIMEOUT = 0x1001,
  NACK_INVALID_BAUDRATE = 0x1002,
  NACK_INVALID_POS = 0x1003,
  NACK_IS_NOT_USED = 0x1004,
  NACK_IS_ALREADY_USED = 0x1005,
  NACK_COMM_ERR = 0x1006,
  NACK_VERIFY_FAILED = 0x1007,
  NACK_IDENTIFY_FAILED = 0x1008,
  NACK_DB_IS_FULL = 0x1009,
  NACK_DB_IS_EMPTY = 0x100a,
  NACK_TURN_ERR = 0x100b,
  NACK_BAD_FINGER = 0x100c,
  NACK_ENROLL_FAILED = 0x100d,
  NACK_IS_NOT_SUPPORTED = 0x100e,
  NACK_DEV_ERR = 0x100f,
  NACK_CAPTURE_CANCELED = 0x1010,
  NACK_INVALID_PARAM = 0x1011,
  NACK_FINGER_IS_NOT_PRESSED = 0x1012;

//GT-521F32 paramaters
var NO_EXTRA_INFO = 0x00, //command OPEN
  EXTRA_INFO = 0x01,
  LED_OFF = 0x00, //command CMOS_LED
  LED_ON = 0x01,
  NOT_BEST_IMAGE = 0x00, //command CAPTURE_FINGER
  BEST_IMAGE = 0x01;

//error codes human readable
var errors: any = {
  0x1001: 'capture timeout', //obsolete
  0x1002: 'invalid serial baud rate', //obsolete
  0x1003: 'the specified ID is not between 0-199',
  0x1004: 'the specified ID is not used',
  0x1005: 'the specified ID is already used',
  0x1006: 'communication error',
  0x1007: '1:1 verification failure',
  0x1008: '1:N identification failure',
  0x1009: 'the database is full',
  0x100a: 'the database is empty',
  0x100b: 'invalid order of the enrollment', //obsolete
  0x100c: 'too bad fingerprint',
  0x100d: 'enrollment failure',
  0x100e: 'the specified command is not supported',
  0x100f: 'device error, especially if crypto-chip is trouble',
  0x1010: 'the capturing is canceled', //obsolete
  0x1011: 'invalid parameter',
  0x1012: 'finger is not pressed',
};

//start codes
var COMMAND_START_CODE_1 = 0x55,
  COMMAND_START_CODE_2 = 0xaa,
  RESPONSE_START_CODE_1 = 0x55,
  RESPONSE_START_CODE_2 = 0xaa,
  DATA_START_CODE_1 = 0x5a,
  DATA_START_CODE_2 = 0xa5;

//timeout settings (ms)
var SEND_COMMAND_TIMEOUT = 1000,
  SEND_DATA_TIMEOUT = 1000,
  GET_DATA_TIMEOUT = 5000,
  GET_IMAGE_TIMEOUT = 10000,
  INIT_TIMEOUT = 5000;

export class GT521F32 {
  firmwareVersion = '';
  isoAreaMaxSize = 0;
  deviceSerialNumber = '';
  serialPort: any;
  NO_EXTRA_INFO = NO_EXTRA_INFO;
  EXTRA_INFO = EXTRA_INFO;
  LED_OFF = LED_OFF;
  LED_ON = LED_ON;
  NOT_BEST_IMAGE = NOT_BEST_IMAGE;
  BEST_IMAGE = BEST_IMAGE;
  NACK_TIMEOUT = NACK_TIMEOUT;
  NACK_INVALID_BAUDRATE = NACK_INVALID_BAUDRATE;
  NACK_INVALID_POS = NACK_INVALID_POS;
  NACK_IS_NOT_USED = NACK_IS_NOT_USED;
  NACK_IS_ALREADY_USED = NACK_IS_ALREADY_USED;
  NACK_COMM_ERR = NACK_COMM_ERR;
  NACK_VERIFY_FAILED = NACK_VERIFY_FAILED;
  NACK_IDENTIFY_FAILED = NACK_IDENTIFY_FAILED;
  NACK_DB_IS_FULL = NACK_DB_IS_FULL;
  NACK_DB_IS_EMPTY = NACK_DB_IS_EMPTY;
  NACK_TURN_ERR = NACK_TURN_ERR;
  NACK_BAD_FINGER = NACK_BAD_FINGER;
  NACK_ENROLL_FAILED = NACK_ENROLL_FAILED;
  NACK_IS_NOT_SUPPORTED = NACK_IS_NOT_SUPPORTED;
  NACK_DEV_ERR = NACK_DEV_ERR;
  NACK_CAPTURE_CANCELED = NACK_CAPTURE_CANCELED;
  NACK_INVALID_PARAM = NACK_INVALID_PARAM;
  NACK_FINGER_IS_NOT_PRESSED = NACK_FINGER_IS_NOT_PRESSED;

  DEBUG: number | boolean = false;
  BAUDRATE = 9600;
  ACTUAL_BAUDRATE: any;
  PORT: any;
  DATA_PACKET_LENGTH: any;
  BUFFERSIZE = 100000;

  mainBuff = new Buffer(0);

  send_command_timeout: any;
  constructor() {}

  decodeError = (errorCode: any) => errors[errorCode];

  checkCRC = (buffer: any) => {
    let sum = 0;
    for (let i = 0; i < buffer.length - 2; i++) sum += buffer[i];
    return (sum & 0xffff) == buffer.readUInt16LE(buffer.length - 2);
  };

  parser = (emitter: any, buffer: any) => {
    buffer = Buffer.concat([this.mainBuff, buffer]);

    if (buffer[0] == RESPONSE_START_CODE_1 && buffer[1] == RESPONSE_START_CODE_2 && buffer.length >= 12) {
      //lets take the 12bytes response
      let response = new Buffer(buffer.slice(0, 12));

      //remaining bytes
      buffer = new Buffer(buffer.slice(12));

      var response_packet = {
        parameter: response.readUInt16LE(4),
        ack: response.readUInt16LE(8) == ACK,
        crc: this.checkCRC(response),
      };

      emitter.emit('response_packet', response_packet);
    }
    if (buffer[0] == DATA_START_CODE_1 && buffer[1] == DATA_START_CODE_2 && buffer.length >= this.DATA_PACKET_LENGTH) {
      //remove header
      var data = buffer.slice(0, this.DATA_PACKET_LENGTH);

      var crc = this.checkCRC(data);

      //remove 2 bytes CRC + header
      data = new Buffer(data.slice(4, data.length - 2));

      //remaining bytes
      buffer = new Buffer(buffer.slice(this.DATA_PACKET_LENGTH));

      var data_packet = {
        data: data,
        crc: crc,
      };

      emitter.emit('data_packet', data_packet);
    }

    this.mainBuff = new Buffer(buffer);
  };

  setPort = (port: any, baudrate: any) => {
    this.serialPort = new SerialPort(
      port,
      {
        baudrate: baudrate,
        databits: 8,
        stopbits: 1,
        parity: 'none',
        buffersize: this.BUFFERSIZE,
        parser: this.parser,
      },
      false,
    );
  };

  openPort() {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      self.serialPort.open((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  GT511C3(port: any, config: any) {
    if (config != undefined) {
      this.DEBUG = config.debug | 0;
      this.BAUDRATE = config.baudrate;
    }
    this.PORT = port;
  }

  sendCommand = (cmd: any, params?: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var buffer = new Buffer(12);

      buffer.writeUInt8(COMMAND_START_CODE_1, 0);
      buffer.writeUInt8(COMMAND_START_CODE_2, 1);
      buffer.writeUInt16LE(DEVICE_ID, 2);
      buffer.writeUInt32LE(params | 0, 4);
      buffer.writeUInt8(cmd, 8);
      buffer.writeUInt8(0, 9);

      let checkSum = 0;
      for (let i = 0; i < 10; i++) {
        checkSum += buffer.readUInt8(i);
      }

      buffer.writeUInt16LE(checkSum, 10);

      this.send_command_timeout = setTimeout(() => {
        reject('timeout!');
      }, SEND_COMMAND_TIMEOUT);

      self.serialPort.removeAllListeners('response_packet');
      self.serialPort.on('response_packet', (response: any) => {
        if (self.DEBUG)
          console.log(
            'got a response[' +
              (response.crc ? 'CRC' : '!CRC') +
              '][' +
              (response.ack ? 'ACK' : 'NACK!') +
              '] params: ' +
              response.parameter,
          );
        clearTimeout(this.send_command_timeout);
        if (!response.ack) {
          if (response.parameter < 200) {
            reject('duplicated ID: ' + response.parameter);
          } else {
            //reject(errors[response.parameter]); //string representation of the error code
            reject(response.parameter); //error code
          }
        } else {
          resolve(response.parameter);
        }
      });

      self.serialPort.flush((err: any) => {
        if (err) {
          clearTimeout(this.send_command_timeout);
          reject('send command error flush: ' + err);
        } else {
          self.serialPort.write(buffer, (err: any, nbytes: any) => {
            if (err) {
              clearTimeout(this.send_command_timeout);
              reject('send command error: ' + err);
            } else {
              if (self.DEBUG) console.log('sending ' + buffer.toString('hex') + ' [' + nbytes + ' bytes]...');
              self.serialPort.drain((err: any) => {
                if (err) {
                  clearTimeout(this.send_command_timeout);
                  reject('send command drain error: ' + err);
                } else {
                  if (self.DEBUG) console.log('command sent!');
                }
              });
            }
          });
        }
      });
    });
  };

  sendData = (data: any, len: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var buffer = new Buffer(len + 6);

      buffer.writeUInt8(DATA_START_CODE_1, 0);
      buffer.writeUInt8(DATA_START_CODE_2, 1);
      buffer.writeUInt16LE(DEVICE_ID, 2);

      data = new Buffer(data);
      data.copy(buffer, 4, 0, len);

      var checkSum = 0;
      for (var i = 0; i < len + 4; i++) checkSum += buffer.readUInt8(i);

      buffer.writeUInt16LE(checkSum & 0xffff, len + 4);

      var send_data_timeout = setTimeout(() => {
        reject('timeout!');
      }, SEND_DATA_TIMEOUT);

      self.serialPort.removeAllListeners('response_packet');
      self.serialPort.on('response_packet', (response: any) => {
        if (self.DEBUG)
          console.log(
            'got a response[' +
              (response.crc ? 'CRC' : '!CRC') +
              '][' +
              (response.ack ? 'ACK' : 'NACK!') +
              '] params: ' +
              response.parameter,
          );
        clearTimeout(send_data_timeout);
        if (!response.ack) {
          //reject(errors[response.parameter]); //string representation of the error code
          reject(response.parameter); //error code
        } else {
          resolve(response.parameter);
        }
      });

      self.serialPort.flush((err: any) => {
        if (err) {
          clearTimeout(this.send_command_timeout);
          reject('sendData command error flush: ' + err);
        } else {
          self.serialPort.write(buffer, (err: any, nbytes: any) => {
            if (err) {
              clearTimeout(send_data_timeout);
              reject('sendData command error: ' + err);
            } else {
              if (self.DEBUG) console.log('sending data [' + nbytes + ' bytes]...');
              self.serialPort.drain((err: any) => {
                if (err) {
                  clearTimeout(send_data_timeout);
                  reject('sendData command drain error: ' + err);
                } else {
                  if (self.DEBUG) console.log('data sent!');
                }
              });
            }
          });
        }
      });
    });
  };

  setDefaultListeners = () => {
    this.serialPort.removeAllListeners('error');
    this.serialPort.on('error', (err: any) => {
      console.log('serialport error: ' + err);
    });

    this.serialPort.removeAllListeners('close');
    this.serialPort.on('close', (err: any) => {
      if (err) {
        console.log('error while closing: ' + err);
      } else {
        if (this.DEBUG) console.log('serialport successfully closed!');
      }
    });
  };

  init = () => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var funList = [];

      var init_timeout: any;

      const fun = (baudrate: any, callback: any) => {
        let open = () => {
          self.ACTUAL_BAUDRATE = baudrate;

          init_timeout = setTimeout(() => {
            reject('init timeout');
          }, INIT_TIMEOUT);

          self.setDefaultListeners();

          self.DATA_PACKET_LENGTH = 30;
          self.serialPort.removeAllListeners('data_packet');
          self.serialPort.on('data_packet', (response: any) => {
            if (self.DEBUG)
              console.log(
                'data[' + (response.crc ? 'CRC' : '!CRC') + '][' + response.data.length + ']:' + response.data,
              );
            if (response.crc) {
              response.data = new Buffer(response.data);
              self.firmwareVersion = response.data.readUInt32LE(0).toString(16);
              self.isoAreaMaxSize = response.data.readUInt32LE(4);
              self.deviceSerialNumber = response.data.slice(8).toString('hex');
            }
            clearTimeout(init_timeout);

            if (self.BAUDRATE != self.ACTUAL_BAUDRATE) {
              self.changeBaudRate(self.BAUDRATE).then(
                () => {
                  if (self.DEBUG) console.log('baudrate set to: ' + self.BAUDRATE);
                  resolve();
                },
                (err: any) => {
                  reject('init - change baudrate error: ' + err);
                },
              );
            } else {
              resolve();
            }
          });

          return self.open(self.EXTRA_INFO);
        };

        if (self.DEBUG) console.log('init GT511-C3 at ' + baudrate + ' baud...');

        self.setPort(self.PORT, baudrate);
        self
          .openPort()
          .then(open)
          .then(
            () => {
              //well done, port open!
            },
            (err: any) => {
              if (self.DEBUG) console.log('init error: ' + err);
              clearTimeout(init_timeout);
              self.closePort().then(callback);
            },
          );
      };

      funList.push((callback: any) => {
        fun(9600, callback);
      });
      funList.push((callback: any) => {
        fun(115200, callback);
      });
      funList.push((callback: any) => {
        fun(57600, callback);
      });
      funList.push((callback: any) => {
        fun(38400, callback);
      });
      funList.push((callback: any) => {
        fun(19200, callback);
      });

      Async.series(funList, (done: any) => {
        if (!done) {
          reject('didnt match any baudrate!');
        }
      });
    });
  };

  setListener = (event: any, callback: any) => {
    this.serialPort.removeAllListeners(event);
    this.serialPort.on(event, callback);
  };

  open = (extra_info: any) => this.sendCommand(OPEN, extra_info);

  close = () => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      self.sendCommand(CLOSE).then(
        () => {
          self.serialPort.close((err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        },
        (err: any) => {
          reject(err);
        },
      );
    });
  };

  closePort = () => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      self.serialPort.close((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  usbInternalCheck = () => this.sendCommand(USB_INTERNAL_CHECK);

  ledONOFF = (led_state: any) => this.sendCommand(CMOS_LED, led_state);

  delay_ms(ms: any) {
    return new Promise((resolve: any, reject: any) => {
      setTimeout(resolve, ms);
    });
  }

  changeBaudRate = (baudrate: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      if (self.ACTUAL_BAUDRATE == baudrate)
        reject('change baudrate error: baudrate already set to ' + self.ACTUAL_BAUDRATE);

      var changeBaudrate = (br: any) => {
        return self.sendCommand(CHANGE_BAUDRATE, br);
      };
      var closePort = () => {
        return self.closePort();
      };
      var setPort = () => {
        return self.setPort(self.PORT, baudrate);
      };
      var openPort = () => {
        return self.openPort();
      };

      var wait = () => {
        return new Promise((resolve: any, reject: any) => {
          setTimeout(resolve, 200);
        });
      };

      changeBaudrate(baudrate)
        .then(wait)
        .then(closePort)
        .then(setPort)
        .then(openPort)
        .then(
          () => {
            self.ACTUAL_BAUDRATE = baudrate;
            resolve();
          },
          (err: any) => {
            reject(err);
          },
        );
    });
  };

  getEnrollCount = () => this.sendCommand(GET_ENROLL_COUNT);

  checkEnrolled = (ID: any) => this.sendCommand(CHECK_ENROLLED, ID);

  enrollStart = (ID: any) => this.sendCommand(ENROLL_START, ID);

  enroll1 = () => this.sendCommand(ENROLL_1);

  enroll2 = () => this.sendCommand(ENROLL_2);

  enroll3 = () => this.sendCommand(ENROLL_3);

  isPressFinger = () => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      self.sendCommand(IS_PRESS_FINGER).then((parameter: any) => {
        if (parameter == 0) {
          resolve();
        } else {
          reject('finger is not pressed');
        }
      });
    });
  };

  waitFinger = (timeout: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var wait_finger_timeout: any = setTimeout(() => {
        reject('wait_finger_timeout!');
        wait_finger_timeout = null;
      }, timeout);

      var checkFinger = () => {
        self.isPressFinger().then(
          () => {
            resolve();
          },
          (err: any) => {
            if (wait_finger_timeout != null) checkFinger();
          },
        );
      };

      checkFinger();
    });
  };

  waitReleaseFinger = (timeout: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var finger_release_timeout: any = setTimeout(() => {
        reject('finger_release_timeout!');
        finger_release_timeout = null;
      }, timeout);

      var checkFinger = () => {
        self.isPressFinger().then(
          () => {
            if (finger_release_timeout != null) checkFinger();
          },
          (err: any) => {
            resolve();
          },
        );
      };

      checkFinger();
    });
  };

  enroll = (ID: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      let errorHandler = (err: any) => {
        reject(err);
      };
      const start = () => self.enrollStart(ID);
      const capture = () => self.captureFinger(BEST_IMAGE);
      const waitFinger = () => self.waitFinger(10000);
      const waitReleaseFinger = () => self.waitReleaseFinger(10000);
      const enroll_delay = () => self.delay_ms(500);
      const blink_delay = () => self.delay_ms(100);
      const ledON = () => self.ledONOFF(1);
      const ledOFF = () => self.ledONOFF(0);

      ledON()
        .then(waitFinger)
        .then(start)
        .then(capture)
        .then(() => self.enroll1())
        .then(ledOFF)
        .then(blink_delay)
        .then(ledON)
        .then(waitReleaseFinger)

        .then(enroll_delay)

        .then(waitFinger)
        .then(capture)
        .then(() => self.enroll2())
        .then(ledOFF)
        .then(blink_delay)
        .then(ledON)
        .then(waitReleaseFinger)

        .then(enroll_delay)

        .then(waitFinger)
        .then(capture)
        .then(() => self.enroll3())
        .then(ledOFF)

        .then(
          () => {
            resolve();
          },
          (err: any) => {
            ledOFF();
            reject(err);
          },
        );
    });
  };

  deleteID = (ID: any) => this.sendCommand(DELETE_ID, ID);

  deleteAll = () => this.sendCommand(DELETE_ALL);

  verify = (ID: any) => this.sendCommand(VERIFY, ID);

  identify = () => this.sendCommand(IDENTIFY);

  verifyTemplate = (ID: any, template: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      self.sendCommand(VERIFY_TEMPLATE, ID).then(
        () => {
          self.sendData(template, 498).then(
            () => {
              resolve();
            },
            (err: any) => {
              reject(err);
            },
          );
        },
        (err: any) => {
          reject(err);
        },
      );
    });
  };

  identifyTemplate = (template: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      self.sendCommand(IDENTIFY_TEMPLATE).then(
        () => {
          self.sendData(template, 498).then(
            (ID: any) => {
              resolve(ID);
            },
            (err: any) => {
              reject(err);
            },
          );
        },
        (err: any) => {
          reject(err);
        },
      );
    });
  };

  captureFinger = (image_type: any) => this.sendCommand(CAPTURE_FINGER, image_type);

  makeTemplate = () => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      let makeTemplate_timeout = setTimeout(() => {
        reject('makeTemplate_timeout!');
      }, GET_DATA_TIMEOUT);

      self.DATA_PACKET_LENGTH = 498 + 6; //498bytes
      self.serialPort.removeAllListeners('data_packet');
      self.serialPort.on('data_packet', (response: any) => {
        if (self.DEBUG)
          console.log('data[' + (response.crc ? 'CRC' : '!CRC') + '][' + response.data.length + ']:' + response.data);
        clearInterval(makeTemplate_timeout);
        resolve(response.data);
      });

      self.sendCommand(MAKE_TEMPLATE).then(
        () => {
          if (self.DEBUG) console.log('makeTemplate ACK!');
        },
        (err: any) => {
          clearInterval(makeTemplate_timeout);
          reject(err);
        },
      );
    });
  };

  getImage = () => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var getImage_timeout = setTimeout(() => {
        reject('getImage_timeout!');
      }, GET_IMAGE_TIMEOUT);

      //258x202 - 52116bytes (image 256x256) + 4bytes HEADER + 2bytes CRC
      self.DATA_PACKET_LENGTH = 52116 + 6;
      self.serialPort.removeAllListeners('data_packet');
      self.serialPort.on('data_packet', (response: any) => {
        if (self.DEBUG)
          console.log('data[' + (response.crc ? 'CRC' : '!CRC') + '][' + response.data.length + ']:' + response.data);
        clearInterval(getImage_timeout);
        resolve(response.data);
      });

      self.sendCommand(GET_IMAGE).then(
        () => {
          if (self.DEBUG) console.log('getImage ACK!');
        },
        (err: any) => {
          clearInterval(getImage_timeout);
          reject(err);
        },
      );
    });
  };

  getRawImage = () => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var getRawImage_timeout = setTimeout(() => {
        reject('getRawImage_timeout!');
      }, GET_IMAGE_TIMEOUT);

      //240*320/4 = 19200 bytes (image 320x240) + 4bytes HEADER + 2bytes CRC
      self.DATA_PACKET_LENGTH = 19200 + 6;
      self.serialPort.removeAllListeners('data_packet');
      self.serialPort.on('data_packet', (response: any) => {
        if (self.DEBUG)
          console.log('raw[' + (response.crc ? 'CRC' : '!CRC') + '][' + response.data.length + ']:' + response.data);
        clearInterval(getRawImage_timeout);
        resolve(response.data);
      });

      self.sendCommand(GET_RAW_IMAGE).then(
        () => {
          if (self.DEBUG) console.log('getRawImage ACK!');
        },
        (err: any) => {
          clearInterval(getRawImage_timeout);
          reject(err);
        },
      );
    });
  };

  getTemplate = (ID: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      var getTemplate_timeout = setTimeout(() => {
        reject('getTemplate_timeout!');
      }, GET_DATA_TIMEOUT);

      self.DATA_PACKET_LENGTH = 498 + 6; //498bytes
      self.serialPort.removeAllListeners('data_packet');
      self.serialPort.on('data_packet', (response: any) => {
        if (self.DEBUG)
          console.log('data[' + (response.crc ? 'CRC' : '!CRC') + '][' + response.data.length + ']:' + response.data);
        clearInterval(getTemplate_timeout);
        resolve(response.data);
      });

      self.sendCommand(GET_TEMPLATE, ID).then(
        () => {
          if (self.DEBUG) console.log('getTemplate ACK!');
        },
        (err: any) => {
          clearInterval(getTemplate_timeout);
          reject(err);
        },
      );
    });
  };

  setTemplate = (ID: any, template: any) => {
    var self = this;
    return new Promise((resolve: any, reject: any) => {
      self.sendCommand(SET_TEMPLATE, ID).then(
        () => {
          self.sendData(template, 498).then(
            () => {
              resolve();
            },
            (err: any) => {
              reject('send data: ' + err);
            },
          );
        },
        (err: any) => {
          reject('send command: ' + err);
        },
      );
    });
  };
}
