'use strict';

angular.module('statedatastreamApp')

	.service('Api', function($http) {
		this.getRepos = function(username) {
			return $http.get('https://api.github.com/users/'+username+'/repos');
		};
		
		this.getWeather = function(city) {
			return $http.get('http://api.openweathermap.org/data/2.5/weather?q='+city);
		};

		this.listAgencies = function(query) {
			return $http.jsonp('http://govdata.se/api/lista?jsonp=JSON_CALLBACK');
		}

		this.getReposLazy = function(username) {
			return function() {
				return $http.get('https://api.github.com/users/'+username+'/repos');
			}
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
		}
	})

	.controller('MainCtrl', function ($scope, StateDataStream, $q, Api) {
		// Example of a state data stream. Note how more and more data is loaded
		// into the state.
		StateDataStream.create({})
			.addDataRetriever('weatherGlasgow', Api.getWeather('Glasgow'))
			.then(function(state) {
				console.log(
					'While waiting you should know that in Glasgow the ' + 
						state.weatherGlasgow.data.weather[0].description.toLowerCase()
				);
			})
			.addLazyDataRetriever('repos', Api.getReposLazy('petercrona'))
			.addDataRetrievers({
				'weatherParis': Api.getWeather('Paris'),
				'weatherLima': Api.getWeather('Lima')
			})
			.addLazyDataRetriever('swedishAgencies', Api.listAgenciesLazy())
			.addStateDataRetriever('weatherGothenburg', function(state) {
				var city = state.swedishAgencies.data[13][1].substring(0,8);
				return Api.getWeather(city);
			})
			.execute(function(state) {
				console.log(state);
			});

		
		// Another example only using lazy data retrievers
		// Note that no requests are sent until execute is called.
		var lazyDataLoader = StateDataStream.create({})
			.addLazyDataRetriever('weatherGlasgow', Api.getWeatherLazy('Glasgow'))
			.addLazyDataRetriever('repos', Api.getReposLazy('petercrona'))

		setTimeout(function() {
			lazyDataLoader.execute(function(state) {
				console.log(state);
			});
		}, 2000);

		// A pretty normal example showing the clarity which can be achieved using
		// state data streams.
		StateDataStream.create({})
			.addDataRetriever('swedishAgencies', Api.listAgencies())
			.addDataRetriever('myRepos', Api.getRepos('petercrona'))
			.execute(function(state) {
				console.log(state);
			});
	});
