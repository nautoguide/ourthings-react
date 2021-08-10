/** @module ourthings/Queue */
import Define from './Define.js';
import Memory from "./Memory";

/**
 * @classdesc
 *
 * The main queue class
 *
 * @author Richard Reynolds richard@nautoguide.com
 *
 * @example
 * let queue = new Queue();
 */
class Queue {

	/**
	 * Class constructor
	 */
	constructor(queueablesList,domain) {
		let self = this;
		let calcDomain=window.location.hostname;
		domain=domain||calcDomain;
		self.domain=domain;
		/*
		 * Create our DEFINE object for
		 * @type {Define}
		 */
		self.DEFINE = new Define();
		/*
		 * Our Queue array
		 *
		 * @type {Array}
		 */
		self.queue = {};

		/*
		 * Our events (queues) which can be called by name
		 */
		self.prepare = {};

		/*
		 * Queueable items object
		 */
		self.queueables = {};

		/*
		 * Register lists
		 */
		self.registers = [];


		/*
		 * Se our status
		 * @type {number}
		 */
		self.status = self.DEFINE.STATUS_LOADING;

		/*
		 * Our queue process ID
		 * @type {number}
		 */
		self.pid = 0;
		self.runningPid = -1;



		/*
		 * Default time for process to be executed after
		 * TODO Platform test / tune
		 * @type {number}
		 */
		self.defaultTimer = 10;



		/*
		 * Run init against all our queueables
		 *
		 * This basically passes the queue object (self) though but also for any queueables that require it
		 * starts any promise functions that will result in them becoming active
		 */
		for (let i in queueablesList) {
			self.checkQueueable(i, queueablesList[i]);
		}

		/*
		 * Initialise the memory
		 */
		window.memory = {};

		/*
		 * Enable language support?
		 */

	}


	checkQueueable(name, obj) {
		let self = this;
		if (self.queueables[name] === undefined) {
			self.queueables[name] = new obj();
			self.queueables[name].init(self);
			console.log(`Booting: ${name}`)
			return false;
		}
		return true;
	}

	/**
	 * Take the commands array with command objects in it and add them to the queue *if* they are
	 * marked as instant. IE ready to execute
	 *
	 * @param commandObj
	 */
	commandsQueue(commandObj) {
		let self = this;
		for (let command in commandObj) {
			/*
			 * Init the stack
			 */
			commandObj[command].stack = {};
			if(commandObj[command].options === undefined)
				commandObj[command].options={};
			commandObj[command].state = self.DEFINE.QUEUE_ADDED;
			/*
			 * DEFINE.COMMAND_INSTANT, basically a queue item we need to get running
			 */
			if (commandObj[command].options.queueRun === self.DEFINE.COMMAND_INSTANT) {
				self.queue[self.pid] = self.deepCopy(commandObj[command]);
				self.pid++;
			}
			/*
			 * Is the a prepare queue that will be triggered at some later stage
			 */
			if (commandObj[command].options.queuePrepare !== undefined) {
				self.prepare[commandObj[command].options.queuePrepare] = self.deepCopy(commandObj[command]);
				if (commandObj[command].options.queueRun === self.DEFINE.COMMAND_INSTANT) {
					console.log(`Running prepared queue: ${commandObj[command].options.queuePrepare}`);
				} else {
					console.log(`Adding prepared queue: ${commandObj[command].options.queuePrepare}`);
				}

			}
		}
		/*
		 *  Trigger a queue process
		 */
		self.queueProcess();
	}

	/**
	 * Execute a queue that is loaded into prepare
	 *
	 * @param prepareName {string} Name of the prepared queue
	 * @param json {object}
	 * @param silentFail {boolean}
	 */
	execute(prepareName, json, silentFail) {
		let self = this;
		if (self.prepare[prepareName] !== undefined) {
			if(!self.prepare[prepareName].options.queueStatement || eval(self.prepare[prepareName].options.queueStatement)) {
				/*
				 * Take a copy of the prepared command as we need to alter it
				 * and possibly pass new params then add it to the queue
				 */
				let dereferenceCommand = self.deepCopy(self.prepare[prepareName]);
				dereferenceCommand.options.queueRun = self.DEFINE.COMMAND_INSTANT;
				if (json !== undefined)
					dereferenceCommand.json = Object.assign(dereferenceCommand.json, json);
				self.commandsQueue.apply(self, [[dereferenceCommand]]);
				return true;
			} else {
				return false;
			}
		} else {
			if (silentFail !== true)
				self.reportError("Can not execute prepare [" + prepareName + "]", "The prepared queue you requested does not exist");
			return false;
		}

	}

	/**
	 * Force a queue processing
	 *
	 * This launches the actual objects using a timeout
	 *
	 * @param sync {boolean} - Send true to force sync mode (Really only for test mode)
	 */
	queueProcess(sync) {
		//debugger;
		let self = this;
		/*
		 *  TODO Only implementing basic queue here for testing. Concepts of active componets etc need importing
		 *  for moho
		 */
		for (let item in self.queue) {
			/*
			 *  Look for items that are QUEUE_ADDED as they need processing
			 *
			 */
			if (self.queue[item].state === self.DEFINE.QUEUE_ADDED) {
				/*
				 * Does this queueable exist?
				 */
				if (self.queueables[self.queue[item].queueable]) {

					/*
					 * Check if we have any registers that need setting
					 */

					if (!self.queue[item].options.queueRegister || (self.queue[item].options.queueRegister && self.registers.indexOf(self.queue[item].options.queueRegister) !== -1)) {

						/*
						 * do we have a prefilter statement?
						 */

						if(!self.queue[item].options.queueStatement || eval(self.queue[item].options.queueStatement)) {
							/*
							 * Is it online? If not we fail silently as it may come online later
							 */
							if (self.queueables[self.queue[item].queueable].ready) {
								/*
								 * Update our state to be running
								 */
								self.queue[item].state = self.DEFINE.QUEUE_RUNNING;
								/*
								 * Assign a pid
								 */
								if (self.queue[item].pid === undefined) {
									self.queue[item].pid = item;
								}
								/*
								 * Check if any specific timing is needed
								 */
								self.queue[item].options.queueTimer = self.queue[item].options.queueTimer || self.defaultTimer;

								/*
								 *  Launch the function as a time out (so we get control back)
								 */

								if (sync) {
									self.runningPid = item;
									self.queueables[self.queue[item].queueable].start.apply(self.queueables[self.queue[item].queueable], [self.queue[item].pid, self.queue[item].command, self.queue[item].json, self]);
								} else {
									setTimeout(function () {
										self.runningPid = item;
										self.queueables[self.queue[item].queueable].start.apply(self.queueables[self.queue[item].queueable], [self.queue[item].pid, self.queue[item].command, self.queue[item].json, self]);
									}, self.queue[item].options.queueTimer);
								}
							}
						}
					}
				} else {
					self.reportError("Can not find queueable [" + self.queue[item].queueable + "]", "Have you added it to the build?");
				}
			}
		}
	}

	/**
	 * Find a queue item by searching for its PID
	 * @param pid
	 * @return {*}
	 */
	findQueueByPid(pid) {
		let self = this;
		for (let item in self.queue) {
			if (self.queue[item].pid === pid) {
				return self.queue[item];
			}
		}
		return false;
	}

	/**
	 * Called by queueables to add something to our memory stack
	 * @param name
	 * @param value
	 * @param pid
	 */
	memory(pid, value) {
		let self = this;
		let command = this.findQueueByPid(pid);
		if (command) {
			let origin = command.options.memoryName || command.queueable + '.' + command.command;
			let mode = self.DEFINE.MEMORY_GARBAGE;
			if (command.options.memoryMode)
				mode = command.options.memoryMode;
			let memoryDetails = new Memory(pid, mode, origin, value);
			window.memory[origin] = memoryDetails;
			return true;
		} else {
			if(pid!==-1)
				this.reportError("Could not set memory", "The memory set for pid [" + pid + "] could not be found");
			return false;
		}
	}

	/**
	 * Set a queue stack item
	 * @param pid
	 * @param name
	 * @param value
	 * @return {boolean}
	 */
	setStack(pid, name, value) {
		let command = this.findQueueByPid(pid);
		command.stack[name] = value;
		return true;
	}

	/**
	 * Set memory that is not associated with a running queueable (IE from the templates)
	 * @param name
	 * @param value
	 * @param mode
	 * @return {boolean}
	 */
	setMemory(name, value, mode) {
		let self = this;
		mode = mode || self.DEFINE.MEMORY_GARBAGE;
		let memoryDetails = new Memory(-1, mode, 'User', value);
		window.memory[name] = memoryDetails;
		// Are we updating perms? If so we need to sync them
		if (mode == self.DEFINE.MEMORY_PERMANENT)
			self._updateMemoryPerms();
		return true;
	}

	/**
	 * Set a register
	 * @param name
	 * @returns {boolean}
	 */
	setRegister(name) {
		if (this.registers.indexOf(name) === -1) {
			this.registers.push(name);
			console.log(`Register set: ${name}`)
		} else {
			console.log(`Register already set: ${name}`)
		}
		this.queueProcess();
		return true;
	}

	/**
	 * delete a register
	 * @param name
	 * @returns {boolean}
	 */
	deleteRegister(name) {
		if (this.registers.indexOf(name) !== -1) {
			this.registers.splice(this.registers.indexOf(name), 1);
			console.log(`Register deleted: ${name}`)
		} else {
			console.log(`Register does not exist for delete: ${name}`)

		}
		this.queueProcess();
		return true;
	}

	/**
	 * Delete Memory TODO clean up perms
	 * @param name
	 * @return {boolean}
	 */
	deleteMemory(name) {
		delete window.memory[name];
		this._updateMemoryPerms();
		return true;
	}

	/**
	 * Flush any permanent memory to cookies
	 * @private
	 */
	_updateMemoryPerms() {
		let self = this;
		let perms = [];
		let date = new Date();
		date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
		let expires = "; expires=" + date.toUTCString();
		for (let i in window.memory) {
			if (window.memory[i].mode === self.DEFINE.MEMORY_PERMANENT) {
				self.setCookie('OT_' + i, window.memory[i]._store());
				perms.push(i);
			}
		}
		self.setCookie('OT_INDEX', window.btoa(JSON.stringify(perms)));
	}

	/**
	 * Load perm memory items from cookies
	 * @private
	 */
	_loadMemoryPerms() {
		let self = this;
		let index = self.getCookie("OT_INDEX");
		if (index !== null) {
			try {
				index = JSON.parse(window.atob(index));
				for (let i in index) {
					let perm = JSON.parse(decodeURIComponent(escape(window.atob(self.getCookie("OT_" + index[i])))));
					window.memory[index[i]] = new Memory(perm.pid, perm.mode, perm.origin, perm.value);
				}
			} catch (e) {
				console.error('OT_INDEX seems corrupted');
			}
		}

	}

	/**
	 * Retrieve a cookie by name
	 * @param name - Cookie name
	 * @returns {*}
	 */
	getCookie(name) {
		let nameEQ = name + "=";
		let ca = document.cookie.split(';');
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
		}
		return null;
	}

	/**
	 * set a cookie by name and value
	 * @param name - Cookie name
	 * @param value - Value of cookie
	 * @returns {*}
	 */
	setCookie(name, value,time) {
		let self=this;
		let date = new Date();
		time=time||(7 * 24 * 60 * 60 * 1000)
		date.setTime(date.getTime() + time);
		const secure = window.location.href.match(/https\:\/\//i);
		const cookieString = `${name}=${value};expires=${date.toUTCString()};domain=${self.domain}; path=/;${(secure !== null ? 'Secure;' : '')} SameSite=Strict`;
		//console.log(cookieString)
		document.cookie = cookieString;
	}

	/**
	 * Called at the end of a queue run to flush any garbage
	 * @param pid
	 */
	cleanMemory(pid) {
		let self = this;
		for (let i in window.memory) {
			if (window.memory[i].pid === pid && window.memory[i].mode === self.DEFINE.MEMORY_GARBAGE) {
				window.memory[i] = {};
				delete window.memory[i];
			}
		}

	}


	/**
	 * Is there any work to do in the queue?
	 */
	isWork() {
		let self = this;
		let count = 0;
		for (let item in self.queue) {
			if (self.queue[item].state !== self.DEFINE.QUEUE_FINISHED && self.queue[item].state !== self.DEFINE.QUEUE_ERROR)
				count++;
		}
		return count;
	}

	/**
	 *  Clean up any finished queues
	 */
	cleanQueue() {
		for (let item in this.queue) {
			if (this.queue[item].state === this.DEFINE.QUEUE_FINISHED) {
				delete this.queue[item];
			}
		}
	}

	/**
	 *  Called to flag a queue item as finished
	 *
	 *  Normally hooked down from queueable this is a queue item saying I have finished in mode (see define.js)
	 *
	 * @param pid
	 * @param mode
	 */
	finished(pid, mode, error) {
		let self = this;

		self.queue[pid].error = error;
		if (self.queue[pid].state === self.DEFINE.QUEUE_RUNNING) {
			/*
			 * Did the command return an error? If so we will stop this queue from further execution
			 */
			if (mode == self.DEFINE.FIN_ERROR) {
				self.queue[pid].state = self.DEFINE.QUEUE_ERROR;
				self.reportError(error, 'The queueable [' + pid + '] has errored, queue put on hold');
				return;
			}
			/*
			 * Was there a warning?. This isn't serious so we just mention it to the console
			 */
			if (mode == self.DEFINE.FIN_WARNING) {
				console.log('Warning: ' + error);
			}
			/*
			 *
			 * Check if this queue has commands left
			 */
			if (self.queue[pid].commands !== undefined && self.queue[pid].commands.length > 0) {
				/*
				 * Move the next item in the queue down
				 */
				self.queue[pid].command = self.queue[pid].commands[0].command;
				self.queue[pid].queueable = self.queue[pid].commands[0].queueable;
				self.queue[pid].json = self.queue[pid].commands[0].json;
				self.queue[pid].options = self.queue[pid].commands[0].options||{};
				self.queue[pid].commands.shift();
				/*
				 *  Update the pid
				 *  TODO remove this as queues need to maintain their Pid for memory
				 */
				//self.queue[item].pid=self.pid;
				//self.pid++;
				self.queue[pid].state = self.DEFINE.QUEUE_ADDED;
				/*
				 * Start the queue processor as we just posted a new command
				 */
				self.queueProcess();
			} else {
				self.queue[pid].state = self.DEFINE.QUEUE_FINISHED;
				self.cleanMemory(self.queue[pid].pid);
				self.cleanQueue();
			}
			return;
		} else {
			self.reportError('Cant stop an already stopped process [' + pid + ']', 'Queue is corrupted');
			return;
		}

	}

	/**
	 * This will take a command string in the format object.command({},{}); and split it down
	 * into it parts as an object
	 *
	 * @param command {string}
	 * @return {object}
	 */
	commandParse(command, isParent) {
		let self = this;
		let commandObject = {"ucid": ++self.ucid};
		// Find the actual command
		let commandArray = command.match(/(.*?)\(/)[1].split('.');
		commandObject.queueable = commandArray[0];
		commandObject.command = commandArray[1];
		// Strip as we go to make follow up regex easier
		command = command.replace(/.*?\(/, '[');
		// Find first json arg

		command = command.replace(/\);$/m, ']');
		let jsonArray=[];
		try {
			jsonArray = JSON.parse(command);
		} catch (e) {
			self.reportError('Command parser cant decode json',e);
			console.log(command);
			return undefined;
		}
		if (jsonArray[0]) {
			commandObject.json = jsonArray[0];
		} else {
			commandObject.json = {};
		}

		if (jsonArray[1]) {
			commandObject.options = jsonArray[1];
		} else {
			commandObject.options = {};
		}
		/*
		 * Set our default options if they haven't been set
		 *
		 * We must always have a queueRun object if its not set (normally by instant) then its either an event in
		 * which case it must be a parent or failing then its a sub
		 *
 		 */
		commandObject.options.queueRun = commandObject.options.queueRun || (isParent ? self.DEFINE.COMMAND_EVENT : self.DEFINE.COMMAND_SUB);
		commandObject.state = self.DEFINE.QUEUE_ADDED;
		return commandObject;
	}



	/**
	 * Finds elements in the dom of an iframe (or current document) using the query selector
	 * @param iframeTarget Iframe or false
	 * @param elementTarget query
	 * @param errorTrap {boolean} Trap any errors?
	 * @return {object|false}
	 */
	getIframeElements(iframeTarget, elementTarget, errorTrap = true) {
		let self = this;
		let iframe = document.getElementById(iframeTarget);
		if (!iframe)
			iframe = document;
		else
			iframe = iframe.contentDocument || iframe.contentWindow.document;
		let element = iframe.querySelectorAll(elementTarget);
		/*
		 * IE11 BUG, check for non arrays and attempt to convert
		 */
		if (!Array.isArray(element)) {
			element = Array.from(element);
		}
		if (element !== null)
			return element;
		if (errorTrap)
			self.reportError('Dom Element find failed for [' + elementTarget + '] iframe [' + iframeTarget + ']', 'Follow up calls that rely on this will fail');
		return false;
	}

	/**
	 * Finds an element in the dom using the jquery formant IE #id .class tag (will only ever return one)
	 * @param elementTarget
	 * @param errorTrap {boolean} Trap any errors?
	 * @return {object|false}
	 */
	getElement(elementTarget, errorTrap = true) {
		let self = this;
		let element = document.querySelector(elementTarget);
		if (element !== null)
			return element;
		if (errorTrap)
			self.reportError('Dom Element find failed for [' + elementTarget + ']', 'Follow up calls that rely on this will fail');
		return false;
	}

	/**
	 * Finds an element in the dom using the jquery formant and return a value that is scaped (json safe)
	 * @param elementTarget
	 * @param errorTrap {boolean} Trap any errors?
	 * @return {object|false}
	 */
	getElementValueEscaped(elementTarget, errorTrap = true) {
		let self = this;
		let element = document.querySelector(elementTarget);
		if (element !== null) {
			let unEscaped=element.value;
			unEscaped=unEscaped.replace(/\n/g,'\\n');
			unEscaped=unEscaped.replace(/\r/g,'\\r');
			unEscaped=unEscaped.replace(/\t/g,'\\t');
			return unEscaped.replace(/\"/g,"&quot;");
		}
		if (errorTrap)
			self.reportError('Dom Element find failed for [' + elementTarget + ']', 'Follow up calls that rely on this will fail');
		return false;
	}

	/**
	 * Finds an element(s) in the dom using the jquery formant IE #id .class tag (can return one or more)
	 * @param elementTarget
	 * @return {object|false}
	 */
	getElements(elementTarget) {
		let self = this;
		let element = document.querySelectorAll(elementTarget);
		/*
		 * IE11 BUG, check for non arrays and attempt to convert
		 */
		if (!Array.isArray(element)) {
			element = Array.from(element);
		}
		if (element !== null)
			return element;
		self.reportError('Dom Element(s) find failed for [' + elementTarget + ']', 'Follow up calls that rely on this will fail');
		return false;
	}


	/**
	 *  Show current queue status in the console DEBUG function
	 */
	show(pid) {
		let self = this;
		if(self.queue.length>0) {
			for (let i in self.queue) {
				let indent = 0;
				if(pid===undefined||self.queue[i].pid===pid) {
					self.prettyCommandObject(self.queue[i], indent);
					for (let j in self.queue[i].commands) {
						indent++;
						self.prettyCommandObject(self.queue[i].commands[j], indent);

					}
				}
			}
		} else {
			console.log(`Queue is empty, pid is ${self.pid}`);
		}
	}

	/**
	 * Make a pretty version of the currrent commandObject and dump it to the console
	 * @param commandObject
	 * @param indent
	 */
	prettyCommandObject(commandObject, indent) {
		let self = this;
		let string = '';
		for (var i = 0; i < indent; i++) {
			string += ' ';
		}
		let color = self.DEFINE.CONSOLE_COL_GREEN;
		switch (commandObject.state) {
			case self.DEFINE.QUEUE_FINISHED:
				color = self.DEFINE.CONSOLE_COL_AMBER;
				break;
			case self.DEFINE.QUEUE_ERROR:
				color = self.DEFINE.CONSOLE_COL_RED;
				break;

		}
		string += commandObject.queueable + '.' + commandObject.command + '(' + JSON.stringify(commandObject.json) + ',' + JSON.stringify(commandObject.options) + ');'
		console.log('%c ' + string, color);
		if (commandObject.error)
			console.log('%c  Stopped: ' + commandObject.error, self.DEFINE.CONSOLE_COL_AMBER);
	}

	/**
	 * Report an error to the console, adds various internal stats
	 * @param error
	 * @param message
	 */
	reportError(error, message) {
		console.log(`{${error}:${message}`)
	}

	/**
	 * Deep copy and object IE remove references
	 * @param inputObject
	 * @return {any}
	 */
	deepCopy(inputObject) {
		return JSON.parse(JSON.stringify(inputObject));
	}

	/**
	 * Map an object with sub objects using a map function
	 * @param obj
	 * @param mapFunction
	 */
	objectMap(obj, mapFunction) {
		for (let i in obj) {
			if (typeof obj[i] === 'object') {
				this.objectMap(obj[i], mapFunction);
			} else {
				obj[i] = mapFunction(obj[i]);
			}
		}
	}

	/**
	 * Adds classes for browser type to body for use in CSS
	 */
	browserClasses() {
		let self = this;
		let bodyElement = self.getElement("body");
		if (!!window.MSInputMethodContext && !!document.documentMode)
			bodyElement.classList.add("ie11");
		else
			bodyElement.classList.add("notie11");
		if (navigator.vendor.match(/apple/i))
			bodyElement.classList.add("safari");
		if (navigator.vendor.match(/google/i))
			bodyElement.classList.add("chrome");
		if (navigator.userAgent.indexOf("Edge") > -1)
			bodyElement.classList.add("edge");
		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
			bodyElement.classList.add("firefox");
	}

	/**
	 * Get any params from the url in json format
	 *
	 * This supports both the search format IE ? and also hash format # (# added to support AWS cognito)
	 */
	urlToJson() {
		let url = location.search!==""? location.search:location.hash;
		let query = url.substr(1);
		let result = {};
		query.split("&").forEach(function (part) {
			let item = part.split("=");
			result[item[0]] = decodeURIComponent(item[1]);
		});
		return result;
	}

	/**
	 *  Work in progress,
	 */
	menu() {
		queue.setMemory('developer', !this.developerMode, "Permanent");
		alert('DEVELOPER MODE: ' + this.developerMode)
		//document.body.innerHTML+='<div id="ourthingsMenu"><button onclick="queue.toggleDebug()">DEBUG MODE</button></div>';
	}

}

export default Queue;