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
			.error(function(err) {
				console.log('FAILED');
			})
			.execute(function(state) {
				console.log(state);
			});

		
		/* ================================================
		 * ================================================
		 */

		
		// Another example only using lazy data retrievers
		// Note that no requests are sent until execute is called.
		var lazyDataLoader = StateDataStream.create({})
			.addLazyDataRetriever('weatherGlasgow', Api.getWeatherLazy('Glasgow'))
			.addLazyDataRetriever('repos', Api.getReposLazy('petercrona'))
			.addLazyDataRetriever('weatherGlasgow', Api.getWeatherLazy('Glasgow'))
			.error(function(err) {
				console.log(err);
				console.log('FAILED 2');
			});

		setTimeout(function() {
			lazyDataLoader.execute(function(state) {
				console.log(state);
			});
		}, 2000);


		/* ================================================
		 * ================================================
		 */		


		// A pretty normal example showing the clarity which can be achieved using
		// state data streams.
		var loadWeather = StateDataStream.create({})
			.addDataRetriever('gothenburgWeather', Api.getWeather('Göteborg'))
			.addDataRetriever('glasgowWeather', Api.getWeather('Glasgow'))
			.error(function(err, state) {
				console.log('Fail');
			});
		
		// Will execute the loadWeather stream.
		loadWeather.execute(function(state) {
			console.log('Success');
			console.log(state);
		});
		
		// Will not send new requests.
		// If we would have used addLazyDataRetriever new requests
		// would have been sent and the state would reflect the latest
		// state at the time of the request.
		loadWeather.execute(function(state) {
			console.log('Execute again');
			console.log(state);
		});


		/* ================================================
		 * ================================================
		 */


		// Get weather using lazy data retrievers.
		var loadWeatherLazy = StateDataStream.create({})
			.addLazyDataRetriever('repos', Api.getReposLazy('petercrona'))
			.addLazyDataRetriever('gothenburgWeather', Api.getWeatherLazy('Göteborg'))
			.addLazyDataRetriever('glasgowWeather', Api.getWeatherLazy('Glasgow'))
			.error(function(err, state) {
				console.log('Fail');
			});
		
		// Will execute the loadWeatherLazy stream.
		loadWeatherLazy.execute(function(state) {
			console.log('Success');
			console.log(state);
		});
		
		// Will send new requests, i.e. we might get newer data than
		// in the first request.
		loadWeatherLazy.execute(function(state) {
			console.log('Execute again');
			console.log(state);
		});

	});
