'use strict';

angular.module('statedatastreamApp')
	.controller('MainCtrl', function ($scope, StateDataStream, $q) {
		// For simulation
		var dummyP = $q.defer();
		var dummyP2 = $q.defer();
		var dummyP3 = $q.defer();

		// Example StateDataStream showing
		// how one can define what to do and in
		// what order.
		var getData = StateDataStream.create({})
			.then(function(state) {
				console.log(1);
				console.log(JSON.stringify(state));
			})
			.addDataRetriever('test1', dummyP.promise)
			.then(function(state) {
				console.log(2);
				console.log(JSON.stringify(state));
			})
			.addDataRetriever('test2', dummyP2.promise)
			.then(function(state) {
				console.log(3);
				console.log(JSON.stringify(state));
			})
			.addAsyncDataRetrievers({
				'test3': dummyP3.promise, 
				'test4': dummyP.promise
			})
			.then(function(state) {
				console.log(4);
				console.log(JSON.stringify(state));
			})
			.addDataRetriever('test5', dummyP2.promise);

		// Execute the defined StateDataStream and
		// run a callback.
		getData.execute(function(state) {
			console.log(5);
			console.log(JSON.stringify(state));
		});

		// ========= Simulation code
		setTimeout(function() {
			dummyP.resolve('foo1');
		}, 2000);
		setTimeout(function() {
			dummyP2.resolve('foo2');
		}, 100);
		setTimeout(function() {
			dummyP3.resolve('foo3');
		}, 5000);
	});
