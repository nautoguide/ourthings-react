/** @module Websockets */
import Queueable from "../Queueable";
import wspClient from '@nautoguide/aws-wsp/wsp-client';

/**
 * @classdesc
 *
 * Websockets connection methods
 *
 * @author Richard Reynolds richard@nautoguide.com
 *
 * @example
 * //
 *
 */


export default class Websockets extends Queueable {



	/**
	 * Create a new websocket
	 *
	 * @param {number} pid - Process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.url - URL to connect websocket too
	 * @param {string} json.action - What json param will contain the 'action' router
	 * @param {string} json.queues - Array of {action:"action", queue:"queue" }

	 */
	websocketInit(pid, json) {
		let self = this;
		let options = Object.assign({
			"url": "ws://localhost",
			"queue": "queue",
			"queues": {},
			"recvQeue": false
		}, json);


		self.bulk = self.bulk || [];
		self.bulkQueue = 'bulkQueue';


		self.ws=new wspClient();

		self.ws.onOpen = function() {
			self.queue.setRegister('wsActive');
			self.finished(pid, self.queue.DEFINE.FIN_OK);
		}

		self.ws.onMessage = function (jsonData) {

			self.queue.setMemory(jsonData[options.queue], jsonData, self.queue.DEFINE.MEMORY_SESSION);
			self.queue.setMemory('wsLastRecv', jsonData, self.queue.DEFINE.MEMORY_SESSION);


			/*
			 * Do we need to trigger event? If we have bulk calls coming in then only if its the last
			 */
			let wasBulk = false;
			for (let i in self.bulk) {
				if (self.bulk[i][options.queue] === jsonData[options.queue]) {
					self.bulk.splice(i, 1);
					wasBulk = true;
				}
			}

			if (wasBulk === false) {
				self.queue.execute(jsonData[options.queue]);
				if (options.recvQeue)
					self.queue.execute(options.recvQeue);
			} else {
				if (wasBulk === true && self.bulk.length === 0) {
					self.queue.execute(self.bulkQueue);
					if (options.recvQeue)
						self.queue.execute(options.recvQeue);
				}
			}
		}

		self.ws.onClose =function(event) {
			self.queue.setMemory('wsCloseDetails', event, self.queue.DEFINE.MEMORY_SESSION);
			self.queue.execute("wsClose");
		}


		self.ws.onError =function(event) {
			self.queue.setMemory('wsErrorDetails', event, self.queue.DEFINE.MEMORY_SESSION);
			self.queue.execute("wsError");
		}

		self.ws.open({url:options.url});

	}

	websocketClose(pid,json) {
		this.ws.close();
		this.finished(pid, this.queue.DEFINE.FIN_OK);

	}


	/**
	 * Send a json message down the websocket
	 *
	 * @param {number} pid - Process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.message - JSON message to send
	 * @param {string} json.bulk - Bulk messages
	 * @param {string} json.bulk - Bulk bulkQueue
	 * @param {string} json.debug - Debug to console
	 * @param {string} json.sendQueue - Queue to always call on send
	 *
	 */
	websocketSend(pid, json) {
		let self = this;
		let options = Object.assign({
			"debug": false,
			"sendQueue": false
		}, json);
		if (options.debug === true)
			console.log(json);
		self.queue.setMemory('wsLastSent', json, self.queue.DEFINE.MEMORY_SESSION);
		if (options.sendQueue)
			self.queue.execute(options.sendQueue);
		if (json.bulk) {
			/*
			 * Bulk mode, we are sending lots of requests and return triggers only work when we get it all back
			 */
			self.bulk = json.bulk;
			self.bulkQueue = json.bulkQueue;
			for (let i in self.bulk) {
				self.ws.send(self.bulk[i]);
			}
		} else {
			//self.socket.send(JSON.stringify(json.message));
			self.ws.send(json.message);
		}
		self.finished(pid, self.queue.DEFINE.FIN_OK);
	}


}
