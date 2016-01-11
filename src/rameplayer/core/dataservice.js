/**
 * Rameplayer WebUI
 * Copyright (C) 2015
 *
 * See LICENSE.
 */

/**
 * Data Service
 * @namespace Factories
 */
(function() {
    'use strict';

    angular
        .module('rameplayer.core')
        .factory('dataService', dataService);

    dataService.$inject = ['$log', '$http', '$resource', '$location', 'simulationDataService', 'listProvider', 'ListIds'];

    /**
     * @namespace DataService
     * @desc Application wide service for REST API
     * @memberof Factories
     */
    function dataService($log, $http, $resource, $location, simulationDataService, listProvider, ListIds) {

        if (rameServerConfig.simulation) {
            // replace this with simulationDataService
            return simulationDataService;
        }

        var baseUrl = getBaseUrl();
        var Settings = $resource(baseUrl + 'settings');
        var SystemSettings = $resource(baseUrl+ 'settings/system/');
        var List = listProvider.getResource(baseUrl + 'lists/:targetId');
        var listItemUrl = baseUrl + 'lists/:targetId/items/:itemId';
        var ListItem = $resource(listItemUrl, {
            targetId: '',
            itemId: ''
        }, {
            update: { method: 'PUT' }
        });

        var service = {
            getSettings: getSettings,
            getStatus: getStatus,
            setCursor: setCursor,
            getList: getList,
            addToPlaylist: addToPlaylist,
            addStreamToPlaylist: addStreamToPlaylist,
            removeFromPlaylist: removeFromPlaylist,
            movePlaylistItem: movePlaylistItem,
            createPlaylist: createPlaylist,
            removePlaylist: removePlaylist,
            play: play,
            pause: pause,
            stop: stop,
            seek: seek,
            stepBackward: stepBackward,
            stepForward: stepForward,
            getRameVersioning: getRameVersioning,
            getSystemSettings: getSystemSettings
        };

        return service;

        /**
         * @name getBaseUrl
         * @desc Returns base URL for REST API calls. Optionally you can pass
         * hostname, port and basePath as parameters.
         * @returns string
         */
        function getBaseUrl(hostname, port, basePath) {
            hostname = hostname || rameServerConfig.host;
            port = port || rameServerConfig.port;
            basePath = basePath || rameServerConfig.basePath || '/';
            var url = '';
            if (hostname || port) {
                // $location is not yet available here
                url = location.protocol + '//';
                url += hostname || location.host;
                if (port) {
                    url += ':' + port;
                }
            }
            url += basePath;
            return url;
        }

        /**
         * @name getSettings
         * @desc Returns instance object of Settings $resource. You can save
         * settings by calling returned object.$save();
         * @returns object
         */
        function getSettings() {
            return Settings.get();
        }

        /**
         * @name getSystemSettings
         * @desc Returns instance object of SystemSettings $resource. You can save
         * settings by calling returned object.$save();
         * @returns object
         */
        function getSystemSettings() {
            return SystemSettings.get();
        }

        function getStatus(payload) {
            return $http.post(baseUrl + 'status', payload);
        }

        function setCursor(itemId) {
            return $http.put(baseUrl + 'cursor', { id: itemId });
        }

        function getList(id) {
            return List.get({ targetId: id });
        }

        function addToPlaylist(targetId, item) {
            var newItem = new ListItem({
                id: item.id
            });
            return newItem.$save({
                targetId: targetId,
                itemId: ''
            });
        }

        function addStreamToPlaylist(targetId, item) {
            var newItem = new ListItem({
                info: {
                    title: item.title,
                    uri: item.uri
                }
            });
            return newItem.$save({
                targetId: targetId,
                itemId: ''
            });
        }

        function removeFromPlaylist(targetId, mediaItem) {
            return ListItem.delete({ targetId: targetId, itemId: mediaItem.id });
        }

        function movePlaylistItem(targetId, item, oldIndex, newIndex) {
            return ListItem.update({
                // url variables
                targetId: targetId,
                itemId: item.id,
            }, {
                // payload
                oldIndex: oldIndex,
                newIndex: newIndex
            });
        }

        function createPlaylist(playlist) {
            var newPlaylist = new List(playlist);
            return newPlaylist.$save({
                targetId: ''
            });
        }

        function removePlaylist(targetId) {
            return List.delete({ targetId: targetId });
        }

        function play() {
            return $http.get(baseUrl + 'player/play');
        }

        function pause() {
            return $http.get(baseUrl + 'player/pause');
        }

        function stop() {
            return $http.get(baseUrl + 'player/stop');
        }

        function seek(position) {
            return $http.get(baseUrl + 'player/seek/' + position);
        }

        function stepBackward() {
            return $http.get(baseUrl + 'player/step-backward');
        }

        function stepForward() {
            return $http.get(baseUrl + 'player/step-forward');
        }

        function getRameVersioning() {
            return $http.get(baseUrl + 'version');
        }
    }
})();
