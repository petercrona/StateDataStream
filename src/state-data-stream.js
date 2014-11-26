'use strict';

angular.module('StateDataStream', [])
    .factory('Sds', function($q) {

		/**
		 * Obj to represent a job in the queue
		 */
		var Job = function(keyObj, type, value) {
			this.keyObj = keyObj;
			this.type = type;
			this.value = value;
		};

		/**
		 * Obj to represent parsed key
		 */
		var KeyObj = function(type, path) {
			this.type = type;
			this.path = path;
		};

		/**
		 * Represents space in the state.
		 * It's just a pointer to the position
		 * where the user wanted his/her data.
		 */
		var Space = function(type, varRef, key) {
			this.set = function(value) {
				if (type === 'list') {
					varRef[key].push(value);
				} else {
					varRef[key] = value;
				}
			};
		};

		// ====== Constructor
		var Cq = function(initialState) {
			this._initialState = initialState;
			this._jobQueue = [];
			this._errorHandler = angular.identity;
		};

		// ====== Methods
		Cq.prototype.write = function(key, val) {
			// Call the appropriate handler
			if (isPromise(val)) {
				writePromise(this, key, val);
			} else if (isFunction(val)) {
				writeFunction(this, key, val);
			} else {
				writeValue(this, key, val);
			}

			return this;
		};
		
		/**
		 * Register errorhandler, immediately called if any promise
		 * fail. Called with (error, state).
		 */
		Cq.prototype.error = function(errorHandler) {
			this._errorHandler = errorHandler;
			return this;
		};

		/**
		 * Execute the stream and call the successHandler with the state.
		 */
		Cq.prototype.execute = function(successHandler, stateDefinition) {
			// Not that we want a copy of inital state, to make it possible to rerun
			// the Cq.
			var state = JSON.parse(JSON.stringify(this._initialState));
			var jobs = this._jobQueue;

			// We use a chain of promises to make everything evaluate
			// in order.
			var promiseChain = $q.when(state);
			
			for (var i in jobs) {
				var job = jobs[i];
				var promise = null;
				
				if (job.type === 'promise') {
					promise = createPromisePromise(job.keyObj, job.value);
				} else if (job.type === 'function') {
					promise = createFunctionPromise(job.keyObj, job.value);
				} else if (job.type === 'value') {
					promise = createValuePromise(job.keyObj, job.value);
				}

				promiseChain = promiseChain.then(promise);
			}

			promiseChain
				.then(function(state) {
					successHandler.apply(null, getPartialState(state, stateDefinition))
				})
				.catch(function(err) {
					this._errorHandler(err, state);
				}.bind(this));

			return this;
		};

		// ====== Internal methods
		
		/**
		 * Extract partial state from full state.
		 * keys shall be a list of keys pointing to the
		 * values to include in the partial state.
		 */
		function getPartialState(state, keys) {
			if (keys === undefined) {
				return [state];
			}

			var parsedKeys = [];
			for(var i in keys) {
				parsedKeys.push(parseKey(keys[i]));
			}
			
			var values = map(parsedKeys, function(key) {
				return getValueFromState(state, key);
			});

			return values;
		}

		function getValueFromState(state, key) {
			var pathHead = key.path[0];
			var pathTail = key.path.slice(1);
			var currValue = state[pathHead];
			
			if (currValue === undefined) {
				return undefined;
			} else {
				for(var i in pathTail) {
					currValue = currValue[pathTail[i]];
				}
				return currValue;
			}
		}

		function map(arr, fn) {
			var res = [];
			for(var i in arr) {
				res.push(fn(arr[i]));
			}
			return res;
		}

		/**
		 * Create a new Stream.
		 */
		function initFn(initialState) {
			if (initialState === undefined) {
				initialState = {};
			}
			return new Cq(initialState);
		}

		/**
		 * Add promise's resolve value to state.
		 */
		function createPromisePromise(keyObj, promise) {
			return function(state) {
				return promise.then(function(res) {
					var space = allocateSpace(state, keyObj);
					space.set(res);
					return state;
				});
			};
		}

		/**
		 * Add the function's resolve value to state.
		 * Note that the function might return a
		 * promise. In that case, add this promise's
		 * resolve value to the state.
		 */
		function createFunctionPromise(keyObj, fn) {
			return function(state) {
				var retr = fn(state);
				if (isPromise(retr)) {
					return retr.then(function(res) {
						var space = allocateSpace(state, keyObj);
						space.set(res);
						return state;
					});
				} else {
					var space = allocateSpace(state, keyObj);
					space.set(retr);
					return state;
				}
			};
		}

		/**
		 * Simple value assignment in the stream.
		 */
		function createValuePromise(keyObj, value) {
			return function(state) {
				var space = allocateSpace(state, keyObj);
				space.set(value);
				return state;
			};
		}

		function writePromise(cq, key, val) {
			var keyObj = parseKey(key);
			cq._jobQueue.push(new Job(keyObj, 'promise', val));
		}

		function writeFunction(cq, key, val) {
			var keyObj = parseKey(key);
			cq._jobQueue.push(new Job(keyObj, 'function', val));
		}

		function writeValue(cq, key, val) {
			var keyObj = parseKey(key);
			cq._jobQueue.push(new Job(keyObj, 'value', val));
		}

		/**
		 * Parse the key to determine where
		 * the user wants to store data.
		 */
		function parseKey(key) {	
			var keyObj = null;
			if (isListKey(key)) {
				keyObj = parseListKey(key);
			} else {
				keyObj = parseObjKey(key);
			}
			return keyObj;
		}

		function getPathFromListKey(key) {
			var tKey = key
				.substring(0,key.length-2);
			return getPathFromKey(tKey);
		}

		function getPathFromKey(key) {
			return key
				.split('.');
		}

		function parseListKey(key) {
			var path = getPathFromListKey(key);
			return new KeyObj('list', path);
		}

		function parseObjKey(key) {
			var path = getPathFromKey(key);
			return new KeyObj('object', path);
		}

		/**
		 * Allocate space where the user wants
		 * to store data.
		 */
		function allocateSpace(state, keyObj) {
			var currP = state;
			
			for (var i in keyObj.path) {
				var edge = keyObj.path[i];
				// Note that we don't create an object for the last level
				// since we might want a list.
				if (currP[edge] === undefined && i < keyObj.path.length-1) {
					currP[edge] = {};
				}
				if (i < keyObj.path.length-1) {
					currP = currP[edge];
				}
			}

			var last = keyObj.path[keyObj.path.length-1];
			if (keyObj.type === 'list' && currP[last] === undefined) {
				currP[last] = [];
			} else if (currP[last] === undefined) {
				currP[last] = {};
			}

			return new Space(keyObj.type, currP, last);
		}

		function isPromise(val) {
			return val !== null && val.then !== undefined;
		}

		function isFunction(val) {
			return typeof val === 'function';
		}

		function isListKey(key) {
			return key.indexOf('[]') !== -1;
		}

		// ======
		return {
			init: initFn,
		};

	});
