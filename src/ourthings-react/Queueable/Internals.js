/** @module ourthings-react/Queueable/Internals */
import Queueable from "../Queueable";

/**
 * @classdesc
 *
 * Internal queue functions exposed to queueables
 *
 * @author Richard Reynolds richard@nautoguide.com
 *
 *
 */
export default class Internals extends Queueable {

	/**
	 * Execute a prepared queue
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - prepared queue to call
	 * @param {boolean} json.silentFail - fail the queue silently?
	 * @param {object} [json.json] - New arguments to send to queue
	 * @example
	 * internals.execute({"name":"myQueue"});
	 */
	execute(pid,json) {
		let self=this;
		self.queue.execute(json.name,json.json,json.silentFail);
		self.finished(pid,self.queue.DEFINE.FIN_OK);
	}

	/**
	 * Run a js statement
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - memory name to set
	 * @param {string} json.statement - statement to run
	 * @example
	 * internals.eval({"statement":"1+1"});
	 */
	run(pid,json) {
		json();
		this.finished(pid,this.queue.DEFINE.FIN_OK);
	}

	/**
	 * Eval a js statement
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - memory name to set
	 * @param {string} json.statement - statement to run
	 * @example
	 * internals.eval({"statement":"1+1"});
	 */
	eval(pid,json) {
		let self=this;
		json.name=json.name||'evalResult';
		let result;
		try {
			result=eval(json.statement);
		} catch (e) {
			console.log('Eval failed');
			console.log(e);
		}
		self.queue.setMemory(json.name,result,"Session");
		self.finished(pid,self.queue.DEFINE.FIN_OK);
	}

	/**
	 * Check a statement and run prepared queue if its true
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.statement - statement to check
	 * @param {string} json.name - prepared queue to call
	 * @param {string} json.else - prepared queue to call on else
	 * @param {object} [json.json] - New arguments to send to queue
	 * @example
	 * internals.ifqueue({"statement":"memory.loginAPI.value.token","name":"loggedIn"});
	 */
	ifqueue(pid,json) {
		let self=this;
		let evalRes;
		try {
			evalRes=eval(json.statement);
		} catch(e) {
			evalRes=false;
		}
		if(evalRes) {
			self.queue.execute(json.name,json.json);
		} else {
			if(json.else)
				self.queue.execute(json.else,json.json);

		}
		self.finished(pid,self.queue.DEFINE.FIN_OK);
	}

	/**
	 * Set a memory value
	 *
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - name of memory item
	 * @param {*} json.value - value to set (can be any type)
	 * @param {string} [json.mode] - [Garbage|Session|Permanent] Memory mode
	 * @example
	 * internals.setMemory({"name":"test","mode":"Session","value":"Test String"});
	 * internals.setMemory({"name":"test","mode":"Session","value":{"trueFalse":[true,false],"objects":[{"ElementOne":"Result One"},{"ElementTwo":"Result Two"}]}});
	 */
	setMemory(pid,json) {
		let self=this;
		self.queue.setMemory(json.name,json.value,json.mode);
		self.finished(pid,self.queue.DEFINE.FIN_OK);
	}

	/**
	 * toggle a bool memory value
	 *
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - name of memory item
	 * @example
	 * internals.toggleMemory({"name":"test"});
	 */
	toggleMemory(pid,json) {
		memory[json.name].value=!memory[json.name].value;
		this.finished(pid,this.queue.DEFINE.FIN_OK);
	}

	// TODO, this is rubbish needs proper merge
	mergeMemory(pid,json) {
		let self=this;
		for(let i in json.values) {
			memory[json.name].value[i]=json.values[i];
		}
		self.finished(pid,self.queue.DEFINE.FIN_OK);
	}

	/**
	 * push a value to an array memory value
	 *
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - name of memory item
	 * @param {boolean} json.toggle - toggle unique items
	 * @param {*} json.value - value to set (can be any type)
	 * @param {string} [json.mode] - [Garbage|Session|Permanent] Memory mode
	 * @example
	 * internals.pushMemory({"name":"test","mode":"Session","value":"Test String"});
	 * internals.pushMemory({"name":"test","mode":"Session","value":{"trueFalse":[true,false],"objects":[{"ElementOne":"Result One"},{"ElementTwo":"Result Two"}]}});
	 */
	pushMemory(pid,json) {
		let self=this;
		let modArray=[];
		if(memory[json.name])
			modArray=memory[json.name].value;

		if(json.toggle===true) {
			let index=modArray.indexOf(json.value);
			if(index!==-1) {
				modArray.splice(index,1);
			} else
				modArray.push(json.value);
		} else
			modArray.push(json.value);
		self.queue.setMemory(json.name,modArray,json.mode);
		self.finished(pid,self.queue.DEFINE.FIN_OK);
	}

    /**
     * Set a register
     * @param {int} pid - process ID
     * @param {object} json - queue arguments
     * @param {string} json.name - name of register
     * @example
     * internals.setRegister({"name":"test"});
     */
	setRegister(pid,json) {
        let self=this;
        self.queue.setRegister(json.name);
        self.finished(pid,self.queue.DEFINE.FIN_OK);
    }


	/**
	 * delete a register
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - name of register
	 * @example
	 * internals.deleteRegister({"name":"test"});
	 */
	deleteRegister(pid,json) {
		let self=this;
		self.queue.deleteRegister(json.name);
		self.finished(pid,self.queue.DEFINE.FIN_OK);
	}

	/**
	 * Delete a memory value
	 *
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @param {string} json.name - name of memory item
	 * @param {*} json.value - value to set (can be any type)
	 * @param {string} [json.mode] - [Garbage|Session|Permanent] Memory mode
	 * @example
	 * internals.setMemory({"name":"test","mode":"Session","value":"Test String"});
	 * internals.setMemory({"name":"test","mode":"Session","value":{"trueFalse":[true,false],"objects":[{"ElementOne":"Result One"},{"ElementTwo":"Result Two"}]}});
	 */
	deleteMemory(pid,json) {
		this.queue.deleteMemory(json.name);
		this.finished(pid,this.queue.DEFINE.FIN_OK);
	}

	/**
	 * NOP - No operation
	 *
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @example
	 * internals.nop();
	 */
	nop(pid,json) {
		this.finished(pid,this.queue.DEFINE.FIN_OK);
	}

	/**
	 * Debug - start debugger
	 *
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @example
	 * internals.debug();
	 */
	debug(pid,json) {
		debugger;
		this.finished(pid,this.queue.DEFINE.FIN_OK);
	}


	/**
	 * console - console.log
	 *
	 * @param {int} pid - process ID
	 * @param {object} json - queue arguments
	 * @example
	 * internals.console({"log":"foo"Opebn});
	 */
	console(pid,json) {
		console.log(json.log);
		this.finished(pid,this.queue.DEFINE.FIN_OK);
	}

}
