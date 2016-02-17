(function() {
    'use strict';

    angular
        .module('rameplayer.core')
        // minimum server version, used in dataServiceProvider checkVersion()
        .constant('minServerVersion', '0.5.0')
        .constant('ItemTypes', {
            DEVICE: 'device',
            DIRECTORY: 'directory',
            SINGLE: 'regular',
            PLAYLIST: 'playlist'
        })
        .constant('ListIds', {
            ROOT: 'root',
            DEFAULT_PLAYLIST: 'default'
        })
        .constant('serverConfig', rameServerConfig); // jshint ignore:line
})();
