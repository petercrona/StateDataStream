'use strict';

angular.module('StateDataStream', [])
    .service('StateDataStream', function($q) {

		var StateDataStream = function(state) {

			var fnQueue = [];
			var errHandler = angular.identity;

			/*
			 * Binds the result of a promise to the state.
			 */
			this.addDataRetriever = function addDataRetriver(key, fn) {
				var fnToQueue = function(state) {
					return fn.then(function(res) {
						state[key] = res;
						return state;
					});
				};
				fnQueue.push({
					type: 'sync',
					fn: fnToQueue
				});
				
				return this;
			};

			/*
			 * Calls the provided function with the current state
			 * and expects a promise back. The result of the resolved
			 * promise is written to the state. 
			 */
			this.addStateDataRetriever = function addStDataRetriver(key, fn) {
				var fnToQueue = function(state) {
					return fn(state).then(function(res) {
						state[key] = res;
						return state;
					});
				};
				fnQueue.push({
					type: 'sync',
					fn: fnToQueue
				});
				
				return this;
			};

			/**
			 * Add a data retriever wrapped in a function. Since it is wrapped
			 * in a function the inner won't run until it's turn in the
			 * state data stream sequence.
			 */
			this.addLazyDataRetriever = function addStDataRetriver(key, fn) {
				var fnToQueue = function(state) {
					return fn().then(function(res) {
						state[key] = res;
						return state;
					});
				};
				fnQueue.push({
					type: 'sync',
					fn: fnToQueue
				});
				
				return this;
			};

			/**
			 * Add multiple data retrievers at once.
			 */
			this.addDataRetrievers = function addDataRetrievers(retrievers) {
				var promises = [];
				var keys = [];

				angular.forEach(retrievers, function(value, key) {
					promises.push(value);
					keys.push(key);
				});

				var fnToQueue = function(state) {
					return $q.all(promises)
						.then(function(res) {
							angular.forEach(res, function(value, i) {
								state[keys[i]] = value;
							});
							return state;
						});
				};
				fnQueue.push({
					type: 'async',
					fn: fnToQueue
				});
				
				return this;
			};

			/**
			 * Add a function which is called with the current state.
			 */
			this.then = function then(fn) {
				var fnToQueue = function(state) {
					fn(state);
					return state;
				};
				fnQueue.push({
					type: 'then',
					fn: fnToQueue
				});

				return this;
			};

			this.error = function(fn) {
				errHandler = fn;
				
				return this;
			};

			/**
			 * Execute the state data stream.
			 */
			this.execute = function execute(fn) {
				fn = fn || angular.identity;

				var currTask = $q.when(state);
				var error = [];
				
				angular.forEach(fnQueue, function(task) {
					if (task.type === 'then') {
						currTask = currTask.then(function(state) {
							if (state !== 'FAILED') {
								task.fn(state);
							}
							return state;
						});
					} else {
						currTask = currTask
							.then(function(state) {
								if (state !== 'FAILED') {
									return task.fn(state);
								}
								return state;
							})
							.catch(function(err) {
								error.push(err);
								return 'FAILED';
							});
					}
				});
				
				// Call user's execute function
				currTask.then(function(state) {
					if (error.length === 0) {
						fn(state);
					} else {
						errHandler(error, state);
					}
				});
				
				return this;
			};
		};

		/**
		 * Create a new state data stream.
		 */
		this.create = function create(initialState) {
			return new StateDataStream(initialState);
		}

	});
