'use strict';

angular.module('statedatastreamApp')

	.controller('MainCtrl', function ($scope, Sds, Api, Helper) {
		Sds.init()
		
			// Write stuff to stream
			.write('repos.peter', Api.getRepos('petercrona'))
			.write('repos.bambu', Api.getRepos('bumbu'))
			.write('repos.ariutta', Api.getRepos('ariutta'))
			.write('snapshotOfState[]', Helper.stateCopyFn)
			.write('repos.freescale', Api.getRepos('Freescale'))
			.write('snapshotOfState[]', Helper.stateCopyFn)

			// Attach handlers to stream
			.error(function(err, state) {
				console.log('error', err, state);
			})
			.execute(function(state) {
				console.log('state', state);
			});
	})

	// Dummy API with some open APIs found on the Internet.
	.service('Api', function($http) {
		this.getRepos = function(username) {
			return $http.get('https://api.github.com/users/'+username+'/repos');
		};
		
		this.getWeather = function(city) {
			return $http.get('http://api.openweathermap.org/data/2.5/weather?q='+city);
		};

		this.listAgencies = function() {
			return $http.jsonp('http://govdata.se/api/lista?jsonp=JSON_CALLBACK');
		};

		this.getReposLazy = function(username) {
			return function() {
				return $http.get('https://api.github.com/users/'+username+'/repos');
			};
		};
		
		this.getWeatherLazy = function(city) {
			return function() {
				return $http.get('http://api.openweathermap.org/data/2.5/weather?q='+city);
			};
		};

		this.listAgenciesLazy = function() {
			return function() {
				return $http.jsonp('http://govdata.se/api/lista?jsonp=JSON_CALLBACK');
			};
		};
	})

	.service('Helper', function() {
		this.stateCopyFn = function stateCopyFn(state) {
			return JSON.parse(JSON.stringify(state));
		};
	});
