'use strict';

angular.module('StateDataStream', [])
    .service('StateDataStream', function($q) {

		var StateDataStream = function(state) {

			var fnQueue = [];

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

			this.addAsyncDataRetrievers = function addDataRetrievers(retrievers) {
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

			this.execute = function execute(fn) {
				fn = fn || angular.identity;

				var currTask = $q.when(state);
				angular.forEach(fnQueue, function(task) {
					if (task.type === 'then') {
						currTask = currTask.then(function(state) {
							task.fn(state);
							return state;
						});
					} else {
						currTask = currTask.then(task.fn);
					}
				});

				currTask.then(function(state) {
					fn(state);
				});
			};
			
		}

		this.create = function create(initialState) {
			return new StateDataStream(initialState);
		}

	});
