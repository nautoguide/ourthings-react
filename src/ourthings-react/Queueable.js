/** @module ourthings/Queueable */

/**
 * @classdesc
 *
 * The base class for queueable things
 *
 * @author Richard Reynolds richard@nautoguide.com
 *
 * @example
 * // queue = new Queue();
 *
 */
class Queueable {

	/**
	 * Constructor, Sets our status to be false (flipped on init)
	 *
	 */
	constructor() {
		this.ready=false;
	}

	/**
	 * init, override this for any promise based inits setting
	 * the self.ready=true after the promise
	 *
	 */
	init(queue) {
		this.queue=queue;
		this.ready=true;
	}

	/**
	 * Called from queue, starts running the actual command
	 * @param pid
	 * @param command
	 * @param json
	 */
	start(pid,command,json) {
		let self=this;
		if(self[command]&&typeof self[command] === 'function') {
			/*
			 * Pass the json through the var processor
			 */
			//json=JSON.parse(self.queue.templateVars(JSON.stringify(json)));
			/*
			 * Process pointers IE *memory.foo.value
			 */
			/*const pointerRegex=/^\*(.+)$/;
			this.queue.objectMap(json,function(item){
				let match;
				if(match = pointerRegex.exec(item)) {
					try {
						item = eval(match[1]);
					} catch(e) {
						return undefined;
					}
				}
				return item;
			})
*/
			/*
			 * Execute
			 */
			try {
				self[command](pid, json);
			} catch(e) {
				/*
				 * In an error state, we will fire up the debugger is they have console open
				 */
				console.log(e);
				self.queue.setMemory('generalErrorMessage',e,"Session");
				self.queue.execute('generalError');
				self.queue.finished(pid,self.queue.DEFINE.FIN_ERROR,`Queue [${command}] errored: ${e}`);
			}
		} else {
			self.queue.finished(pid,self.queue.DEFINE.FIN_ERROR,'No such command ['+command+']');
		}
	}

	/**
	 * Call this method after you command has finished. Failure to do so will result is
	 * a stalled queue
	 * @param pid
	 * @param mode
	 */
	finished(pid,mode,error='') {
		let self=this;
		/*
		 * a -1 pid is called via direct run and so not from our queue
		 */
		if(pid!==-1)
			self.queue.finished(pid,mode,error);
	}

	set(pid,value) {
		let self=this;
		self.queue.memory(pid,value);
	}
}

export default Queueable;