/** @module Define */


/**
 * @classdesc
 *
 * Our define class, contains all magic dnumber defines
 *
 * @author Richard Reynolds richard@nautoguide.com
 *
 * @example
 * // DEFINE = new Define();
 *
 */
export default class Define {
	constructor() {
		/**
		 * Queue state of operations
		 */
		this.STATUS_LOADING = 0;
		this.STATUS_LOADED = 1;
		this.STATUS_RUNNING = 2;
		this.STATUS_ERROR = 3;

		/**
		 * Render modes
		 */
		this.RENDER_INSERT = "insert";
		this.RENDER_APPEND = "append";
		this.RENDER_REPLACE = "replace";


		/**
		 *  Command types
		 */

		this.COMMAND_INSTANT = "Instant";
		this.COMMAND_EVENT = "Event";
		this.COMMAND_SUB = "Sub";

		/**
		 *  Queue states
		 */
		this.QUEUE_ADDED = 0;
		this.QUEUE_RUNNING = 1;
		this.QUEUE_FINISHED = 2;
		this.QUEUE_ERROR = 3;

		/**
		 * Queueable Finished states
		 */

		this.FIN_OK = 0;
		this.FIN_WARNING = 1;
		this.FIN_ERROR = 2;

		this.MEMORY_GARBAGE="Garbage";
		this.MEMORY_SESSION="Session";
		this.MEMORY_PERMANENT="Permanent";


		/**
		 *  Keycodes
		 */

		this.KEY_RETURN=13;

	}
}