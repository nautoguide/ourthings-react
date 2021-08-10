/** @module Memory */


/**
 * @classdesc
 *
 * Memory manager class
 *
 * @author Richard Reynolds richard@nautoguide.com
 *
 * @example
 * // memory = new Memory();
 *
 */
export default class Memory {
	/**
	 * Add new memory element
	 * @param pid
	 * @param mode
	 * @param origin
	 * @param value
	 */
	constructor(pid,mode,origin,value) {
		this.pid=pid;
		this.mode= mode;
		this.origin=origin;
		this.value=value;
	}

	/**
	 * Get the current value of the memory item (same as memory.name.value)
	 * @return {*}
	 */
	get() {
		return this.value;
	}

	/**
	 * Toggle the value based on an array list of values
	 * @param {array} values
	 * @return {*}
	 */
	toggle(values) {
		let currentValue=this.value;
		let len=values.length;
		let pos=values.indexOf(this.value);
		pos++;
		if(pos>=len)
			pos=0;
		this.value=values[pos];
		return currentValue;
	}

	/**
	 * Return an encoded version of the memory for storage in a coookie
	 * @returns {string}
	 * @private
	 */
	_store() {
		return window.btoa(unescape(encodeURIComponent(JSON.stringify({
			pid: this.pid,
			mode: this.mode,
			origin: this.origin,
			value: this.value
		}))));
	}
};